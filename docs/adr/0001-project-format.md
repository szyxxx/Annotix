# ADR 0001: Annotix Native Format (ANF) as Single Source of Truth

**Date:** 2026-07-24  
**Status:** Accepted  

## Context
Computer Vision platforms typically face a fragmentation issue with annotation formats. YOLO uses normalized text files (xywhn), COCO uses a giant monolithic JSON file, VOC uses XML, and LabelMe uses per-image JSONs.
If Annotix uses any of these formats natively (e.g. YOLO txt) for internal state, we inherently lose metadata capabilities. YOLO TXT cannot store hierarchical labels, colors, polygons, or verification status. 
If we use COCO, incremental edits on a dataset with 50,000 images require parsing and re-writing a 500MB JSON file continuously.

## Decision
We will define and use **Annotix Native Format (ANF)** as the application's internal *Single Source of Truth*. 
ANF will be heavily structured and stored as per-image JSON files (e.g., `img001.ann.json`).
ANF supports complex data structures (hierarchical classes, masks, polygons, attributes).

All external formats (YOLO, COCO, VOC) will be supported via an **Exporter Pipeline** and **Importer Pipeline**, meaning ANF acts as the universal bridge.

## Consequences
- **Positive:** Annotix becomes Format-Agnostic. We can support unlimited metadata (e.g., Confidence scores from Active Learning, reviewer names).
- **Positive:** Per-image JSONs allow fast, atomic, incremental saves without parsing the entire dataset.
- **Negative:** Users cannot just drop a YOLO dataset into Annotix directly; they must run an `Importer` to convert YOLO to ANF first.
