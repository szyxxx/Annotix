# ---- frontend ----
FROM node:22-slim AS frontend
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-fund --no-audit
COPY frontend/ ./
RUN npm run build

# ---- server ----
FROM rust:1-slim-bookworm AS server
WORKDIR /app
COPY server/ ./
RUN cargo build --release

# ---- runtime ----
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=server /app/target/release/annotix-server /usr/local/bin/annotix-server
COPY --from=frontend /app/dist ./frontend/dist
ENV ANNOTIX_DATA_DIR=/data
VOLUME /data
EXPOSE 8000
CMD ["annotix-server"]
