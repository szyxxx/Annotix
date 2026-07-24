from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseDetector(ABC):
    def __init__(self, model_path: str = None):
        self.model_path = model_path
        self.load_model()

    @abstractmethod
    def load_model(self):
        """Load the model into memory"""
        pass

    @abstractmethod
    def detect(self, image_path: str, classes: List[str] = None) -> tuple[List[Dict[str, Any]], int, int]:
        """
        Detect objects in image.
        Returns (annotations, img_height, img_width)
        annotations format:
        {
            "class_id": int,
            "label": str,
            "confidence": float,
            "bbox_xywhn": [x, y, w, h],
            "bbox_xyxy": [x1, y1, x2, y2]
        }
        """
        pass
