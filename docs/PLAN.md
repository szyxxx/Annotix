# Annotix — Web Overhaul Plan

Open-source, web-based image annotation platform (Roboflow / Label Studio class)
for building YOLO datasets — bounding boxes and polygon segmentation, team
collaboration, and baseline-model auto-labeling.

## Stack

| Layer | Tech | Why |
|-------|------|-----|
| `frontend/` | React 19 + Vite + TypeScript + Tailwind v4 + zustand | fast, minimal, already-familiar stack |
| `server/` | Rust — Axum + rusqlite (SQLite) | single static binary, serves API + WebSocket + files + built frontend |
| `ml/` | Python — FastAPI + ultralytics | baseline YOLO11 det/seg models for auto-labeling; optional sidecar |
| storage | local disk `data/` (SQLite db + uploads) | zero-infra self-hosting; S3 etc. later |

One deployable (the Rust server) + one optional ML sidecar on `:8100`.

## Data model (SQLite)

- `users` — id, name, color. Lightweight identity (no passwords yet); id kept client-side.
- `projects` — id, name, description, task_type (`detect` | `segment`), timestamps.
- `labels` — id, project_id, name, color, idx (ordering = YOLO class index).
- `images` — id, project_id, filename, width, height, size, split (`train`/`val`/`test`), status (`unannotated`/`annotated`/`review`).
- `annotations` — id, image_id, label_id, kind (`bbox` | `polygon`), points (JSON, pixel coords), created_by.
  - bbox points: `[x, y, w, h]`; polygon points: `[x1, y1, x2, y2, …]`.

## API surface

- `POST /api/users` — claim a display name.
- CRUD `/api/projects`, nested `/api/projects/:id/labels`.
- `POST /api/projects/:id/images` — multipart multi-upload; dims read server-side.
- `GET /api/projects/:id/images?split=&status=&q=` ; `PATCH`/`DELETE /api/images/:id`.
- `GET /api/images/:id/annotations` ; `PUT` (replace-all save).
- `POST /api/images/:id/autolabel` — proxies to ML sidecar, auto-creates missing
  labels by predicted class name, saves annotations with status `review`.
- `GET /api/projects/:id/export?format=yolo|coco` — zip stream:
  - YOLO: `images/{split}/`, `labels/{split}/*.txt` normalized + `data.yaml`
    (same txt format across YOLOv5→v11→YOLO26); detect exports polygons as
    bounding rects, segment exports bboxes as 4-point polygons.
  - COCO: Roboflow-style `{split}/_annotations.coco.json`.
- `GET /files/{project}/{file}` — uploaded images.
- `GET /ws/projects/:id` — collaboration channel: presence roster, "editing
  image X", annotations-saved and images-added broadcasts.

## Frontend

- `/` — projects grid, create-project modal, first-run display-name claim.
- `/p/:id` — dashboard tabs: Images (upload dropzone, filterable grid), Classes,
  Export, Settings. Live presence avatars.
- `/p/:id/annotate/:imageId` — editor: SVG canvas with zoom/pan, bbox + polygon
  tools, class picker, annotation list, keyboard shortcuts, Auto-label button,
  prev/next flow.

Look & feel: Apple × Stripe — near-white surfaces on `#f5f5f7`, Stripe indigo
`#635bff` accent, system font stack, tight-tracked large headings, 12px radii,
hairline borders, soft shadows, 150ms transitions.

## Deliberate MVP ceilings (ponytail)

- Identity without passwords — fine for LAN/self-host teams; real auth (OIDC) later.
- `Mutex<Connection>` SQLite access — single-writer is plenty at MVP scale; pool later.
- No thumbnails — browser scales originals; add server-side thumbs when grids feel slow.
- Replace-all annotation save per image — no operational-transform merging; last save wins, WS broadcast keeps peers fresh.
- Auto-label = pretrained COCO baseline — custom/finetuned model registry later.

## Later roadmap

Dataset versioning & snapshots, augmentation on export, model training jobs,
review/approve workflow with per-user assignments, real auth + orgs, S3 storage,
active-learning loop (train on approved → auto-label the rest with own model).
