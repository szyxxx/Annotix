# Contributing to Annotix

First off, thank you for considering contributing to Annotix! It's people like you that make Annotix such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make one! It's generally best if you get confirmation of your bug or approval for your feature request this way before starting to code.

## Fork & create a branch

If this is something you think you can fix, then fork Annotix and create a branch with a descriptive name.

## Get the test suite running

Make sure you have `Node.js`, `Rust` (Cargo), and `uv` installed.
Run `npm install` and `npm run tauri dev`.

## Implement your fix or feature

At this point, you're ready to make your changes. Feel free to ask for help; everyone is a beginner at first.

## Pull Request Requirements

We enforce strict rules for merging Pull Requests to maintain our high architectural standards:

1. **Milestone Tagging**: Every PR description must explicitly state which milestone it targets (e.g., `Milestone: M2.1`).
2. **Vertical Slice**: Features must be implemented as a Vertical Slice (UI -> Runtime -> Service -> Repository -> Storage). Partial implementations (e.g., "just the database layer") will be rejected.
3. **Architecture Freeze**: We are in **Architecture Freeze v1**. Do not introduce new abstractions, registries, managers, or architectural layers without an approved RFC and ADR. Focus purely on product capabilities.
4. **Testing**: Tests matching our [Testing Strategy](docs/engineering/testing-strategy.md) must be included.

At this point, you should switch back to your master branch and make sure it's up to date with Annotix's master branch.
Then create a pull request.
