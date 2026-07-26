use crate::db::{new_id, now_ms, palette_color};
use crate::App;
use axum::extract::{Multipart, Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use rusqlite::{params, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::Arc;

pub struct AppError(pub StatusCode, pub String);

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({ "error": self.1 }))).into_response()
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        match e {
            rusqlite::Error::QueryReturnedNoRows => {
                AppError(StatusCode::NOT_FOUND, "not found".into())
            }
            _ => AppError(StatusCode::INTERNAL_SERVER_ERROR, e.to_string()),
        }
    }
}

pub fn bad_request(msg: &str) -> AppError {
    AppError(StatusCode::BAD_REQUEST, msg.into())
}

type ApiResult<T> = Result<T, AppError>;

// ---------- users ----------

#[derive(Serialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[derive(Deserialize)]
pub struct CreateUser {
    pub name: String,
}

pub async fn create_user(
    State(app): State<Arc<App>>,
    Json(body): Json<CreateUser>,
) -> ApiResult<Json<User>> {
    let name = body.name.trim().to_string();
    if name.is_empty() {
        return Err(bad_request("name is required"));
    }
    let db = app.db.lock().unwrap();
    let count: i64 = db.query_row("SELECT COUNT(*) FROM users", [], |r| r.get(0))?;
    let user = User {
        id: new_id(),
        name,
        color: palette_color(count as usize).to_string(),
    };
    db.execute(
        "INSERT INTO users (id, name, color, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![user.id, user.name, user.color, now_ms()],
    )?;
    Ok(Json(user))
}

// ---------- projects ----------

#[derive(Serialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: String,
    pub task_type: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub image_count: i64,
    pub annotated_count: i64,
    pub label_count: i64,
}

fn project_from_row(row: &Row) -> rusqlite::Result<Project> {
    Ok(Project {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        task_type: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
        image_count: row.get(6)?,
        annotated_count: row.get(7)?,
        label_count: row.get(8)?,
    })
}

const PROJECT_SELECT: &str = "
SELECT p.id, p.name, p.description, p.task_type, p.created_at, p.updated_at,
  (SELECT COUNT(*) FROM images i WHERE i.project_id = p.id),
  (SELECT COUNT(*) FROM images i WHERE i.project_id = p.id AND i.status != 'unannotated'),
  (SELECT COUNT(*) FROM labels l WHERE l.project_id = p.id)
FROM projects p";

pub async fn list_projects(State(app): State<Arc<App>>) -> ApiResult<Json<Vec<Project>>> {
    let db = app.db.lock().unwrap();
    let mut stmt = db.prepare(&format!("{PROJECT_SELECT} ORDER BY p.updated_at DESC"))?;
    let projects = stmt
        .query_map([], project_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(Json(projects))
}

#[derive(Deserialize)]
pub struct CreateProject {
    pub name: String,
    #[serde(default)]
    pub description: String,
    pub task_type: String,
}

pub async fn create_project(
    State(app): State<Arc<App>>,
    Json(body): Json<CreateProject>,
) -> ApiResult<Json<Project>> {
    if body.name.trim().is_empty() {
        return Err(bad_request("name is required"));
    }
    if !["detect", "segment"].contains(&body.task_type.as_str()) {
        return Err(bad_request("task_type must be 'detect' or 'segment'"));
    }
    let id = new_id();
    let now = now_ms();
    let db = app.db.lock().unwrap();
    db.execute(
        "INSERT INTO projects (id, name, description, task_type, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
        params![id, body.name.trim(), body.description, body.task_type, now],
    )?;
    get_project_row(&db, &id).map(Json)
}

fn get_project_row(db: &Connection, id: &str) -> ApiResult<Project> {
    Ok(db.query_row(
        &format!("{PROJECT_SELECT} WHERE p.id = ?1"),
        params![id],
        project_from_row,
    )?)
}

pub async fn get_project(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
) -> ApiResult<Json<Project>> {
    let db = app.db.lock().unwrap();
    get_project_row(&db, &id).map(Json)
}

#[derive(Deserialize)]
pub struct PatchProject {
    pub name: Option<String>,
    pub description: Option<String>,
}

pub async fn patch_project(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
    Json(body): Json<PatchProject>,
) -> ApiResult<Json<Project>> {
    let db = app.db.lock().unwrap();
    if let Some(name) = &body.name {
        db.execute("UPDATE projects SET name = ?1 WHERE id = ?2", params![name.trim(), id])?;
    }
    if let Some(desc) = &body.description {
        db.execute("UPDATE projects SET description = ?1 WHERE id = ?2", params![desc, id])?;
    }
    db.execute("UPDATE projects SET updated_at = ?1 WHERE id = ?2", params![now_ms(), id])?;
    get_project_row(&db, &id).map(Json)
}

pub async fn delete_project(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
) -> ApiResult<StatusCode> {
    {
        let db = app.db.lock().unwrap();
        db.execute("DELETE FROM projects WHERE id = ?1", params![id])?;
    }
    let _ = std::fs::remove_dir_all(app.data_dir.join("uploads").join(&id));
    Ok(StatusCode::NO_CONTENT)
}

// ---------- labels ----------

#[derive(Serialize)]
pub struct Label {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub color: String,
    pub idx: i64,
}

pub fn list_labels_rows(db: &Connection, project_id: &str) -> rusqlite::Result<Vec<Label>> {
    let mut stmt = db.prepare(
        "SELECT id, project_id, name, color, idx FROM labels WHERE project_id = ?1 ORDER BY idx",
    )?;
    let labels = stmt
        .query_map(params![project_id], |r| {
            Ok(Label {
                id: r.get(0)?,
                project_id: r.get(1)?,
                name: r.get(2)?,
                color: r.get(3)?,
                idx: r.get(4)?,
            })
        })?
        .collect();
    labels
}

pub async fn list_labels(
    State(app): State<Arc<App>>,
    Path(project_id): Path<String>,
) -> ApiResult<Json<Vec<Label>>> {
    let db = app.db.lock().unwrap();
    Ok(Json(list_labels_rows(&db, &project_id)?))
}

#[derive(Deserialize)]
pub struct CreateLabel {
    pub name: String,
    pub color: Option<String>,
}

pub fn insert_label(db: &Connection, project_id: &str, name: &str, color: Option<&str>) -> ApiResult<Label> {
    let next_idx: i64 = db.query_row(
        "SELECT COALESCE(MAX(idx) + 1, 0) FROM labels WHERE project_id = ?1",
        params![project_id],
        |r| r.get(0),
    )?;
    let label = Label {
        id: new_id(),
        project_id: project_id.to_string(),
        name: name.trim().to_string(),
        color: color
            .map(str::to_string)
            .unwrap_or_else(|| palette_color(next_idx as usize).to_string()),
        idx: next_idx,
    };
    db.execute(
        "INSERT INTO labels (id, project_id, name, color, idx) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![label.id, label.project_id, label.name, label.color, label.idx],
    )?;
    Ok(label)
}

pub async fn create_label(
    State(app): State<Arc<App>>,
    Path(project_id): Path<String>,
    Json(body): Json<CreateLabel>,
) -> ApiResult<Json<Label>> {
    if body.name.trim().is_empty() {
        return Err(bad_request("name is required"));
    }
    let db = app.db.lock().unwrap();
    insert_label(&db, &project_id, &body.name, body.color.as_deref()).map(Json)
}

#[derive(Deserialize)]
pub struct PatchLabel {
    pub name: Option<String>,
    pub color: Option<String>,
}

pub async fn patch_label(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
    Json(body): Json<PatchLabel>,
) -> ApiResult<StatusCode> {
    let db = app.db.lock().unwrap();
    if let Some(name) = &body.name {
        db.execute("UPDATE labels SET name = ?1 WHERE id = ?2", params![name.trim(), id])?;
    }
    if let Some(color) = &body.color {
        db.execute("UPDATE labels SET color = ?1 WHERE id = ?2", params![color, id])?;
    }
    Ok(StatusCode::NO_CONTENT)
}

pub async fn delete_label(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
) -> ApiResult<StatusCode> {
    let db = app.db.lock().unwrap();
    db.execute("DELETE FROM labels WHERE id = ?1", params![id])?;
    Ok(StatusCode::NO_CONTENT)
}

// ---------- images ----------

#[derive(Serialize)]
pub struct Image {
    pub id: String,
    pub project_id: String,
    pub filename: String,
    pub url: String,
    pub width: i64,
    pub height: i64,
    pub size_bytes: i64,
    pub split: String,
    pub status: String,
    pub created_at: i64,
    pub annotation_count: i64,
}

fn image_from_row(row: &Row) -> rusqlite::Result<Image> {
    let project_id: String = row.get(1)?;
    let disk_name: String = row.get(3)?;
    Ok(Image {
        id: row.get(0)?,
        url: format!("/files/{project_id}/{disk_name}"),
        project_id,
        filename: row.get(2)?,
        width: row.get(4)?,
        height: row.get(5)?,
        size_bytes: row.get(6)?,
        split: row.get(7)?,
        status: row.get(8)?,
        created_at: row.get(9)?,
        annotation_count: row.get(10)?,
    })
}

const IMAGE_SELECT: &str = "
SELECT i.id, i.project_id, i.filename, i.disk_name, i.width, i.height, i.size_bytes,
       i.split, i.status, i.created_at,
       (SELECT COUNT(*) FROM annotations a WHERE a.image_id = i.id)
FROM images i";

#[derive(Deserialize)]
pub struct ImageFilters {
    pub split: Option<String>,
    pub status: Option<String>,
    pub q: Option<String>,
}

pub async fn list_images(
    State(app): State<Arc<App>>,
    Path(project_id): Path<String>,
    Query(f): Query<ImageFilters>,
) -> ApiResult<Json<Vec<Image>>> {
    let db = app.db.lock().unwrap();
    let mut sql = format!("{IMAGE_SELECT} WHERE i.project_id = ?1");
    let mut args: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(project_id)];
    if let Some(split) = &f.split {
        args.push(Box::new(split.clone()));
        sql.push_str(&format!(" AND i.split = ?{}", args.len()));
    }
    if let Some(status) = &f.status {
        args.push(Box::new(status.clone()));
        sql.push_str(&format!(" AND i.status = ?{}", args.len()));
    }
    if let Some(q) = &f.q {
        args.push(Box::new(format!("%{q}%")));
        sql.push_str(&format!(" AND i.filename LIKE ?{}", args.len()));
    }
    sql.push_str(" ORDER BY i.created_at DESC");
    let mut stmt = db.prepare(&sql)?;
    let refs: Vec<&dyn rusqlite::ToSql> = args.iter().map(|b| b.as_ref()).collect();
    let images = stmt
        .query_map(refs.as_slice(), image_from_row)?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(Json(images))
}

pub async fn get_image(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
) -> ApiResult<Json<Image>> {
    let db = app.db.lock().unwrap();
    let image = db.query_row(&format!("{IMAGE_SELECT} WHERE i.id = ?1"), params![id], image_from_row)?;
    Ok(Json(image))
}

pub async fn upload_images(
    State(app): State<Arc<App>>,
    Path(project_id): Path<String>,
    mut multipart: Multipart,
) -> ApiResult<Json<Vec<Image>>> {
    // Verify the project exists before writing anything.
    {
        let db = app.db.lock().unwrap();
        let exists: Option<i64> = db
            .query_row("SELECT 1 FROM projects WHERE id = ?1", params![project_id], |r| r.get(0))
            .optional()?;
        if exists.is_none() {
            return Err(AppError(StatusCode::NOT_FOUND, "project not found".into()));
        }
    }

    let dir = app.data_dir.join("uploads").join(&project_id);
    std::fs::create_dir_all(&dir).map_err(|e| anyhow::anyhow!(e))?;

    let mut uploaded = Vec::new();
    while let Some(field) = multipart.next_field().await.map_err(|e| bad_request(&e.to_string()))? {
        let Some(filename) = field.file_name().map(str::to_string) else { continue };
        let bytes = field.bytes().await.map_err(|e| bad_request(&e.to_string()))?;
        let Ok(dims) = imagesize::blob_size(&bytes) else { continue }; // skip non-images
        let ext = std::path::Path::new(&filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("jpg")
            .to_lowercase();
        let id = new_id();
        let disk_name = format!("{id}.{ext}");
        std::fs::write(dir.join(&disk_name), &bytes).map_err(|e| anyhow::anyhow!(e))?;

        let db = app.db.lock().unwrap();
        db.execute(
            "INSERT INTO images (id, project_id, filename, disk_name, width, height, size_bytes, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![id, project_id, filename, disk_name, dims.width as i64, dims.height as i64, bytes.len() as i64, now_ms()],
        )?;
        let image = db.query_row(&format!("{IMAGE_SELECT} WHERE i.id = ?1"), params![id], image_from_row)?;
        uploaded.push(image);
    }

    if !uploaded.is_empty() {
        app.hub.broadcast(&project_id, &json!({ "type": "images_added", "count": uploaded.len() }));
    }
    Ok(Json(uploaded))
}

#[derive(Deserialize)]
pub struct PatchImage {
    pub split: Option<String>,
    pub status: Option<String>,
}

pub async fn patch_image(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
    Json(body): Json<PatchImage>,
) -> ApiResult<Json<Image>> {
    let db = app.db.lock().unwrap();
    if let Some(split) = &body.split {
        if !["train", "val", "test"].contains(&split.as_str()) {
            return Err(bad_request("split must be train|val|test"));
        }
        db.execute("UPDATE images SET split = ?1 WHERE id = ?2", params![split, id])?;
    }
    if let Some(status) = &body.status {
        if !["unannotated", "annotated", "review"].contains(&status.as_str()) {
            return Err(bad_request("invalid status"));
        }
        db.execute("UPDATE images SET status = ?1 WHERE id = ?2", params![status, id])?;
    }
    let image = db.query_row(&format!("{IMAGE_SELECT} WHERE i.id = ?1"), params![id], image_from_row)?;
    Ok(Json(image))
}

pub async fn delete_image(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
) -> ApiResult<StatusCode> {
    let (project_id, disk_name) = {
        let db = app.db.lock().unwrap();
        let row: (String, String) = db.query_row(
            "SELECT project_id, disk_name FROM images WHERE id = ?1",
            params![id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        db.execute("DELETE FROM images WHERE id = ?1", params![id])?;
        row
    };
    let _ = std::fs::remove_file(app.data_dir.join("uploads").join(project_id).join(disk_name));
    Ok(StatusCode::NO_CONTENT)
}

// ---------- annotations ----------

#[derive(Serialize, Deserialize)]
pub struct Annotation {
    #[serde(default)]
    pub id: String,
    pub label_id: String,
    pub kind: String,
    pub points: Vec<f64>,
    #[serde(default)]
    pub created_by: Option<String>,
}

pub fn list_annotations_rows(db: &Connection, image_id: &str) -> rusqlite::Result<Vec<Annotation>> {
    let mut stmt = db.prepare(
        "SELECT id, label_id, kind, points, created_by FROM annotations WHERE image_id = ?1 ORDER BY created_at",
    )?;
    let annotations = stmt
        .query_map(params![image_id], |r| {
            let points_json: String = r.get(3)?;
            Ok(Annotation {
                id: r.get(0)?,
                label_id: r.get(1)?,
                kind: r.get(2)?,
                points: serde_json::from_str(&points_json).unwrap_or_default(),
                created_by: r.get(4)?,
            })
        })?
        .collect();
    annotations
}

pub async fn get_annotations(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
) -> ApiResult<Json<Vec<Annotation>>> {
    let db = app.db.lock().unwrap();
    Ok(Json(list_annotations_rows(&db, &id)?))
}

#[derive(Deserialize)]
pub struct SaveAnnotations {
    pub annotations: Vec<Annotation>,
    #[serde(default)]
    pub user_id: Option<String>,
}

pub async fn put_annotations(
    State(app): State<Arc<App>>,
    Path(id): Path<String>,
    Json(body): Json<SaveAnnotations>,
) -> ApiResult<Json<Vec<Annotation>>> {
    for ann in &body.annotations {
        let valid = match ann.kind.as_str() {
            "bbox" => ann.points.len() == 4,
            "polygon" => ann.points.len() >= 6 && ann.points.len() % 2 == 0,
            _ => false,
        };
        if !valid {
            return Err(bad_request("invalid annotation kind/points"));
        }
    }
    let (project_id, saved) = {
        let db = app.db.lock().unwrap();
        let project_id: String =
            db.query_row("SELECT project_id FROM images WHERE id = ?1", params![id], |r| r.get(0))?;
        db.execute("DELETE FROM annotations WHERE image_id = ?1", params![id])?;
        let now = now_ms();
        for ann in &body.annotations {
            db.execute(
                "INSERT INTO annotations (id, image_id, label_id, kind, points, created_by, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    new_id(),
                    id,
                    ann.label_id,
                    ann.kind,
                    serde_json::to_string(&ann.points).unwrap(),
                    body.user_id.as_deref().or(ann.created_by.as_deref()),
                    now
                ],
            )?;
        }
        let status = if body.annotations.is_empty() { "unannotated" } else { "annotated" };
        db.execute("UPDATE images SET status = ?1 WHERE id = ?2", params![status, id])?;
        (project_id, list_annotations_rows(&db, &id)?)
    };
    app.hub.broadcast(
        &project_id,
        &json!({ "type": "annotations_saved", "image_id": id, "by": body.user_id }),
    );
    Ok(Json(saved))
}
