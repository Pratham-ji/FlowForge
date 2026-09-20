# ADR 009: Docker Deployment Architecture

## Status
Accepted

## Context
The application must be packaged portably to ensure parity between local development and cloud deployment environments, and it must support automated orchestration self-healing.

## Decision
Use multi-stage Docker builds.
- The **backend** compiles a minimal dynamic Haskell binary on Debian, running as an unprivileged user.
- The **frontend** compiles static assets via Node and serves them using an unprivileged Nginx alpine container.
- Both Dockerfiles define explicit native `HEALTHCHECK` directives. Azure Container Apps will use distinct liveness/readiness probes in the orchestration layer.

## Consequences
Images are small and secure. Non-root execution minimizes attack surface. Docker HEALTHCHECK provides container health information. Azure Container Apps liveness/readiness probes are the relevant orchestration health mechanism for self-healing.

## Alternatives Considered
A single container hosting both the Nginx frontend and the Haskell backend. Rejected because it prevents independent scaling, complicates the build matrix, and violates the single-responsibility container principle.
