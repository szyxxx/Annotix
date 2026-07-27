use rusqlite::Connection;
use std::time::{SystemTime, UNIX_EPOCH};

pub const SCHEMA: &str = "
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    task_type TEXT NOT NULL DEFAULT 'detect' CHECK (task_type IN ('detect','segment')),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    idx INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS images (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    disk_name TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    size_bytes INTEGER NOT NULL,
    split TEXT NOT NULL DEFAULT 'train' CHECK (split IN ('train','val','test')),
    status TEXT NOT NULL DEFAULT 'unannotated' CHECK (status IN ('unannotated','annotated','review')),
    created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY,
    image_id TEXT NOT NULL REFERENCES images(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('bbox','polygon')),
    points TEXT NOT NULL,
    created_by TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_images_project ON images(project_id);
CREATE INDEX IF NOT EXISTS idx_annotations_image ON annotations(image_id);
CREATE INDEX IF NOT EXISTS idx_labels_project ON labels(project_id);

CREATE TABLE IF NOT EXISTS training_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'stopped')),
    current_epoch INTEGER NOT NULL DEFAULT 0,
    max_epochs INTEGER NOT NULL,
    metrics_json TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS model_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    run_path TEXT NOT NULL,
    weights_path TEXT NOT NULL,
    confusion_matrix_path TEXT,
    val_batch_path TEXT,
    map50 REAL,
    map50_95 REAL,
    created_at INTEGER NOT NULL
);
";

pub fn open(path: &str) -> Connection {
    let conn = Connection::open(path).expect("open sqlite db");
    conn.pragma_update(None, "journal_mode", "WAL").unwrap();
    conn.pragma_update(None, "foreign_keys", "ON").unwrap();
    conn.execute_batch(SCHEMA).expect("apply schema");
    conn
}

pub fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_millis() as i64
}

pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Stripe-adjacent categorical palette; label colors cycle through it.
pub const PALETTE: [&str; 10] = [
    "#635bff", "#00c48c", "#ff5996", "#ffb020", "#0ea5e9",
    "#8b5cf6", "#f97316", "#14b8a6", "#e11d48", "#84cc16",
];

pub fn palette_color(i: usize) -> &'static str {
    PALETTE[i % PALETTE.len()]
}
