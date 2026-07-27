use crate::api::{insert_label, list_annotations_rows, list_labels_rows, AppError};
use crate::db::{new_id, now_ms};
use crate::App;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use rusqlite::params;
use serde::Deserialize;
use serde_json::json;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct AutolabelRequest {
    #[serde(default)]
    pub user_id: Option<String>,
    #[serde(default = "default_conf")]
    pub conf: f64,
}

fn default_conf() -> f64 {
    0.3
}

#[derive(Deserialize)]
struct Prediction {
    class_name: String,
    #[allow(dead_code)]
    confidence: f64,
    kind: String,
    points: Vec<f64>,
}

#[derive(Deserialize)]
struct PredictResponse {
    predictions: Vec<Prediction>,
}

/// Auto-label one image: query the ML sidecar, then replace this image's
/// previous auto-annotations with the new predictions.
///
/// Class policy — if the project has classes, auto-label is locked to them:
/// the class list is sent to the model (open-vocabulary prompt) and anything
/// else is dropped. With zero classes it bootstraps: every prediction is kept
/// and its class is created on the fly.
async fn autolabel_one(
    app: &Arc<App>,
    image_id: &str,
    user_id: Option<&str>,
    conf: f64,
) -> Result<usize, AppError> {
    let (project_id, disk_name, task_type, class_names) = {
        let db = app.db.lock().unwrap();
        let (project_id, disk_name): (String, String) = db.query_row(
            "SELECT project_id, disk_name FROM images WHERE id = ?1",
            params![image_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        let task_type: String = db.query_row(
            "SELECT task_type FROM projects WHERE id = ?1",
            params![project_id],
            |r| r.get(0),
        )?;
        let names: Vec<String> = list_labels_rows(&db, &project_id)?
            .into_iter()
            .map(|l| l.name)
            .collect();
        (project_id, disk_name, task_type, names)
    };

    // std::path::absolute, not canonicalize: the latter yields \\?\-prefixed
    // paths on Windows, which image loaders in the ML sidecar can't open.
    let image_path =
        std::path::absolute(app.data_dir.join("uploads").join(&project_id).join(&disk_name))
            .map_err(|e| anyhow::anyhow!(e))?;
    let ml_url = format!("{}/predict", app.ml_url);
    let task = task_type.clone();
    let classes = class_names.clone();

    let predictions = tokio::task::spawn_blocking(move || -> Result<PredictResponse, AppError> {
        ureq::post(&ml_url)
            .timeout(std::time::Duration::from_secs(300))
            .send_json(json!({
                "image_path": image_path.to_string_lossy(),
                "task": task,
                "conf": conf,
                "classes": classes,
            }))
            .map_err(|e| match e {
                ureq::Error::Transport(_) => AppError(
                    StatusCode::SERVICE_UNAVAILABLE,
                    "Auto-label service is not running. Start it with: cd ml && uv run uvicorn main:app --port 8100".into(),
                ),
                ureq::Error::Status(code, resp) => AppError(
                    StatusCode::from_u16(code).unwrap_or(StatusCode::BAD_GATEWAY),
                    resp.into_string().unwrap_or_else(|_| "ml service error".into()),
                ),
            })?
            .into_json::<PredictResponse>()
            .map_err(|e| AppError(StatusCode::BAD_GATEWAY, e.to_string()))
    })
    .await
    .map_err(|e| anyhow::anyhow!(e))??
    .predictions;

    let added = {
        let db = app.db.lock().unwrap();
        let mut labels = list_labels_rows(&db, &project_id)?;
        let locked = !labels.is_empty();

        // Re-running replaces earlier auto-annotations, never human ones.
        db.execute(
            "DELETE FROM annotations WHERE image_id = ?1 AND (created_by = 'auto' OR created_by LIKE '%:auto')",
            params![image_id],
        )?;

        let now = now_ms();
        let mut added = 0usize;
        for pred in &predictions {
            let valid = match pred.kind.as_str() {
                "bbox" => pred.points.len() == 4,
                "polygon" => pred.points.len() >= 6 && pred.points.len() % 2 == 0,
                _ => false,
            };
            if !valid {
                continue;
            }
            let existing = labels
                .iter()
                .find(|l| l.name.eq_ignore_ascii_case(&pred.class_name));
            let label_id = match existing {
                Some(l) => l.id.clone(),
                None if locked => continue, // outside the project's class list
                None => {
                    let label = insert_label(&db, &project_id, &pred.class_name, None)?;
                    let id = label.id.clone();
                    labels.push(label);
                    id
                }
            };
            db.execute(
                "INSERT INTO annotations (id, image_id, label_id, kind, points, created_by, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    new_id(),
                    image_id,
                    label_id,
                    pred.kind,
                    serde_json::to_string(&pred.points).unwrap(),
                    user_id.map(|u| format!("{u}:auto")).unwrap_or_else(|| "auto".into()),
                    now
                ],
            )?;
            added += 1;
        }

        let remaining: i64 = db.query_row(
            "SELECT COUNT(*) FROM annotations WHERE image_id = ?1",
            params![image_id],
            |r| r.get(0),
        )?;
        let status = if added > 0 {
            "review"
        } else if remaining == 0 {
            "unannotated"
        } else {
            "annotated"
        };
        db.execute(
            "UPDATE images SET status = ?1 WHERE id = ?2 AND status != 'annotated'",
            params![status, image_id],
        )?;
        added
    };

    Ok(added)
}

pub async fn autolabel_image(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
    Json(body): Json<AutolabelRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let added = autolabel_one(&app, &id, body.user_id.as_deref(), body.conf).await?;

    let (project_id, labels, annotations) = {
        let db = app.db.lock().unwrap();
        let project_id: String =
            db.query_row("SELECT project_id FROM images WHERE id = ?1", params![id], |r| r.get(0))?;
        let labels = list_labels_rows(&db, &project_id)?;
        let annotations = list_annotations_rows(&db, &id)?;
        (project_id, labels, annotations)
    };
    app.hub.broadcast(
        &project_id,
        &json!({ "type": "annotations_saved", "image_id": id, "by": body.user_id }),
    );
    Ok(Json(json!({ "annotations": annotations, "labels": labels, "added": added })))
}

/// Auto-label every image that a human hasn't finished ('unannotated' and
/// 'review'); runs as a background job, progress goes out over the project's
/// WebSocket channel.
pub async fn autolabel_project(
    State(app): State<Arc<App>>,
    Path(project_id): Path<String>,
    Json(body): Json<AutolabelRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    {
        let mut jobs = app.autolabel_jobs.lock().unwrap();
        if !jobs.insert(project_id.clone()) {
            return Err(AppError(
                StatusCode::CONFLICT,
                "Auto-label is already running for this project".into(),
            ));
        }
    }

    let ids: Vec<String> = {
        let db = app.db.lock().unwrap();
        let mut stmt = db
            .prepare(
                "SELECT id FROM images WHERE project_id = ?1 AND status IN ('unannotated','review') ORDER BY created_at",
            )
            .map_err(AppError::from)?;
        let ids = stmt
            .query_map(params![project_id], |r| r.get(0))
            .map_err(AppError::from)?
            .collect::<rusqlite::Result<Vec<String>>>()
            .map_err(AppError::from)?;
        ids
    };
    let total = ids.len();
    if total == 0 {
        app.autolabel_jobs.lock().unwrap().remove(&project_id);
        return Ok(Json(json!({ "queued": 0 })));
    }

    let app2 = app.clone();
    let pid = project_id.clone();
    let user = body.user_id.clone();
    let conf = body.conf;
    tokio::spawn(async move {
        let mut labeled = 0usize;
        for (i, id) in ids.iter().enumerate() {
            match autolabel_one(&app2, id, user.as_deref(), conf).await {
                Ok(added) => {
                    if added > 0 {
                        labeled += 1;
                    }
                }
                Err(e) => {
                    app2.hub
                        .broadcast(&pid, &json!({ "type": "autolabel_error", "message": e.1 }));
                    break;
                }
            }
            app2.hub.broadcast(
                &pid,
                &json!({ "type": "autolabel_progress", "done": i + 1, "total": total }),
            );
        }
        app2.hub.broadcast(
            &pid,
            &json!({ "type": "autolabel_done", "labeled": labeled, "total": total }),
        );
        app2.autolabel_jobs.lock().unwrap().remove(&pid);
    });

    Ok(Json(json!({ "queued": total })))
}
