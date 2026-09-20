# ADR 008: Observability Strategy

## Status
Accepted

## Context
We need sufficient visibility to diagnose production issues without over-engineering the portfolio project with complex infrastructure.

## Decision
- Implement WAI middleware to generate and propagate an `X-Request-ID` across HTTP requests and responses.
- Log HTTP methods, paths, and statuses to standard error.
- Log application failures to standard error using a deliberately safe diagnostic serialization *before* they are translated to generic HTTP 500s. This diagnostic drops PII (like email addresses) and raw database payloads.
- Expose `/health` and `/ready` endpoints for container orchestration.

## Consequences
Yields sufficient debuggability. Integrates natively with Azure Log Analytics container log capture. Prevents PII and credential leakage in the logs.

## Alternatives Considered
OpenTelemetry, Jaeger, and Prometheus. Rejected as overkill for a portfolio project. Standard `stderr` logging combined with platform log capture provides adequate observability with minimal friction.
