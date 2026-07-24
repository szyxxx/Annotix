# Project Milestones

The Annotix project is driven by Product Milestones rather than architectural phases. Each milestone represents a vertical slice of capabilities delivered to the end-user.

## M1: Workspace [DONE]
- The foundational layer allowing creation and management of isolated Workspaces and Projects.

## M2: Dataset Engine [IN PROGRESS]
Focuses purely on getting images into the project and viewing them.
- **M2.1 Image Import**: Import images into the Annotix Native Format (ANF) structure.
- **M2.2 Thumbnail Service**: Generate and cache thumbnails for massive datasets.
- **M2.3 Image Browser**: Grid view, search, sort, and filter functionality.
- **M2.4 Metadata Extraction**: Extract resolution, format, EXIF, and hashes.
- **M2.5 Dataset Statistics**: Display overview counts and distribution.

## M3: Canvas [TODO]
The core drawing engine.
- Bounding Box
- Polygon
- Mask
- Undo/Redo System
- Infinite Zoom & Pan

## M4: Annotation AI [TODO]
AI-assisted labeling using local models.
- Auto Label (YOLO)
- Zero-Shot (GroundingDINO)
- Segmentation (SAM2)
- Visual Question Answering (Florence-2)

## M5: Training [TODO]
Fine-tuning models on local data.
- Train Model Pipeline
- Evaluation Metrics
- Export Weights

## M6: Export [TODO]
Translating ANF to standard formats.
- YOLO (v8, v11)
- COCO
- Pascal VOC
- LabelMe

## M7: Analytics [TODO]
Data quality insights.
- Duplicate detection
- Blur/Low-quality detection
- Missing label identification

## M8: Plugin Marketplace [TODO]
Ecosystem expansion.
- Install & Update plugins
- Capability matching
