mod api;
mod autolabel;
mod db;
mod export;
mod ws;

use axum::extract::DefaultBodyLimit;
use axum::routing::{get, post};
use axum::Router;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tower_http::cors::CorsLayer;
use tower_http::services::{ServeDir, ServeFile};

pub struct App {
    // ponytail: single Mutex<Connection> — SQLite is single-writer anyway; add a pool if reads ever contend.
    pub db: Mutex<Connection>,
    pub hub: ws::Hub,
    pub data_dir: PathBuf,
    pub ml_url: String,
}

fn env_or(key: &str, default: &str) -> String {
    std::env::var(key).unwrap_or_else(|_| default.into())
}

#[tokio::main]
async fn main() {
    let data_dir = PathBuf::from(env_or("ANNOTIX_DATA_DIR", "data"));
    std::fs::create_dir_all(data_dir.join("uploads")).expect("create data dir");

    let app = Arc::new(App {
        db: Mutex::new(db::open(data_dir.join("annotix.db").to_str().unwrap())),
        hub: ws::Hub::default(),
        data_dir: data_dir.clone(),
        ml_url: env_or("ANNOTIX_ML_URL", "http://localhost:8100"),
    });

    // Built frontend, when present (production). In dev, Vite serves the UI and proxies here.
    let dist = ["frontend/dist", "../frontend/dist"]
        .iter()
        .map(PathBuf::from)
        .find(|p| p.join("index.html").exists());

    let mut router = Router::new()
        .route("/api/users", post(api::create_user))
        .route("/api/projects", get(api::list_projects).post(api::create_project))
        .route(
            "/api/projects/{id}",
            get(api::get_project).patch(api::patch_project).delete(api::delete_project),
        )
        .route("/api/projects/{id}/labels", get(api::list_labels).post(api::create_label))
        .route("/api/labels/{id}", axum::routing::patch(api::patch_label).delete(api::delete_label))
        .route("/api/projects/{id}/images", get(api::list_images).post(api::upload_images))
        .route(
            "/api/images/{id}",
            get(api::get_image).patch(api::patch_image).delete(api::delete_image),
        )
        .route(
            "/api/images/{id}/annotations",
            get(api::get_annotations).put(api::put_annotations),
        )
        .route("/api/images/{id}/autolabel", post(autolabel::autolabel_image))
        .route("/api/projects/{id}/export", get(export::export_project))
        .route("/ws/projects/{id}", get(ws::ws_handler))
        .nest_service("/files", ServeDir::new(data_dir.join("uploads")))
        .layer(DefaultBodyLimit::max(1024 * 1024 * 1024))
        .layer(CorsLayer::permissive())
        .with_state(app);

    if let Some(dist) = dist {
        let index = ServeFile::new(dist.join("index.html"));
        router = router.fallback_service(ServeDir::new(&dist).fallback(index));
    }

    let port = env_or("ANNOTIX_PORT", "8000");
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    println!("annotix server listening on http://localhost:{port}");
    axum::serve(listener, router).await.unwrap();
}
