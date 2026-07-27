"""Annotix ML sidecar — auto-labeling inference over HTTP.

Two modes, picked per request:
- classes given  → open-vocabulary YOLOE prompted with exactly those class
  names, so predictions are locked to the project's label list
  (first use downloads the text encoder, ~570 MB, cached afterwards)
- no classes     → baseline YOLO11 (COCO-80) to bootstrap a fresh project

Run:  uv run uvicorn main:app --port 8100
"""
import threading
import os
import tempfile
import requests
import zipfile
import json
import shutil
from pathlib import Path

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel

app = FastAPI(title="annotix-ml")
ANNOTIX_SERVER_URL = os.getenv("ANNOTIX_SERVER_URL", "http://127.0.0.1:8000")

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

class TrainRequest(BaseModel):
    job_id: str
    project_id: str
    # Basic
    epochs: int
    batch_size: int = 16
    imgsz: int = 640
    patience: int = 50
    target_deployment: str = "nano" # nano, small, medium, large, xlarge
    yolo_version: str = "yolo11" # yolo11, yolov10, yolov9, yolov8, yolov5
    
    # Optimization
    optimizer: str = "auto"
    lr0: float = 0.01
    lrf: float = 0.01
    momentum: float = 0.937
    weight_decay: float = 0.0005
    warmup_epochs: float = 3.0
    warmup_momentum: float = 0.8
    warmup_bias_lr: float = 0.1
    box: float = 7.5
    cls: float = 0.5
    dfl: float = 1.5
    
    # Augmentations (Color)
    hsv_h: float = 0.015
    hsv_s: float = 0.7
    hsv_v: float = 0.4
    bgr: float = 0.0
    
    # Augmentations (Spatial)
    degrees: float = 0.0
    translate: float = 0.1
    scale: float = 0.5
    shear: float = 0.0
    perspective: float = 0.0
    flipud: float = 0.0
    fliplr: float = 0.5
    
    # Augmentations (Composition)
    mosaic: float = 1.0
    mixup: float = 0.0
    copy_paste: float = 0.0
    erasing: float = 0.4
    crop_fraction: float = 1.0


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


def run_training(req: TrainRequest):
    import ultralytics
    from ultralytics import YOLO
    
    # 1. Download Dataset ZIP from Rust server
    export_url = f"{ANNOTIX_SERVER_URL}/api/projects/{req.project_id}/export"
    resp = requests.get(export_url)
    if resp.status_code != 200:
        requests.post(f"{ANNOTIX_SERVER_URL}/api/internal/jobs/{req.job_id}/progress", json={
            "current_epoch": 0, "metrics_json": "{}", "status": "failed"
        })
        return
        
    dataset_dir = Path("/data") if os.path.exists("/data") else Path("data")
    job_dir = dataset_dir / "runs" / "train" / req.job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    
    zip_path = job_dir / "dataset.zip"
    with open(zip_path, "wb") as f:
        f.write(resp.content)
        
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(job_dir / "dataset")
        
    yaml_path = job_dir / "dataset" / "data.yaml"
    with open(yaml_path, "r") as f:
        yaml_content = f.read()
    yaml_content = yaml_content.replace("path: .", f"path: {yaml_path.parent.absolute()}")
    with open(yaml_path, "w") as f:
        f.write(yaml_content)
    
    # 2. Select model scale
    scale_map = {
        "nano": "n",
        "small": "s",
        "medium": "m",
        "large": "l",
        "xlarge": "x"
    }
    scale = scale_map.get(req.target_deployment, "n")
    model_name = f"{req.yolo_version}{scale}.pt"
        
    model = YOLO(model_name)
    
    # 3. Setup Callbacks
    def on_fit_epoch_end(trainer):
        metrics = {k.strip(): float(v) for k, v in trainer.metrics.items()}
        
        # Add max epochs
        metrics["max_epochs"] = req.epochs
        
        # Extract training losses (Ultralytics stores them in tloss or loss_items)
        if hasattr(trainer, 'tloss'):
            tloss = trainer.tloss.tolist() if hasattr(trainer.tloss, 'tolist') else trainer.tloss
            if len(tloss) >= 3:
                metrics["train/box_loss"] = float(tloss[0])
                metrics["train/cls_loss"] = float(tloss[1])
        elif hasattr(trainer, 'loss_items'):
            loss_items = trainer.loss_items
            if len(loss_items) >= 3:
                metrics["train/box_loss"] = float(loss_items[0])
                metrics["train/cls_loss"] = float(loss_items[1])
                
        # Format a log string mimicking terminal output
        box_loss = metrics.get('train/box_loss', 0.0)
        cls_loss = metrics.get('train/cls_loss', 0.0)
        map50 = metrics.get('metrics/mAP50(B)', 0.0)
        map50_95 = metrics.get('metrics/mAP50-95(B)', 0.0)
        
        log_line1 = f"Epoch {trainer.epoch + 1}/{req.epochs}  box_loss: {box_loss:.4f}  cls_loss: {cls_loss:.4f}"
        log_line2 = f"mAP50: {map50:.4f}  mAP50-95: {map50_95:.4f}"
        metrics["latest_log"] = f"{log_line1}\n{log_line2}"

        epoch = trainer.epoch
        payload = {
            "current_epoch": epoch + 1,
            "metrics_json": json.dumps(metrics),
            "status": "running"
        }
        try:
            requests.post(f"{ANNOTIX_SERVER_URL}/api/internal/jobs/{req.job_id}/progress", json=payload)
        except Exception:
            pass
            
    model.add_callback("on_fit_epoch_end", on_fit_epoch_end)
    
    # 4. Train
    try:
        results = model.train(
            data=str(yaml_path),
            project=str(job_dir),
            name="run",
            epochs=req.epochs,
            batch=req.batch_size,
            imgsz=req.imgsz,
            patience=req.patience,
            optimizer=req.optimizer,
            lr0=req.lr0,
            lrf=req.lrf,
            momentum=req.momentum,
            weight_decay=req.weight_decay,
            warmup_epochs=req.warmup_epochs,
            warmup_momentum=req.warmup_momentum,
            warmup_bias_lr=req.warmup_bias_lr,
            box=req.box,
            cls=req.cls,
            dfl=req.dfl,
            hsv_h=req.hsv_h,
            hsv_s=req.hsv_s,
            hsv_v=req.hsv_v,
            bgr=req.bgr,
            degrees=req.degrees,
            translate=req.translate,
            scale=req.scale,
            shear=req.shear,
            perspective=req.perspective,
            flipud=req.flipud,
            fliplr=req.fliplr,
            mosaic=req.mosaic,
            mixup=req.mixup,
            copy_paste=req.copy_paste,
            erasing=req.erasing,
            crop_fraction=req.crop_fraction,
        )
        
        # 5. Report completion
        run_path = job_dir / "run"
        weights_path = run_path / "weights" / "best.pt"
        conf_matrix = run_path / "confusion_matrix.png"
        val_batch = run_path / "val_batch0_pred.jpg"
        
        payload = {
            "current_epoch": req.epochs,
            "metrics_json": json.dumps({k: float(v) for k, v in results.results_dict.items()}),
            "status": "completed",
            "name": f"YOLO11 ({req.target_deployment})",
            "run_path": str(run_path),
            "weights_path": str(weights_path) if weights_path.exists() else None,
            "confusion_matrix_path": str(conf_matrix) if conf_matrix.exists() else None,
            "val_batch_path": str(val_batch) if val_batch.exists() else None,
            "map50": float(results.box.map50) if hasattr(results, 'box') else None,
            "map50_95": float(results.box.map) if hasattr(results, 'box') else None,
        }
        requests.post(f"{ANNOTIX_SERVER_URL}/api/internal/jobs/{req.job_id}/progress", json=payload)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        requests.post(f"{ANNOTIX_SERVER_URL}/api/internal/jobs/{req.job_id}/progress", json={
            "current_epoch": 0, "metrics_json": json.dumps({"error": str(e)}), "status": "failed"
        })

@app.post("/train")
def train(req: TrainRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_training, req)
    return {"ok": True}
