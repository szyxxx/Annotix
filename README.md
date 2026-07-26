# Annotix

Open-source, web-based image annotation for building YOLO datasets — in the
spirit of Roboflow and Label Studio, self-hosted and free.

- **Bounding boxes & polygon segmentation** in a fast, keyboard-driven editor
- **Auto-labeling** with a baseline YOLO11 model (boxes *and* masks) — one keypress pre-labels an image
- **Team collaboration** — live presence, per-image activity, instant updates over WebSocket
- **Project & dataset management** — uploads, train/val/test splits, statuses, search
- **Export** to YOLO (v5 → v11 → YOLO26, detect & segment) and COCO JSON

## Architecture

| Directory | What it is |
|-----------|------------|
| `frontend/` | React 19 + Vite + Tailwind v4 UI |
| `server/` | Rust (Axum + SQLite) — API, WebSocket hub, file storage, export. One static binary; serves the built frontend too |
| `ml/` | Python (FastAPI + ultralytics) auto-label sidecar — optional; everything else works without it |

Data lives on disk in `data/` (SQLite + uploaded images). No external services.
See [docs/PLAN.md](docs/PLAN.md) for the full design.

## Run it

Prerequisites: Rust, Node 20+, and (for auto-labeling) [uv](https://docs.astral.sh/uv/).

```sh
# 1. build the frontend once
cd frontend && npm install && npm run build

# 2. run the server — serves UI + API at http://localhost:8000
cd ../server && cargo run

# 3. (optional) auto-label sidecar — first prediction downloads model weights
cd ../ml && uv sync && uv run uvicorn main:app --port 8100
```

Open http://localhost:8000, claim a display name, create a project, upload
images, annotate. Teammates on your network do the same URL and you see each
other live.

### Development

```sh
cd server && cargo run          # API on :8000
cd frontend && npm run dev      # Vite dev server on :5173, proxies /api, /files, /ws
```

Config via env vars: `ANNOTIX_PORT` (8000), `ANNOTIX_DATA_DIR` (`data`),
`ANNOTIX_ML_URL` (`http://localhost:8100`).

## Editor shortcuts

`B` box · `P` polygon · `V` select · `H` pan · `1–9` pick class · `A` auto-label ·
`Del` delete · `←`/`→` prev/next image (auto-saves) · `Ctrl+S` save ·
scroll to zoom · space-drag to pan · `Enter`/double-click closes a polygon

## Status & roadmap

MVP — the core loop (upload → annotate → auto-label → export → train) is
complete and tested. Deliberate ceilings and what's next (dataset versioning,
training jobs, review workflow, real auth, S3, active learning) are tracked in
[docs/PLAN.md](docs/PLAN.md).

## License

Apache-2.0
