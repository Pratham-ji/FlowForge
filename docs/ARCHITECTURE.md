# FlowForge Architecture

FlowForge uses a strictly layered architecture to isolate business complexity from technical complexity (Ports and Adapters / Clean Architecture).

## Dependency Rule
**Infrastructure → Application → Domain**

The Domain depends on absolutely nothing outside itself. It does not depend on Application or Infrastructure.

---

## 1. Domain Layer
**Responsibility**: The heart of the software. Pure business logic.

- **Contents**: Pure Haskell data types (`Workflow`, `WorkflowInstance`), domain errors (`DomainError`), pure functions (`transition`, `validateWorkflow`).
- **Rules**:
  - NO `IO`.
  - NO database access, SQL, or wall-clock timestamps.
  - Highly testable via property testing (QuickCheck).

## 2. Application Layer
**Responsibility**: Orchestrates use cases and owns the repository interfaces (Ports).

- **Contents**: Use case functions (e.g., `ExecuteTransitionUseCase`), authorization checks (Tenant validation), and definitions of repository interfaces (e.g., `class MonadWorkflowDB m where...`).
- **Rules**:
  - Defines the Ports (interfaces) that the Infrastructure must implement.
  - Contains transaction boundaries.
  - Fetches data via interfaces, passes it to the pure Domain, and saves the resulting updated instance and audit events back via interfaces.

## 3. Infrastructure Layer
**Responsibility**: The boundary to the outside world (Adapters).

- **Contents**: PostgreSQL queries (`postgresql-simple`), HTTP API handlers (`Servant`), JWT authentication, configuration, wall-clock time injection.
- **Rules**:
  - *Implements* the repository interfaces (Ports) defined by the Application layer.
  - Maps `AppError` into HTTP status codes.
  - No business logic lives here.
