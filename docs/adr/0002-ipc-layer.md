# ADR 0002: IPC Layer Abstraction (JSON-RPC over Stdio)

**Date:** 2026-07-24  
**Status:** Accepted  

## Context
Annotix utilizes a robust architecture separating the Operating System Layer (Rust) and the AI Runtime (`annotix-engine` in Python).
We need a fast, reliable Inter-Process Communication (IPC) mechanism between Rust and Python.
FastAPI (HTTP) introduces overhead, port conflicts, and firewall warnings on desktop environments.
Direct bindings (PyO3) lock the AI engine to the exact same memory space and make it impossible to distribute the AI engine to a cluster later.

## Decision
We will use an **Abstract Transport Layer**. 
Initially, the implementation will use **JSON-RPC over Standard I/O (stdin/stdout)**.
Rust will spawn the Python daemon and stream JSON requests to `stdin` and read responses from `stdout`.

## Consequences
- **Positive:** No firewall prompts on Windows/macOS. No TCP port conflicts.
- **Positive:** Simple serialization/deserialization.
- **Positive:** The Transport abstraction allows us to drop in a `gRPC` or `ZeroMQ` transport later without changing the AI Engine code, enabling Annotix to run the AI engine on a separate GPU server if needed.
- **Negative:** `stdin/stdout` requires careful buffer management to avoid deadlocks in Rust.
