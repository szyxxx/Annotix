# Release Strategy

Annotix follows Semantic Versioning (SemVer) aligned with our Product Milestones to ensure continuous delivery of value.

## Versioning Scheme

- **v0.1.0 (Workspace)**: M1 completion. Users can manage projects.
- **v0.2.0 (Dataset Engine)**: M2 completion. Users can import and view images.
- **v0.3.0 (Canvas Engine)**: M3 completion. Users can draw bounding boxes and polygons.
- **v0.4.0 (AI Assist)**: M4 completion. Auto-labeling enabled.
- **v0.5.0 (Training Engine)**: M5 completion. Local fine-tuning available.

## Release Process
1. Features are built as Vertical Slices.
2. A slice is merged into `main` once it passes the Definition of Done (DoD).
3. When a Milestone concludes, a release tag (e.g., `v0.2.0`) is created.
4. CI/CD pipelines automatically build the Tauri binaries for Windows, macOS, and Linux and attach them to the GitHub Release.
