# Architecture Decision Records (ADRs)

## ADR-001: Why Haskell is used for the backend
- **Context**: FlowForge needs to be a production-grade portfolio project that demonstrates capability for a CentralApp Product Engineer role.
- **Decision**: Haskell is chosen for the backend.
- **Consequences**: Forces rigorous domain modeling via ADTs and guarantees the absence of side effects in business logic.

## ADR-002: Pure Domain Layer
- **Context**: Workflow rules and transitions can become complex and easily entangled with database queries.
- **Decision**: The core `transition` function and workflow definitions will live in a pure Domain layer devoid of `IO`.
- **Consequences**: Business logic can be exhaustively tested with QuickCheck. Application fetches context before invoking domain.

## ADR-003: Typed Identifiers
- **Context**: Passing raw `String` or `UUID` values often leads to swapping parameters.
- **Decision**: All identifiers will be wrapped in Haskell `newtype`s (e.g., `newtype OrganizationId = OrganizationId UUID`).
- **Consequences**: The compiler will catch swapped identifiers. Conversion to/from raw types is handled at the boundary.

## ADR-004: Multi-tenant Organization Boundary
- **Context**: A SaaS application must strictly isolate tenant data.
- **Decision**: `OrganizationId` is the fundamental root boundary.
- **Consequences**: The Application layer must validate `org_id` matches the authenticated user's `org_id` on every request.

## ADR-005: Static typed roles and permissions
- **Context**: The MVP requires Role-Based Access Control but full dynamic DB-backed roles add unnecessary complexity.
- **Decision**: `Role` and `Permission` are modeled as static strongly-typed ADTs in Haskell. `hasPermission` is a pure function.
- **Consequences**: Simplifies the database schema and removes the need for complex caching. Transitions define required permissions, not required roles.

## ADR-006: Immutable Active workflow definitions
- **Context**: Allowing modifications to a workflow that has active running instances causes ambiguous states and broken histories.
- **Decision**: Workflows have a lifecycle (`Draft` -> `Active` -> `Archived`). `Active` workflows are strictly immutable.
- **Consequences**: New changes require a new Workflow definition (versioning can be added later). Active instances are insulated from definition changes.

## ADR-007: Explicit workflow initial state
- **Context**: It is ambiguous which state an instance should begin in when created.
- **Decision**: Add an explicit `initialStateId` to the Workflow definition.
- **Consequences**: The domain can validate that the initial state exists during workflow creation.
