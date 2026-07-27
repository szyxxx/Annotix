"""Annotix ML sidecar — auto-labeling inference over HTTP.

Two modes, picked per request:
- classes given  → open-vocabulary YOLOE prompted with exactly those class
  names, so predictions are locked to the project's label list
  (first use downloads the text encoder, ~570 MB, cached afterwards)
- no classes     → baseline YOLO11 (COCO-80) to bootstrap a fresh project

Run:  uv run uvicorn main:app --port 8100
"""
import threading

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="annotix-ml")

BASELINES = {"detect": "yolo11n.pt", "segment": "yolo11n-seg.pt"}
OPEN_VOCAB = "yoloe-11s-seg.pt"  # detects and segments, so it serves both tasks

_models: dict = {}
_open_classes: tuple = ()
_lock = threading.Lock()  # set_classes mutates the model; serialize inference


class PredictRequest(BaseModel):
    image_path: str
    task: str = "detect"  # "detect" | "segment"
    conf: float = 0.3
    classes: list[str] = []


def get_baseline(task: str):
    from ultralytics import YOLO

    key = f"baseline-{task}"
    if key not in _models:
        _models[key] = YOLO(BASELINES[task])
    return _models[key]


def get_open_model(classes: tuple):
    global _open_classes
    from ultralytics import YOLOE

    if "open" not in _models:
        _models["open"] = YOLOE(OPEN_VOCAB)
    model = _models["open"]
    if _open_classes != classes:
        names = list(classes)
        model.set_classes(names, model.get_text_pe(names))
        _open_classes = classes
    return model


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict")
def predict(req: PredictRequest):
    if req.task not in BASELINES:
        raise HTTPException(400, f"unknown task {req.task!r}")
    classes = tuple(c.strip() for c in req.classes if c.strip())

    with _lock:
        if classes:
            try:
                model = get_open_model(classes)
            except Exception as err:
                # Open-vocab model unavailable (missing CLIP dep, offline).
                # The COCO baseline can still serve classes it knows; anything
                # else would silently return nothing, so fail loudly instead.
                baseline = get_baseline(req.task)
                known = {str(n).lower() for n in baseline.names.values()}
                if not any(c.lower() in known for c in classes):
                    raise HTTPException(
                        503,
                        "Open-vocabulary model unavailable "
                        f"({type(err).__name__}: {err}) and none of the project "
                        "classes exist in the COCO baseline. Rebuild the ml image "
                        "(docker compose --profile ml build) or run: "
                        "pip install git+https://github.com/ultralytics/CLIP.git",
                    )
                model = baseline
        else:
            model = get_baseline(req.task)
        try:
            result = model(req.image_path, conf=req.conf, verbose=False)[0]
        except FileNotFoundError:
            raise HTTPException(404, f"image not found: {req.image_path}")

    preds = []
    boxes = result.boxes
    masks = result.masks if req.task == "segment" else None
    for i in range(len(boxes)):
        cls_id = int(boxes.cls[i])
        entry = {
            "class_name": result.names[cls_id],
            "confidence": float(boxes.conf[i]),
        }
        if masks is not None and i < len(masks.xy) and len(masks.xy[i]) >= 3:
            entry["kind"] = "polygon"
            entry["points"] = [float(v) for pt in masks.xy[i] for v in pt]
        else:
            x1, y1, x2, y2 = (float(v) for v in boxes.xyxy[i])
            entry["kind"] = "bbox"
            entry["points"] = [x1, y1, x2 - x1, y2 - y1]
        preds.append(entry)

    return {"predictions": preds}
