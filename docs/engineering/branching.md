# Branching Strategy

We follow a Trunk-Based Development approach with short-lived feature branches.

## Branch Naming
- `feat/issue-number-description`
- `bugfix/issue-number-description`
- `docs/description`

## Pull Requests
- All PRs must target `main`.
- Squash and merge is preferred to keep the history clean.
- All CI checks (Lint, Typecheck, Test, Build) must pass.
