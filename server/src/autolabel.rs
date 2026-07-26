use crate::api::{bad_request, insert_label, list_annotations_rows, list_labels_rows, AppError};
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
    confidence: f64,
    kind: String,
    points: Vec<f64>,
}

#[derive(Deserialize)]
struct PredictResponse {
    predictions: Vec<Prediction>,
}

pub async fn autolabel_image(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
    Json(body): Json<AutolabelRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let (project_id, disk_name, task_type) = {
        let db = app.db.lock().unwrap();
        let (project_id, disk_name): (String, String) = db.query_row(
            "SELECT project_id, disk_name FROM images WHERE id = ?1",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        let task_type: String = db.query_row(
            "SELECT task_type FROM projects WHERE id = ?1",
            params![project_id],
            |r| r.get(0),
        )?;
        (project_id, disk_name, task_type)
    };

    let image_path = app
        .data_dir
        .join("uploads")
        .join(&project_id)
        .join(&disk_name)
        .canonicalize()
        .map_err(|e| anyhow::anyhow!(e))?;
    let ml_url = format!("{}/predict", app.ml_url);
    let conf = body.conf;
    let task = task_type.clone();

    let predictions = tokio::task::spawn_blocking(move || -> Result<PredictResponse, AppError> {
        ureq::post(&ml_url)
            .timeout(std::time::Duration::from_secs(120))
            .send_json(json!({
                "image_path": image_path.to_string_lossy(),
                "task": task,
                "conf": conf,
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

    let (labels, annotations, added) = {
        let db = app.db.lock().unwrap();
        let mut labels = list_labels_rows(&db, &project_id)?;
        let now = now_ms();
        let mut added = 0;
        for pred in &predictions {
            let valid = match pred.kind.as_str() {
                "bbox" => pred.points.len() == 4,
                "polygon" => pred.points.len() >= 6 && pred.points.len() % 2 == 0,
                _ => false,
            };
            if !valid {
                continue;
            }
            let label_id = match labels
                .iter()
                .find(|l| l.name.eq_ignore_ascii_case(&pred.class_name))
            {
                Some(l) => l.id.clone(),
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
                    id,
                    label_id,
                    pred.kind,
                    serde_json::to_string(&pred.points).unwrap(),
                    body.user_id.as_deref().map(|u| format!("{u}:auto")).or(Some("auto".into())),
                    now
                ],
            )?;
            added += 1;
            let _ = pred.confidence; // reported by ml, not persisted yet
        }
        if added > 0 {
            db.execute("UPDATE images SET status = 'review' WHERE id = ?1", params![id])?;
        }
        (labels, list_annotations_rows(&db, &id)?, added)
    };

    if added > 0 {
        app.hub.broadcast(
            &project_id,
            &json!({ "type": "annotations_saved", "image_id": id, "by": body.user_id }),
        );
    }
    if predictions.is_empty() && added == 0 {
        // Model found nothing — still a valid outcome, not an error.
    } else if added == 0 {
        return Err(bad_request("model returned no usable predictions"));
    }
    Ok(Json(json!({ "annotations": annotations, "labels": labels, "added": added })))
}
