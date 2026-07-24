# Testing Guidelines

## Unit Tests
- Use `Vitest` for React and TypeScript utility functions.
- Use `cargo test` for Rust Core Engine modules.
- Use `pytest` for AI Runtime components.

## Integration Tests
- Verify IPC boundary (Rust <-> Python) using mocked `stdin`/`stdout`.

## Target Coverage
- `Core`: 90%+
- `AI Engine`: 80%+
- `UI`: 70%+
