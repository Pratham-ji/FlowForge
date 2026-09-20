# FlowForge Configuration Guide

This document describes how to configure the FlowForge frontend and backend for development and production environments.

## Environment Files (.env)

The repository uses `.env` files for configuration.
*   **`.env.example`** files are provided in both the `frontend/` and `backend/` directories.
*   Copy `.env.example` to `.env` in both directories to customize your environment.
*   **Never commit `.env` or any files containing actual secrets.**

---

## Frontend Configuration

The frontend uses Vite and is configured primarily through environment variables prefixed with `VITE_`.

| Variable | Description | Development Default | Production |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | The base URL of the FlowForge Backend API. | `http://localhost:8080/api/v1` | `https://<public-backend-domain>/api/v1` |

### Security Constraints
*   **No Secrets:** Because frontend configuration is bundled directly into the compiled JavaScript payload, **never place API keys, passwords, or secrets into `VITE_*` variables.**
*   **JWT Storage Tradeoff:** JWT persistence currently uses browser `localStorage`. This is because the existing backend exposes bearer-token authentication rather than an `HttpOnly` cookie/refresh-token flow. `localStorage` is vulnerable to XSS; if strict security compliance is required later, the architecture will need to shift to an `HttpOnly` cookie strategy.

---

## Backend Configuration

The backend is configured via standard POSIX environment variables. If `ENV` is set to `production`, the backend strictly enforces that secrets like `DATABASE_URL` and `JWT_SECRET` are present, failing gracefully on startup if they are missing.

| Variable | Description | Development Default | Production |
| :--- | :--- | :--- | :--- |
| `ENV` | `development` or `production`. Controls CORS rigidity and secret enforcement. | `development` | `production` |
| `PORT` | The HTTP port the server binds to. | `8080` | Provided by orchestrator (e.g. 80, 8080) |
| `DATABASE_URL` | PostgreSQL connection string. | `host=localhost dbname=flowforge_test...` | Full connection string (Secret!) |
| `JWT_SECRET` | The symmetric secret used to sign and verify JWTs. | Randomly generated at startup | Explicit 256-bit+ secret |
| `CORS_ALLOWED_ORIGIN`| Specific frontend origin allowed for CORS. | `*` (All allowed) | `https://<public-frontend-domain>` |

### Security & Error Disclosure
*   **Stack Traces Hidden:** Production errors (e.g., PostgreSQL persistence failures, unhandled domain errors) map to generic 500 or 422 JSON payloads (`"INTERNAL_ERROR"`, `"DOMAIN_ERROR"`). Stack traces, SQL statements, and internal server file paths are deliberately stripped from HTTP responses.
*   **CORS:** When `ENV=production`, CORS defaults to blocking all requests unless `CORS_ALLOWED_ORIGIN` is configured to precisely match the frontend domain.

### Health and Readiness
The backend provides two endpoints for orchestrators:
*   `GET /api/v1/health` - Returns `"OK"`. Used for basic liveness probes (ensures the HTTP server is bound and accepting connections).
*   `GET /api/v1/ready` - Returns `"READY"`. Used for readiness probes. It actively checks out a connection from the database pool and executes a trivial operation to guarantee persistence availability before accepting traffic.
