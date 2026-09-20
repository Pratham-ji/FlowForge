# ADR 003: JWT Authentication and Authorization

## Status
Accepted

## Context
The API requires stateless authentication and role-based access control (Admin, Manager, Member, Viewer) to protect workflow definitions and instance transitions.

## Decision
Use JSON Web Tokens (JWT) for authentication. Tokens are issued by the `login` endpoint and stored client-side. The API layer (Servant) validates the token cryptographically.
Crucially, *authorization* (verifying if a role permits a specific action) is enforced inside the Application layer use-cases, rather than solely at the API routing layer.

## Consequences
Stateless auth scales seamlessly. Enforcing authorization within the use cases ensures that alternative interfaces (e.g., a CLI or background job worker) would inherently respect the same permission boundaries. Immediate token revocation is limited (requires short expiry), which is an accepted tradeoff.

## Alternatives Considered
Session cookies with a Redis state store. Rejected because JWT fits the stateless API model well and reduces external infrastructure dependencies (no Redis needed).
