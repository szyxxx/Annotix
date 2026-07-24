import os
from typing import List, Dict, Any
from .registry import DetectorRegistry
from .cache import SQLiteCache

class AnnotixEngine:
    def __init__(self):
        self.cache = SQLiteCache()
        # Ensure models directory exists
        self.models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
        os.makedirs(self.models_dir, exist_ok=True)

    def process(self, image_path: str, classes: List[str]) -> Dict[str, Any]:
        # 1. Check Cache
        cached = self.cache.get_cache(image_path, classes)
        if cached:
            cached["status"] = "success"
            cached["message"] = "Loaded from cache"
            return cached

        annotations = []
        img_h, img_w = 0, 0
        
        # 2. Adaptive Pipeline
        # Step A: YOLO Inference (Fastest)
        yolo_path = os.path.join(self.models_dir, "yolo", "yolov8n.onnx")
        try:
            yolo_detector = DetectorRegistry.get_instance("yolo", yolo_path)
            anns, h, w = yolo_detector.detect(image_path, classes)
            img_h, img_w = h, w
            annotations.extend(anns)
        except Exception as e:
            print(f"YOLO pipeline skipped or failed: {e}")

        # Evaluate Confidence & Missing Classes
        detected_classes = [a["label"].lower() for a in annotations if a["confidence"] >= 0.7]
        missing_classes = [c for c in classes if c.lower() not in detected_classes]

        # Step B: Zero-Shot Fallback
        if missing_classes:
            try:
                # E.g. GroundingDINO or Florence2
                zero_shot_detector = DetectorRegistry.get_instance("groundingdino")
                anns, h, w = zero_shot_detector.detect(image_path, missing_classes)
                if img_h == 0:
                    img_h, img_w = h, w
                annotations.extend(anns)
            except Exception as e:
                print(f"Zero-shot pipeline skipped or failed: {e}")

        # Step C: Confidence Fusion
        # (Mock implementation: If multiple bounding boxes overlap > 80% IoU and same class, keep highest conf)
        # For now we just return the gathered annotations
        
        # Save to Cache
        if img_h > 0:
            self.cache.set_cache(image_path, classes, annotations, img_h, img_w)

        return {
            "status": "success",
            "annotations": annotations,
            "image_size": [img_h, img_w],
            "message": "Processed by AI Pipeline"
        }
