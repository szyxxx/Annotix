use crate::api::{bad_request, AppError};
use crate::db::{new_id, now_ms};
use crate::App;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Json;
use axum::response::{IntoResponse, Response};
use rusqlite::{params, Row};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;

type ApiResult<T> = Result<T, AppError>;

#[derive(Serialize)]
pub struct ModelVersion {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub run_path: String,
    pub weights_path: String,
    pub confusion_matrix_path: Option<String>,
    pub val_batch_path: Option<String>,
    pub map50: Option<f64>,
    pub map50_95: Option<f64>,
    pub created_at: i64,
}

fn model_from_row(row: &Row) -> rusqlite::Result<ModelVersion> {
    Ok(ModelVersion {
        id: row.get(0)?,
        project_id: row.get(1)?,
        name: row.get(2)?,
        run_path: row.get(3)?,
        weights_path: row.get(4)?,
        confusion_matrix_path: row.get(5)?,
        val_batch_path: row.get(6)?,
        map50: row.get(7)?,
        map50_95: row.get(8)?,
        created_at: row.get(9)?,
    })
}

pub async fn list_models(
    State(app): State<Arc<App>>,
    Path(project_id): Path<String>,
) -> ApiResult<Json<Vec<ModelVersion>>> {
    let db = app.db.lock().unwrap();
    let mut stmt = db.prepare("
        SELECT id, project_id, name, run_path, weights_path, confusion_matrix_path, val_batch_path, map50, map50_95, created_at
        FROM model_versions
        WHERE project_id = ?1
        ORDER BY created_at DESC
    ")?;
    
    let models = stmt
        .query_map(params![project_id], model_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(Json(models))
}

#[derive(Deserialize)]
pub struct TrainRequest {
    pub epochs: i64,
    pub batch_size: i64,
    pub imgsz: i64,
    pub patience: i64,
    pub target_deployment: String,
    pub yolo_version: String,
    
    // Optimization
    pub optimizer: String,
    pub lr0: f64,
    pub lrf: f64,
    pub momentum: f64,
    pub weight_decay: f64,
    pub warmup_epochs: f64,
    pub warmup_momentum: f64,
    pub warmup_bias_lr: f64,
    #[serde(rename = "box")]
    pub box_loss_weight: f64,
    pub cls: f64,
    pub dfl: f64,
    
    // Augmentations (Color)
    pub hsv_h: f64,
    pub hsv_s: f64,
    pub hsv_v: f64,
    pub bgr: f64,
    
    // Augmentations (Spatial)
    pub degrees: f64,
    pub translate: f64,
    pub scale: f64,
    pub shear: f64,
    pub perspective: f64,
    pub flipud: f64,
    pub fliplr: f64,
    
    // Augmentations (Composition)
    pub mosaic: f64,
    pub mixup: f64,
    pub copy_paste: f64,
    pub erasing: f64,
    pub crop_fraction: f64,
}

#[derive(Serialize)]
pub struct TrainingJob {
    pub id: String,
    pub project_id: String,
    pub status: String,
    pub current_epoch: i64,
    pub max_epochs: i64,
    pub metrics_json: String,
}

pub async fn start_training(
    State(app): State<Arc<App>>,
    Path(project_id): Path<String>,
    Json(body): Json<TrainRequest>,
) -> ApiResult<Json<TrainingJob>> {
    let job_id = new_id();
    let now = now_ms();
    
    {
        let db = app.db.lock().unwrap();
        db.execute(
            "INSERT INTO training_jobs (id, project_id, status, current_epoch, max_epochs, metrics_json, created_at, updated_at)
             VALUES (?1, ?2, 'running', 0, ?3, '{}', ?4, ?4)",
            params![job_id, project_id, body.epochs, now],
        )?;
    }
    
    let ml_url = std::env::var("ANNOTIX_ML_URL").unwrap_or_else(|_| "http://127.0.0.1:8100".to_string());
    
    let req_body = json!({
        "job_id": job_id,
        "project_id": project_id,
        "epochs": body.epochs,
        "batch_size": body.batch_size,
        "imgsz": body.imgsz,
        "patience": body.patience,
        "target_deployment": body.target_deployment,
        "yolo_version": body.yolo_version,
        "optimizer": body.optimizer,
        "lr0": body.lr0,
        "lrf": body.lrf,
        "momentum": body.momentum,
        "weight_decay": body.weight_decay,
        "warmup_epochs": body.warmup_epochs,
        "warmup_momentum": body.warmup_momentum,
        "warmup_bias_lr": body.warmup_bias_lr,
        "box": body.box_loss_weight,
        "cls": body.cls,
        "dfl": body.dfl,
        "hsv_h": body.hsv_h,
        "hsv_s": body.hsv_s,
        "hsv_v": body.hsv_v,
        "bgr": body.bgr,
        "degrees": body.degrees,
        "translate": body.translate,
        "scale": body.scale,
        "shear": body.shear,
        "perspective": body.perspective,
        "flipud": body.flipud,
        "fliplr": body.fliplr,
        "mosaic": body.mosaic,
        "mixup": body.mixup,
        "copy_paste": body.copy_paste,
        "erasing": body.erasing,
        "crop_fraction": body.crop_fraction,
    });
    
    tokio::task::spawn_blocking(move || {
        let _ = ureq::post(&format!("{}/train", ml_url)).send_json(req_body);
    });
    
    Ok(Json(TrainingJob {
        id: job_id,
        project_id,
        status: "running".into(),
        current_epoch: 0,
        max_epochs: body.epochs,
        metrics_json: "{}".into()
    }))
}

#[derive(Deserialize)]
pub struct ProgressWebhook {
    pub current_epoch: i64,
    pub metrics_json: String,
    pub status: String, // running, completed, failed
    
    // Only sent when completed
    pub name: Option<String>,
    pub run_path: Option<String>,
    pub weights_path: Option<String>,
    pub confusion_matrix_path: Option<String>,
    pub val_batch_path: Option<String>,
    pub map50: Option<f64>,
    pub map50_95: Option<f64>,
}

pub async fn job_progress(
    State(app): State<Arc<App>>,
    Path(job_id): Path<String>,
    Json(body): Json<ProgressWebhook>,
) -> ApiResult<StatusCode> {
    let project_id: String = {
        let db = app.db.lock().unwrap();
        
        let project_id: String = db.query_row(
            "SELECT project_id FROM training_jobs WHERE id = ?1",
            params![job_id],
            |r| r.get(0),
        )?;
        
        db.execute(
            "UPDATE training_jobs SET current_epoch = ?1, metrics_json = ?2, status = ?3, updated_at = ?4 WHERE id = ?5",
            params![body.current_epoch, body.metrics_json, body.status, now_ms(), job_id],
        )?;
        
        if body.status == "completed" {
            if let (Some(run_path), Some(weights_path), Some(name)) = (&body.run_path, &body.weights_path, &body.name) {
                db.execute(
                    "INSERT INTO model_versions (id, project_id, name, run_path, weights_path, confusion_matrix_path, val_batch_path, map50, map50_95, created_at)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                    params![
                        new_id(), project_id, name, run_path, weights_path,
                        body.confusion_matrix_path, body.val_batch_path,
                        body.map50, body.map50_95, now_ms()
                    ],
                )?;
            }
        }
        
        project_id
    };
    
    app.hub.broadcast(&project_id, &json!({
        "type": "training_progress",
        "job_id": job_id,
        "current_epoch": body.current_epoch,
        "status": body.status,
        "metrics": serde_json::from_str::<serde_json::Value>(&body.metrics_json).unwrap_or(json!({}))
    }));

    Ok(StatusCode::OK)
}
