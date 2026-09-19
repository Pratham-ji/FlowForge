# ADR-013: API and Domain Separation

## Decision
We will define distinct Data Transfer Objects (DTOs) for the API layer (e.g., `CreateWorkflowRequest`, `WorkflowDTO`) and explicit conversion functions, rather than deriving `ToJSON`/`FromJSON` directly on the Domain types.

## Context
The Domain types are optimized for business logic and invariants. Exposing them directly ties the public API contract to internal Haskell modeling choices. The planned frontend will be a React + TypeScript application, which expects predictable `camelCase` JSON boundaries.

## Alternatives Considered
- **Direct Domain Exposure**: Faster to implement, but leaks internal constructs and necessitates Haskell-specific type workarounds (e.g., `aeson` generic configuration) bleeding into the Domain layer.
- **GraphQL**: Too heavyweight for the current simple state machine transition semantics.

## Consequences
- The API layer is decoupled from Domain evolution.
- The API is fully consumable by TypeScript clients.
- We must manually maintain conversion logic between DTOs and Domain types.
