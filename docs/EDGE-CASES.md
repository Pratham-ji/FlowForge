# FlowForge Edge Cases

| Scenario | Expected Behavior | Responsible Layer |
|----------|-------------------|-------------------|
| **Invalid transition** | Reject with `InvalidTransition`. Do not mutate state. | Domain |
| **Transition from terminal state** | Reject with `WorkflowAlreadyCompleted` if no explicit edge exists. If configured, proceed normally. | Domain |
| **Unauthorized transition** | Reject with `PermissionDenied`. | Domain |
| **User from another organization** | Reject with `TenantMismatch` / `404 Not Found`. | Application |
| **Missing workflow state** | `validateWorkflow` fails upon workflow creation. | Domain |
| **Duplicate state/transition** | `validateWorkflow` rejects creation/update. | Domain |
| **Workflow instance with invalid state** | App throws `DataCorruptionError`. | App / Domain |
| **Concurrent transitions** | One succeeds, the other fails due to DB locking. | Infrastructure (DB) |
| **Audit failure** | Transaction rolls back. No state change saved. | Application (Tx) |
| **Malformed request** | Reject HTTP 400 Bad Request. | Infrastructure (Servant) |
| **Nonexistent resource** | Return 404 Not Found. | Application / Infra |
| **Invalid initial state** | `validateWorkflow` fails (initial state must exist). | Domain |
| **Modification of Active workflow** | Reject update (Active definitions are immutable). | Application / Domain |
| **Creation of instance from Draft workflow** | Reject with `WorkflowNotActive`. | Domain |
| **Creation of instance from Archived workflow**| Reject with `WorkflowNotActive`. | Domain |
| **Transition against an immutable Active workflow** | Instance transition succeeds, but modifying the Active definition itself is rejected. | Domain / Application |
| **Lifecycle transition validation** | Enforce valid lifecycle flows (e.g., Draft -> Active -> Archived). | Domain |
