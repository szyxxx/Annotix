# Annotix Formal Specification (SPEC)

## 1. Canvas Constraints
- The UI Canvas **must** support rendering 100,000 images seamlessly via virtualized scrolling.
- Bounding Box and Polygon dragging **must** maintain 60 FPS on average hardware without layout thrashing.
- `Undo` and `Redo` history operations **must** resolve in O(1) time complexity.

## 2. Format Compliance
- All internal metadata **must** use the Annotix Native Format (ANF).
- ANF modifications **must** be atomic.

## 3. Worker Limitations
- The Python AI Runtime (`annotix-engine`) **must** load models into memory only once.
- Sub-sequent inference requests **must** bypass model initialization and return bounding box telemetry in < 100ms.
- Communication between Rust and Python **must** be non-blocking.

## 4. Cache Predictability
- Cached inference responses **must** compute their cache key as `SHA256(image + model_version + class_list + threshold)`.
