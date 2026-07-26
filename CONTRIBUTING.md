# Contributing to Annotix

Thanks for helping make Annotix better! Bug reports, feature ideas, and pull
requests are all welcome.

## Getting set up

You need Rust, Node 20+, and (only for auto-labeling) [uv](https://docs.astral.sh/uv/).

```sh
cd server && cargo run          # API on :8000
cd frontend && npm install && npm run dev   # UI on :5173, proxies to :8000
cd ml && uv sync && uv run uvicorn main:app --port 8100   # optional sidecar
```

Run the tests with `cd server && cargo test` and the type-check with
`cd frontend && npm run build`.

## Making a change

1. Open an issue first for anything non-trivial, so we can agree on the approach.
2. Fork, branch, make the change — smallest diff that solves the problem wins.
3. Keep the codebase boring: standard library and existing patterns before new
   dependencies or abstractions. See [docs/PLAN.md](docs/PLAN.md) for the
   architecture and its deliberate MVP ceilings.
4. Add or update a test when you touch non-trivial logic (export math, API
   behavior, canvas geometry).
5. Open a pull request describing what changed and why.
