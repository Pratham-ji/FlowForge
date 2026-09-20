# FlowForge Docker Configuration

This document outlines the Docker architecture for the FlowForge application. This configuration is optimized for reproducible multi-stage builds and is appropriate for future deployment to Azure Container Apps.

## Architecture Overview

### Backend Image
*   **Builder Stage:** `haskell:9.6`
    *   Compiles the application using Cabal (`flowforge-backend`).
    *   Caches dependencies efficiently by segregating `.cabal` dependency resolution.
*   **Runtime Stage:** `debian:bullseye-slim`
    *   Substantially smaller than the build image.
    *   Only installs `libpq5` (for PostgreSQL), `libgmp10` (for Haskell RTS), and `curl` (for healthchecks).
    *   Runs as the unprivileged `flowforge` user.
    *   Binds to port `8080`.

### Frontend Image
*   **Builder Stage:** `node:20-alpine`
    *   Builds the Vite application.
    *   Consumes the `VITE_API_BASE_URL` build argument to bake the backend location into the compiled JavaScript bundle.
*   **Runtime Stage:** `nginxinc/nginx-unprivileged:alpine-slim`
    *   Serves the static `/dist` directory.
    *   Configured explicitly for SPA fallback routing (`try_files $uri $uri/ /index.html;`) so nested routes like `/app/workflows/:id` do not 404 on hard refreshes.
    *   Runs as an unprivileged user on port `8080`.

## Building the Images Locally

We use the following image tagging convention in preparation for a Container Registry (e.g., Azure Container Registry):

```bash
docker build --platform linux/amd64 -t flowforge/backend:latest ./backend
docker build --platform linux/amd64 -t flowforge/frontend:latest ./frontend
```

## Running with Docker Compose

A `docker-compose.yml` is provided at the repository root strictly for local integration testing. **Do not use Docker Compose as the production deployment architecture.**

To start the local stack:

```bash
docker-compose up --build -d
```

### Database Initialization & Migrations

The local compose setup maps `backend/migrations/*.sql` to the `postgres` container's `/docker-entrypoint-initdb.d/` directory.
When the database volume is initialized for the first time, PostgreSQL automatically executes these files in alphabetical order, establishing the schema and authentication tables.

*   No manual migration steps are required for a clean local startup.
*   State is preserved in the `pgdata` named volume.

### Health and Readiness

The system leverages explicit health endpoints:
*   **Liveness (`/health`):** The backend image exposes `GET /api/v1/health` to confirm the WAI server is accepting HTTP traffic. Compose uses this for its `backend` healthcheck.
*   **Readiness (`/ready`):** The backend exposes `GET /api/v1/ready` to verify connectivity to PostgreSQL through the `DbPool`.

### VITE_API_BASE_URL Note

The frontend uses `VITE_API_BASE_URL` to determine the API domain. Because this is a static SPA, this value is **burned in at build time**. In the Compose environment, the `Dockerfile` accepts `VITE_API_BASE_URL=http://localhost:8080/api/v1` as a build argument so that browser requests correctly route to the backend container exposed on localhost.

## Security Constraints

*   **No Secrets in Images:** The Dockerfiles do not copy `.env` files. Runtime configuration must be passed via environment variables.
*   **Unprivileged Execution:** Both containers use unprivileged users (`flowforge` and `nginx`) and run on non-root ports (`8080`).
*   **Strict `.dockerignore`:** Unnecessary development assets (like `node_modules` or `.ghc.environment.*`) are excluded from the build context to accelerate builds and reduce attack surface.
