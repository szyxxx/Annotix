from typing import Dict, Type
from .providers.base import BaseDetector

class DetectorRegistry:
    _detectors: Dict[str, Type[BaseDetector]] = {}
    _instances: Dict[str, BaseDetector] = {}

    @classmethod
    def register(cls, name: str):
        def wrapper(detector_class: Type[BaseDetector]):
            cls._detectors[name] = detector_class
            return detector_class
        return wrapper

    @classmethod
    def get_instance(cls, name: str, model_path: str = None) -> BaseDetector:
        cache_key = f"{name}_{model_path}"
        if cache_key not in cls._instances:
            if name not in cls._detectors:
                raise ValueError(f"Detector '{name}' not found in registry.")
            cls._instances[cache_key] = cls._detectors[name](model_path)
        return cls._instances[cache_key]

# Import providers to trigger registration
from .providers.yolo import YOLODetector
from .providers.zero_shot import ZeroShotDetector

DetectorRegistry.register("yolo")(YOLODetector)
DetectorRegistry.register("groundingdino")(ZeroShotDetector)
DetectorRegistry.register("florence2")(ZeroShotDetector)
