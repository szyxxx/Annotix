"""Annotix ML sidecar — baseline YOLO11 inference for auto-labeling.

Run:  uv run uvicorn main:app --port 8100
First prediction downloads the model weights (~6 MB) automatically.
"""
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="annotix-ml")

MODELS = {"detect": "yolo11n.pt", "segment": "yolo11n-seg.pt"}


class PredictRequest(BaseModel):
    image_path: str
    task: str = "detect"  # "detect" | "segment"
    conf: float = 0.3


@lru_cache(maxsize=2)
def get_model(task: str):
    from ultralytics import YOLO

    return YOLO(MODELS[task])


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/predict")
def predict(req: PredictRequest):
    if req.task not in MODELS:
        raise HTTPException(400, f"unknown task {req.task!r}")
    try:
        model = get_model(req.task)
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
