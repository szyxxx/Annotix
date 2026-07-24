# Annotix Coding Style

## Typescript (Frontend)
- Use strict TypeScript mode.
- Avoid `any` type whenever possible.
- Use `PascalCase` for React components.
- Use `camelCase` for functions and variables.
- Place all UI components in `apps/desktop/src/components/` (Future Monorepo struct).

## Rust (Backend Layer)
- Use `clippy` for linting.
- Handle all `Result` types explicitly; avoid `.unwrap()` in production code.
- Prefix Tauri commands with `cmd_` (e.g. `cmd_create_project`).

## Python (AI Runtime)
- Follow PEP 8 guidelines.
- Use type hints (`def process(image: np.ndarray) -> dict:`).
- Format using `ruff`.
