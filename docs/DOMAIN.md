# FlowForge Domain Model

## 1. Core Domain Entities

| Entity | Purpose | Key Fields | Layer |
|--------|---------|------------|-------|
| **Organization** | The tenant boundary. | `id`, `name`, `createdAt` | Infrastructure/App |
| **User** | A human actor. | `id`, `orgId`, `email`, `role` | Infrastructure/App |
| **Workflow** | The definition of a process. | `id`, `orgId`, `name`, `lifecycleStatus`, `initialStateId`, `states`, `transitions` | Domain |
| **WorkflowState** | A distinct node in a workflow. | `id`, `name`, `isTerminal` | Domain |
| **WorkflowTransition** | A valid directed edge. | `id`, `sourceStateId`, `targetStateId`, `actionName`, `requiredPermission` | Domain |
| **WorkflowInstance** | A running execution of a Workflow. | `id`, `workflowId`, `currentStateId`, `createdBy` | Domain |
| **AuditEntry** | Immutable record of a state change. | `id`, `instanceId`, `actionName`, `fromStateId`, `toStateId`, `actorId`, `timestamp` | Domain |

*Note: Role and Permission are not DB entities; they are static ADTs in the pure domain.*

---

## 2. Typed Identifiers

Raw `UUID`s or `String`s will not be used in domain signatures. We will use `newtype` wrappers to leverage the Haskell compiler. These act as compiler-enforced domain boundaries to prevent accidentally swapping variables (e.g., passing a `UserId` where a `WorkflowId` is expected).

```haskell
newtype OrganizationId     = OrganizationId UUID
newtype UserId             = UserId UUID
newtype WorkflowId         = WorkflowId UUID
newtype WorkflowInstanceId = WorkflowInstanceId UUID
newtype WorkflowStateId    = WorkflowStateId UUID
newtype TransitionId       = TransitionId UUID
newtype AuditEntryId       = AuditEntryId UUID
```

---

## 3. States, Transitions, and Lifecycle

### ADTs for Authorization and Lifecycle
```haskell
data Role = Admin | Manager | Member | Viewer

data Permission
  = ManageOrganization | CreateWorkflow | ReadWorkflow
  | UpdateWorkflow | DeleteWorkflow | CreateInstance
  | ReadInstance | TransitionInstance | ReadAudit

data WorkflowLifecycle = Draft | Active | Archived
```

### The Central Transition Operation
The pure domain transitions a state and emits a conceptual `AuditEvent` describing what happened. Persistence-specific concerns (like wall-clock timestamps or DB-generated audit IDs) are injected by the Application/Infrastructure layer when saving.

```haskell
transition
  :: Workflow             -- ^ The definition containing states and rules
  -> WorkflowInstance     -- ^ The current instance
  -> UserId               -- ^ The actor attempting the action
  -> Role                 -- ^ The actor's role
  -> WorkflowAction       -- ^ The requested action
  -> Either DomainError (WorkflowInstance, AuditEvent)
```

```haskell
newtype WorkflowAction = WorkflowAction Text

data DomainError
  = InvalidTransition WorkflowStateId WorkflowAction
  | PermissionDenied WorkflowAction Permission
  | InvalidWorkflowState WorkflowStateId
  | WorkflowAlreadyCompleted WorkflowStateId
  | WorkflowNotActive WorkflowLifecycle
  | UnknownAction WorkflowAction
```

---

## 4. Business Invariants

1. **Valid Current State**: A workflow instance must always reference a valid `WorkflowStateId` defined in its parent `Workflow`.
2. **Defined Transitions Only**: A transition may only occur if an explicit `WorkflowTransition` edge exists for the current state and requested action.
3. **Typed Failures**: Invalid actions must return a typed `DomainError`, never an exception.
4. **Terminal States**: A terminal state has no implicit outgoing transitions. If the workflow explicitly defines an outgoing transition, that transition remains valid.
5. **Authorization (Permission-based)**: Transitions check if the actor's Role grants the transition's `requiredPermission`. Conceptually: `Role → grants Permissions`, `WorkflowTransition → requires Permission`.
6. **Valid Initial State**: `initialStateId` must reference an existing state defined within the workflow.
7. **Draft Lifecycle**: Definitions may be modified. Instances *cannot* be created.
8. **Active Lifecycle**: Instances may be created. The definition (states, transitions, initial state) is *immutable*.
9. **Archived Lifecycle**: Existing instances may continue to exist and transition. New instances *cannot* be created.

---

## 5. Audit Model

A successful transition yields a conceptual `AuditEvent` (pure domain object):
- `WorkflowInstanceId`
- `ActorId` (UserId of the initiator)
- `PreviousStateId`
- `ActionName`
- `ResultingStateId`

The Application/Infrastructure layer takes this pure event and enriches it with:
- `AuditEntryId` (DB generated)
- `OrganizationId` (Contextual)
- `Timestamp` (Wall-clock time)
...to persist the final `AuditEntry`.

---

## 6. Error Model Taxonomy

| Layer | Type | Example |
|-------|------|---------|
| **Domain** | `DomainError` | `InvalidTransition state action` |
| **Application** | `AppError` | `DomainValidationError DomainError` / `TenantMismatch` |
| **Infrastructure** | `InfraError` | `DatabaseConnectionFailed` / `UniqueConstraintViolation` |
| **HTTP/API** | `JSON Response` | `409 Conflict (Invalid Transition)` / `403 Forbidden` / `500` |

---

## 7. Domain API Design

The public surface area of the pure `FlowForge.Domain` module:

```haskell
-- Core Transition Logic
transition :: Workflow -> WorkflowInstance -> UserId -> Role -> WorkflowAction -> Either DomainError (WorkflowInstance, AuditEvent)

-- Validation
validateWorkflow :: Workflow -> Either DomainError ()

-- Queries
canTransition :: Workflow -> WorkflowInstance -> Role -> WorkflowAction -> Bool
hasPermission :: Role -> Permission -> Bool

-- Factories
createWorkflowInstance :: Workflow -> UserId -> Either DomainError WorkflowInstance
```
