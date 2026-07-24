# ADR 0003: Separation of Workspace and Project

**Date:** 2026-07-24  
**Status:** Accepted  

## Context
Originally, Annotix was designed as a single-project application where a project corresponds 1:1 with a dataset folder containing an `annotix.project` file.
However, in real-world scenarios (like VSCode workspaces), users often need to manage multiple related projects (e.g., a detection dataset and a segmentation dataset) or have global preferences spanning across datasets. 
Coupling the application state strictly to one project makes multi-project workflows, migration, and environment isolation difficult.

## Decision
We will separate the concepts into **Workspace** and **Project**.
- **Workspace**: A top-level container that holds global settings, multiple projects, shared models, and cache. Represented by `workspace.annotix`.
- **Project**: A specific dataset and annotation task. Resides inside `Workspace/projects/<name>/project.annotix`.

Furthermore, all business logic accessing these entities will use **Hexagonal Architecture (Ports and Adapters)**. Domain logic will communicate with `WorkspaceRepository` and `ProjectRepository` interfaces, allowing us to swap the underlying storage (e.g., Tauri FS, SQLite, Cloud Storage) without changing the core engine.

## Consequences
- **Positive:** Enables multi-project setups out of the box.
- **Positive:** Hexagonal architecture makes unit testing easy via in-memory adapters.
- **Positive:** Opens the door for future "Cloud Workspaces".
- **Negative:** Increased initial boilerplate (DTOs, Ports, Adapters, Services).
- **Negative:** Users must create a Workspace before creating a Project.
