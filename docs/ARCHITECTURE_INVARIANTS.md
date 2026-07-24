# Architecture Invariants (The Annotix Constitution)

This document contains the absolute laws of the Annotix architecture. Unlike Architecture Decision Records (ADRs) which represent historical decisions that can be superseded, these **Invariants** are the foundational constitution of the project. They may only be changed through an extraordinary consensus of core maintainers.

## Invariant 1: Single Source of Truth
**Annotix Native Format (ANF) is the single source of truth.** All projects operate on ANF internally. Other formats (YOLO, COCO, LabelMe) exist strictly as import/export targets. No data loss is permitted within ANF.

## Invariant 2: UI Boundary
**The React UI must never access the Repository, Storage Adapters, or Filesystem directly.** The UI must remain entirely ignorant of the underlying persistence mechanism. 

## Invariant 3: The Orchestration Gate
**The Application Runtime is the ONLY entry point for the UI.** All commands, state mutations, and domain invocations must flow through `useRuntime()`.

## Invariant 4: Pure State
**Zustand (or any state manager) must NEVER hold Domain Entities.** State managers hold only pure Data Transfer Objects (DTOs) mapped via explicit mapping functions to prevent accidental domain mutation from the UI layer.

## Invariant 5: Plugin Isolation
**Plugins must never access the Core Runtime directly.** Plugins interact exclusively through the Plugin SDK and capability registries, ensuring malicious or poorly written plugins cannot crash the main application.

## Invariant 6: Vertical Slice Delivery
**All new features must be built as a Vertical Slice.** A feature is only considered "Done" when it is fully implemented from UI to Storage, passing through the Runtime and Service layers, with all DoD checklist items green.

## Invariant 7: Infrastructure Ignorance
**The Domain Layer must not know about Infrastructure.** Domain Models and Services do not know if they are running on Tauri, Electron, Cloud, or CLI. They communicate purely through Ports (Interfaces).
