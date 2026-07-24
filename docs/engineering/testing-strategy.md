# Testing Strategy

Annotix enforces a strict testing strategy aligned with the Hexagonal Architecture and Vertical Slice methodology.

## Layered Testing Rules

1. **Domain Layer (Entities, DTOs, Mappers)**
   - **Type:** Unit Tests.
   - **Environment:** Node.js / Pure TS.
   - **Goal:** Verify business rules, state transitions, and mappings with zero dependencies.

2. **Application Services**
   - **Type:** Integration Tests.
   - **Environment:** Node.js with `MemoryStorageProvider` (Mock Adapters).
   - **Goal:** Verify that use cases orchestrate entities and repositories correctly.

3. **Adapters (Infrastructure)**
   - **Type:** Integration Tests.
   - **Environment:** Tauri context or temporary file system.
   - **Goal:** Verify that the `TauriStorageProvider` actually reads/writes to the physical disk correctly.

4. **Application Runtime**
   - **Type:** Orchestration Tests.
   - **Goal:** Verify that calls to the Runtime correctly dispatch events, handle errors, update the Job Queue, and mutate the global Zustand stores.

5. **UI (React Components)**
   - **Type:** Component Tests / E2E.
   - **Tooling:** React Testing Library / Playwright.
   - **Goal:** Verify that user interactions map to the correct Runtime commands. 

*No feature is complete (Definition of Done) without accompanying tests for its respective layers.*
