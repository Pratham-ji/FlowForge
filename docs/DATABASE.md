# Database Architecture

## Persistence Strategy
FlowForge uses **PostgreSQL** with `postgresql-simple` for lightweight, explicit SQL execution. No heavy ORMs (Persistent/Esqueleto) are used to keep queries transparent and ensure Domain isolation.

## Schema Highlights
- **UUID Primary Keys**: Used universally, matching the Domain types.
- **Constraints**:
  - `UNIQUE (source_state_id, action)` in `workflow_transitions` enforces the business invariant that a single state cannot have multiple duplicate actions.
  - `UNIQUE (workflow_id, name)` in `workflow_states` enforces state name uniqueness.
- **Deferred Foreign Keys**: `workflows.initial_state_id` refers to `workflow_states`, which references `workflows`.

## Concurrency
We use **Optimistic Concurrency Control (OCC)** for workflow instance transitions.
- The `workflow_instances` table includes a `version` integer.
- The Application layer executes updates using `WHERE id = ? AND version = ?`, incrementing the version.
- If zero rows are affected, it throws a `ConcurrencyConflict` error.

## Tenant Isolation
All tables dealing with tenant data (`users`, `workflows`, `workflow_instances`, `audit_entries`) enforce an `organization_id` column.
- Queries explicitly filter by `organization_id`.
- This ensures data cannot leak across tenant boundaries, enforced at the Application repository layer.

## Transactions
Database transactions ensure that transitioning a workflow instance (updating the instance state + appending the audit log) occurs atomically. If the Audit log fails to save, the instance update is rolled back.
