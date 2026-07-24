# Architecture Validation Checklist

Before marking any Phase or major feature as complete, this checklist **must** be validated. It ensures Annotix remains a scalable, decoupled, and maintainable enterprise software.

## UI / Domain Boundary
- [ ] UI components do not import filesystem libraries (`@tauri-apps/plugin-fs`, `fs`).
- [ ] UI components do not instantiate Domain Services or Repositories directly.
- [ ] UI components only communicate through the Application Runtime (`useRuntime()`).

## State Management
- [ ] Zustand (or any state manager) does not hold Domain Entities.
- [ ] Zustand only holds DTOs (Data Transfer Objects) mapped via `mappers.ts`.

## Orchestration Layer
- [ ] The `Runtime` orchestrates Domain Services and catches exceptions.
- [ ] The `Runtime` updates UI state (Zustand) centrally upon success.
- [ ] The `Runtime` acts as the single source of truth for high-level user commands.

## Hexagonal Architecture
- [ ] Domain Services (`src/application/services`) only depend on Ports (Interfaces).
- [ ] Storage logic is purely implemented in Adapters (`src/infrastructure/adapters`).
- [ ] No infrastructure leakage into the Domain Layer.

## Observability & Events
- [ ] Core business actions emit events via `CategorizedEventBus`.
- [ ] The `Logger` listens to the Event Bus and does not clutter Domain Service code.

## Quality Assurance
- [ ] Schema validation rules are enforced.
- [ ] Core Domain logic has unit tests passing.
