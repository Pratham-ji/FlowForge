# ADR 002: PostgreSQL Persistence and Repository Ports

## Status
Accepted

## Context
FlowForge requires strong relational integrity to guarantee correct workflow states, optimistic concurrency on instances, and atomic audit logging.

## Decision
Use PostgreSQL as the relational database. Use `postgresql-simple` for direct, explicitly controlled SQL queries. Database access is strictly isolated behind repository ports (typeclasses or injected records) defined by the Application layer. The database connection pool is injected into use cases via the `ReaderT` pattern.

## Consequences
High performance and explicit control over SQL queries and transactions. No ORM magic or hidden N+1 query problems. Changing the underlying database would require implementing new adapters, though this is highly unlikely.

## Alternatives Considered
Using a Haskell ORM such as Persistent or Esqueleto. Rejected to keep the abstraction overhead low, maximize performance, and demonstrate raw SQL proficiency for interview defensibility.
