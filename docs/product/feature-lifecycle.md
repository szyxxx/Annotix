# Feature Lifecycle

To maintain high standards, every major feature in Annotix follows this lifecycle:

1. **Idea / Discussion**: Proposed in GitHub Discussions.
2. **RFC (Request for Comments)**: A formal document outlining the feature scope, UX, and technical approach.
3. **ADR (Architecture Decision Record)**: If the feature requires a fundamental shift in architecture or data schema.
4. **Implementation (Vertical Slice)**: Building the feature end-to-end, satisfying the DoD.
5. **Testing**: Automated unit and integration tests.
6. **Release**: Merged to `main` and distributed via automated CI/CD.
7. **Deprecation**: If a feature is replaced, a clear migration path must be provided.
