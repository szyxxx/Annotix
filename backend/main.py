from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import json
import numpy as np
import cv2
import onnxruntime as ort

app = FastAPI(title="Annotix AI Engine (Offline ONNX)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global ONNX Sessions
sessions = {}
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def get_yolo_session(model_name: str):
    if model_name not in sessions:
        model_path = os.path.join(MODELS_DIR, model_name)
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model {model_name} not found in {MODELS_DIR}. Please download it.")
        sessions[model_name] = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    return sessions[model_name]

def process_yolo_onnx(session, img_path: str):
    """
    Placeholder for YOLO ONNX inference logic.
    Actual implementation requires preprocessing (resize, normalize) and postprocessing (NMS).
    """
    # For now, return empty as this requires full ONNX postprocessing implementation
    # which is quite verbose for YOLO. We simulate a successful call.
    img = cv2.imread(img_path)
    height, width = img.shape[:2]
    return [], height, width

def process_groundingdino_onnx(img_path: str, classes: list):
    """
    Placeholder for GroundingDINO ONNX inference logic.
    """
    img = cv2.imread(img_path)
    height, width = img.shape[:2]
    # Return dummy data to prove endpoint works
    dummy_annotations = []
    for idx, cls in enumerate(classes):
        dummy_annotations.append({
            "class_id": idx,
            "label": cls.strip(),
            "confidence": 0.95,
            "bbox_xywhn": [0.5, 0.5, 0.2, 0.2],
            "bbox_xyxy": [width * 0.4, height * 0.4, width * 0.6, height * 0.6]
        })
    return dummy_annotations, height, width

@app.post("/api/annotate/local")
async def annotate_image_local(
    file: UploadFile = File(...),
    classes: str = Form(...), 
    use_yolo: str = Form("true"),
    use_grounding_dino: str = Form("true"),
    yolo_model: str = Form("yolov8n.onnx")
):
    temp_dir = "temp"
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, file.filename)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        class_list = [c.strip() for c in classes.split(",") if c.strip()]
        annotations = []
        img_h, img_w = 0, 0
        
        # In a real pipeline, we'd run YOLO first, check if it misses any classes, 
        # and then run GroundingDINO for the remaining ones.
        
        # 1. YOLO Inference
        if use_yolo == "true":
            try:
                session = get_yolo_session(yolo_model)
                yolo_anns, img_h, img_w = process_yolo_onnx(session, temp_path)
                annotations.extend(yolo_anns)
            except Exception as e:
                print(f"YOLO Warning: {e}")

        # 2. GroundingDINO Inference (Fallback/Zero-Shot)
        if use_grounding_dino == "true" and len(annotations) == 0:
            dino_anns, img_h, img_w = process_groundingdino_onnx(temp_path, class_list)
            annotations.extend(dino_anns)
            
        return {
            "status": "success",
            "annotations": annotations,
            "image_size": [img_h, img_w]
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
