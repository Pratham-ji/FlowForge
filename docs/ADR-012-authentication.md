# ADR-012: Authentication Boundary

## Decision
We will use standard `bcrypt` password hashing alongside JSON Web Tokens (JWT) for authentication. The verification algorithm will be encapsulated in a `PasswordVerifier` abstraction at the Application boundary, implemented by the Infrastructure layer.

## Context
FlowForge requires a secure, stateless authentication mechanism. We evaluated OAuth and external identity providers, but they introduce unnecessary infrastructure complexity and external failure domains for an MVP portfolio project.

## Alternatives Considered
- **OAuth/OIDC**: Offloads security but requires third-party setup (Auth0, Cognito) which compromises the self-contained nature of this project.
- **Session Cookies + Redis**: Requires stateful infrastructure (Redis) which violates our stateless API and AWS-readiness goals.

## Consequences
- Passwords are securely hashed (bcrypt) and never logged or stored in plaintext.
- JWTs enable stateless horizontal scaling and fast, early tenant isolation checks.
- If an instance restarts with an ephemeral key (dev), tokens expire. Production requires a persistent `JWT_SECRET`.
