# ADR 0004: Architectural Boundaries

**Date:** 2026-07-24  
**Status:** Accepted  

## Context
As Annotix transitions from a theoretical design phase to a "Product First" phase, maintaining structural integrity across thousands of commits and multiple contributors is critical. Without hard boundaries, UI components inevitably become bloated with business logic, and Domain layers become coupled to external APIs (e.g., Tauri FS, Zustand).

## Decision
We mandate a strict **Dependency Rule** based on Hexagonal Architecture and Uni-directional Data Flow.

### The Dependency Pipeline
Data and commands must flow in exactly one direction:
`UI -> Runtime -> Service -> Repository -> Storage Adapter`

### Strict Violations (Zero Tolerance)
- **React UI**: ❌ Must NEVER import or invoke `Repository`, `Service`, `Storage`, or Tauri FS API directly.
- **Application Runtime**: ❌ Must NEVER import or interact with `Storage Adapters` or Tauri FS directly.
- **Application Services**: ❌ Must NEVER import `Zustand` stores, React hooks, or infrastructure Adapters directly (must use Ports).
- **Domain Layer**: ❌ Must NEVER contain IO logic, Tauri calls, or UI dependencies.
- **Zustand**: ❌ Must NEVER hold Domain Entities. It must only hold pure DTOs produced by `mappers.ts`.

## Consequences
- **Positive:** UI can be completely replaced (e.g., to a web version) without touching business logic.
- **Positive:** Domain logic can be unit tested without starting a React or Tauri environment.
- **Negative:** Small features require updating multiple layers (UI, Runtime, Service), which is an acceptable trade-off for enterprise scalability.
