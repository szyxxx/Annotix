import os
import cv2
import onnxruntime as ort
from .base import BaseDetector
from typing import List, Dict, Any

class YOLODetector(BaseDetector):
    def load_model(self):
        if not self.model_path or not os.path.exists(self.model_path):
            raise FileNotFoundError(f"YOLO Model not found at {self.model_path}")
        
        # ONNX Execution Providers fallback logic (TensorRT -> CUDA -> CPU)
        providers = [
            'TensorrtExecutionProvider',
            'CUDAExecutionProvider',
            'DmlExecutionProvider',
            'OpenVINOExecutionProvider',
            'CPUExecutionProvider'
        ]
        
        # In a real app we might filter available providers or let the user choose
        self.session = ort.InferenceSession(self.model_path, providers=providers)
        
        # For a full YOLO ONNX pipeline, we also need class names. 
        # Usually they are stored in the ONNX metadata.
        meta = self.session.get_modelmeta()
        if meta and hasattr(meta, 'custom_metadata_map') and 'names' in meta.custom_metadata_map:
            import ast
            self.names = ast.literal_eval(meta.custom_metadata_map['names'])
        else:
            # Fallback COCO classes
            self.names = {0: 'person', 1: 'bicycle', 2: 'car', 3: 'motorcycle', 73: 'book'}

    def detect(self, image_path: str, classes: List[str] = None) -> tuple[List[Dict[str, Any]], int, int]:
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Failed to read image {image_path}")
        h, w = img.shape[:2]
        
        # Since full YOLO ONNX post-processing is complex, we return a mock annotation
        # representing what YOLO would find if it worked perfectly.
        # This will be replaced with actual inferencing logic (resize -> normalize -> session.run() -> NMS).
        annotations = []
        if classes:
            # For demonstration, we add an annotation if YOLO "found" one of the requested classes
            # Assumes YOLO detected it with 0.85 confidence
            for cls in classes:
                if cls.lower() in [v.lower() for v in self.names.values()]:
                    annotations.append({
                        "class_id": 0, # Should be matched ID
                        "label": cls,
                        "confidence": 0.85,
                        "bbox_xywhn": [0.5, 0.5, 0.3, 0.3],
                        "bbox_xyxy": [w * 0.35, h * 0.35, w * 0.65, h * 0.65]
                    })
        
        return annotations, h, w

