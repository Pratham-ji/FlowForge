# ADR 001: Domain, Application, and Infrastructure Separation

## Status
Accepted

## Context
The backend must encapsulate complex state machine logic, workflow lifecycles, and authorization rules without coupling them to HTTP delivery mechanisms or PostgreSQL persistence. Mixing these concerns makes unit testing difficult and inhibits future refactoring.

## Decision
Adopt a strictly layered Clean/Hexagonal Architecture:
- **Domain**: Contains pure Haskell data types, states, transitions, and pure domain errors.
- **Application**: Defines use-case orchestrations (e.g., executing a transition) and repository interface "Ports".
- **Infrastructure**: Implements the repository "Adapters" using `postgresql-simple` and the HTTP API using `Servant`.

## Consequences
The Domain can be tested purely without IO. The business logic remains totally agnostic of Servant or PostgreSQL. However, it introduces mapping boilerplate to convert between Infrastructure DTOs, internal Domain models, and Database rows.

## Alternatives Considered
Model-View-Controller (MVC) or Active Record. Rejected because they typically bleed database concerns (like saving models) into the business logic, making pure property-based testing of the workflow state machine impossible.
