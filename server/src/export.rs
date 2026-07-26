use crate::api::AppError;
use crate::App;
use axum::extract::{Path, Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use rusqlite::params;
use serde::Deserialize;
use serde_json::json;
use std::fmt::Write as _;
use std::io::Write as _;
use std::sync::Arc;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

const SPLITS: [&str; 3] = ["train", "val", "test"];

struct ExportImage {
    disk_name: String,
    width: f64,
    height: f64,
    split: String,
    /// (class index, kind, points)
    annotations: Vec<(usize, String, Vec<f64>)>,
}

struct ExportData {
    project_name: String,
    task_type: String,
    label_names: Vec<String>,
    images: Vec<ExportImage>,
}

#[derive(Deserialize)]
pub struct ExportParams {
    #[serde(default = "default_format")]
    pub format: String,
}

fn default_format() -> String {
    "yolo".into()
}

pub async fn export_project(
    State(app): State<Arc<App>>,
    Path(project_id): Path<String>,
    Query(params): Query<ExportParams>,
) -> Result<Response, AppError> {
    let format = params.format.clone();
    if !["yolo", "coco"].contains(&format.as_str()) {
        return Err(crate::api::bad_request("format must be yolo|coco"));
    }

    let data = {
        let db = app.db.lock().unwrap();
        let (project_name, task_type): (String, String) = db.query_row(
            "SELECT name, task_type FROM projects WHERE id = ?1",
            params![project_id],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )?;
        let labels = crate::api::list_labels_rows(&db, &project_id)?;
        let class_index: std::collections::HashMap<String, usize> =
            labels.iter().enumerate().map(|(i, l)| (l.id.clone(), i)).collect();

        let mut stmt = db.prepare(
            "SELECT id, disk_name, width, height, split FROM images WHERE project_id = ?1",
        )?;
        let rows = stmt
            .query_map(params![project_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, i64>(2)?,
                    r.get::<_, i64>(3)?,
                    r.get::<_, String>(4)?,
                ))
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?;

        let mut images = Vec::new();
        for (image_id, disk_name, width, height, split) in rows {
            let anns = crate::api::list_annotations_rows(&db, &image_id)?
                .into_iter()
                .filter_map(|a| {
                    class_index.get(&a.label_id).map(|&ci| (ci, a.kind, a.points))
                })
                .collect();
            images.push(ExportImage {
                disk_name,
                width: width as f64,
                height: height as f64,
                split,
                annotations: anns,
            });
        }
        ExportData {
            project_name,
            task_type,
            label_names: labels.into_iter().map(|l| l.name).collect(),
            images,
        }
    };

    let uploads_dir = app.data_dir.join("uploads").join(&project_id);
    let slug: String = data
        .project_name
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '-' })
        .collect();
    let filename = format!("{slug}-{format}.zip");

    let bytes = tokio::task::spawn_blocking(move || build_zip(&data, &uploads_dir, &format))
        .await
        .map_err(|e| anyhow::anyhow!(e))?
        .map_err(AppError::from)?;

    Ok((
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "application/zip".to_string()),
            (header::CONTENT_DISPOSITION, format!("attachment; filename=\"{filename}\"")),
        ],
        bytes,
    )
        .into_response())
}

// ponytail: zip built in memory — fine for MVP-sized datasets, stream to a temp file when exports exceed RAM.
fn build_zip(data: &ExportData, uploads_dir: &std::path::Path, format: &str) -> anyhow::Result<Vec<u8>> {
    let mut zip = ZipWriter::new(std::io::Cursor::new(Vec::new()));
    let deflate = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    let stored = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);

    if format == "yolo" {
        let mut yaml = String::from("path: .\ntrain: images/train\nval: images/val\ntest: images/test\n");
        let _ = writeln!(yaml, "nc: {}", data.label_names.len());
        yaml.push_str("names:\n");
        for (i, name) in data.label_names.iter().enumerate() {
            let _ = writeln!(yaml, "  {i}: {name}");
        }
        zip.start_file("data.yaml", deflate)?;
        zip.write_all(yaml.as_bytes())?;

        for img in &data.images {
            let img_bytes = std::fs::read(uploads_dir.join(&img.disk_name))?;
            zip.start_file(format!("images/{}/{}", img.split, img.disk_name), stored)?;
            zip.write_all(&img_bytes)?;

            let stem = img.disk_name.rsplit_once('.').map(|(s, _)| s).unwrap_or(&img.disk_name);
            let mut txt = String::new();
            for (class, kind, points) in &img.annotations {
                txt.push_str(&yolo_line(&data.task_type, *class, kind, points, img.width, img.height));
            }
            zip.start_file(format!("labels/{}/{stem}.txt", img.split), deflate)?;
            zip.write_all(txt.as_bytes())?;
        }
    } else {
        // COCO — Roboflow-style: one _annotations.coco.json per split, images alongside.
        for split in SPLITS {
            let split_images: Vec<&ExportImage> =
                data.images.iter().filter(|i| i.split == split).collect();
            if split_images.is_empty() {
                continue;
            }
            let categories: Vec<_> = data
                .label_names
                .iter()
                .enumerate()
                .map(|(i, n)| json!({ "id": i, "name": n, "supercategory": "none" }))
                .collect();
            let mut coco_images = Vec::new();
            let mut coco_anns = Vec::new();
            let mut ann_id = 0u64;
            for (img_id, img) in split_images.iter().enumerate() {
                let img_bytes = std::fs::read(uploads_dir.join(&img.disk_name))?;
                zip.start_file(format!("{split}/{}", img.disk_name), stored)?;
                zip.write_all(&img_bytes)?;
                coco_images.push(json!({
                    "id": img_id, "file_name": img.disk_name,
                    "width": img.width, "height": img.height,
                }));
                for (class, kind, points) in &img.annotations {
                    let (x, y, w, h) = if kind == "bbox" {
                        (points[0], points[1], points[2], points[3])
                    } else {
                        poly_bbox(points)
                    };
                    let segmentation = if kind == "polygon" {
                        json!([points])
                    } else {
                        json!([[x, y, x + w, y, x + w, y + h, x, y + h]])
                    };
                    coco_anns.push(json!({
                        "id": ann_id, "image_id": img_id, "category_id": class,
                        "bbox": [x, y, w, h], "area": w * h,
                        "segmentation": segmentation, "iscrowd": 0,
                    }));
                    ann_id += 1;
                }
            }
            let doc = json!({
                "info": { "description": data.project_name },
                "images": coco_images, "annotations": coco_anns, "categories": categories,
            });
            zip.start_file(format!("{split}/_annotations.coco.json"), deflate)?;
            zip.write_all(serde_json::to_string_pretty(&doc)?.as_bytes())?;
        }
    }

    Ok(zip.finish()?.into_inner())
}

/// One YOLO txt line. Detect: `cls cx cy w h`; segment: `cls x1 y1 x2 y2 …` —
/// all normalized to [0,1]. Same format from YOLOv5 through YOLO11/YOLO26.
fn yolo_line(task: &str, class: usize, kind: &str, points: &[f64], img_w: f64, img_h: f64) -> String {
    let clamp = |v: f64| v.clamp(0.0, 1.0);
    let mut line = format!("{class}");
    if task == "segment" {
        let poly: Vec<f64> = if kind == "polygon" {
            points.to_vec()
        } else {
            let (x, y, w, h) = (points[0], points[1], points[2], points[3]);
            vec![x, y, x + w, y, x + w, y + h, x, y + h]
        };
        for pair in poly.chunks(2) {
            let _ = write!(line, " {:.6} {:.6}", clamp(pair[0] / img_w), clamp(pair[1] / img_h));
        }
    } else {
        let (x, y, w, h) = if kind == "bbox" {
            (points[0], points[1], points[2], points[3])
        } else {
            poly_bbox(points)
        };
        let _ = write!(
            line,
            " {:.6} {:.6} {:.6} {:.6}",
            clamp((x + w / 2.0) / img_w),
            clamp((y + h / 2.0) / img_h),
            clamp(w / img_w),
            clamp(h / img_h)
        );
    }
    line.push('\n');
    line
}

/// Axis-aligned bounding rect of a flat [x1,y1,x2,y2,…] polygon.
fn poly_bbox(points: &[f64]) -> (f64, f64, f64, f64) {
    let (mut min_x, mut min_y) = (f64::MAX, f64::MAX);
    let (mut max_x, mut max_y) = (f64::MIN, f64::MIN);
    for pair in points.chunks(2) {
        min_x = min_x.min(pair[0]);
        max_x = max_x.max(pair[0]);
        min_y = min_y.min(pair[1]);
        max_y = max_y.max(pair[1]);
    }
    (min_x, min_y, max_x - min_x, max_y - min_y)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detect_bbox_line_is_normalized_center_format() {
        let line = yolo_line("detect", 2, "bbox", &[100.0, 50.0, 200.0, 100.0], 400.0, 200.0);
        assert_eq!(line, "2 0.500000 0.500000 0.500000 0.500000\n");
    }

    #[test]
    fn detect_polygon_falls_back_to_bounding_rect() {
        let line = yolo_line("detect", 0, "polygon", &[0.0, 0.0, 100.0, 0.0, 100.0, 100.0], 100.0, 100.0);
        assert_eq!(line, "0 0.500000 0.500000 1.000000 1.000000\n");
    }

    #[test]
    fn segment_bbox_becomes_four_corner_polygon() {
        let line = yolo_line("segment", 1, "bbox", &[0.0, 0.0, 50.0, 50.0], 100.0, 100.0);
        assert_eq!(
            line,
            "1 0.000000 0.000000 0.500000 0.000000 0.500000 0.500000 0.000000 0.500000\n"
        );
    }

    #[test]
    fn coordinates_clamp_to_unit_range() {
        let line = yolo_line("detect", 0, "bbox", &[-10.0, -10.0, 200.0, 200.0], 100.0, 100.0);
        assert!(!line.split_whitespace().skip(1).any(|v| {
            let f: f64 = v.parse().unwrap();
            !(0.0..=1.0).contains(&f)
        }));
    }

    #[test]
    fn poly_bbox_covers_extent() {
        assert_eq!(poly_bbox(&[10.0, 20.0, 30.0, 5.0, 20.0, 40.0]), (10.0, 5.0, 20.0, 35.0));
    }
}
