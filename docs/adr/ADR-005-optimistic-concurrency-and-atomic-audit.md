# ADR 005: Optimistic Concurrency and Atomic Audit

## Status
Accepted

## Context
Multiple users might attempt to transition the exact same workflow instance concurrently. Furthermore, compliance requires that every successful state transition securely generates an audit log entry.

## Decision
Implement optimistic concurrency using an integer `version` column on the `workflow_instances` table. Updates enforce `WHERE version = ?` and increment the version.
The instance update and the `audit_entries` insertion are executed together within a single atomic PostgreSQL transaction managed by a `transactionPort`.

## Consequences
Completely prevents lost updates. If a race condition occurs, the database yields 0 updated rows, and the application translates this to an HTTP 409 Conflict. Guarantees that audit logs perfectly reflect actual state transitions.

## Alternatives Considered
Pessimistic locking (`SELECT FOR UPDATE`). Rejected because it holds database connections open during potentially slow application logic and reduces overall throughput.
