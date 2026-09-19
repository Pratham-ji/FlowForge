# ADR-014: Authoritative Authorization Boundary

## Decision
The Application layer will serve as the authoritative boundary for authorization. While the HTTP API may perform early token validation, all `hasPermission` assertions are evaluated directly within the Application Use Cases before delegating to the Domain.

## Context
Authorization must be uniform across all execution vectors. If the HTTP layer alone held the permission checks, alternative entry points (like a future CLI or background job worker) would bypass them or require duplicative implementations.

## Alternatives Considered
- **HTTP-Only Middleware**: Easy to implement via Servant combinators, but unsafe for non-HTTP callers.
- **Domain-Only**: Pushing role strings down into pure domain transitions. We avoided this by keeping `Permission` evaluation in the Application layer, preserving pure state-machine semantics in the Domain.

## Consequences
- Single source of truth for authorization.
- Any future execution vectors (CLI, jobs) naturally inherit the exact same security posture.
- Handlers are kept extremely thin, strictly routing authenticated identity down to the Use Cases.
