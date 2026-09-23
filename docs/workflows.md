# Workflows & Lifecycles

## Current Implementation
Workflows currently support basic CRUD and execution based on a hardcoded 3-state state machine.

### Implemented Lifecycle Statuses
Currently mapped from backend `Lifecycle` enum:
- `Draft`
- `Active` (Displayed as "Published" in the UI)
- `Archived`

Runs (instances) transition linearly through hardcoded states. 

## Target Workflow Lifecycle (PLANNED)

In the future generic workflow engine, the lifecycle will govern version immutability.

### Versioning Rules (PLANNED - NOT IMPLEMENTED)
- **Draft**: A mutable sandbox where the workflow graph is actively edited.
- **Published**: Publishing a Draft freezes it into an immutable `WorkflowVersion`. 
- **Archived**: The workflow is deprecated and can no longer spawn new runs.

**Editing a Published Workflow**:
Editing a published workflow will seamlessly branch a new Draft version. Existing runs will remain attached to the exact `WorkflowVersion` they were launched with to guarantee consistency.

### Templates (PLANNED - NOT IMPLEMENTED)
Templates will be seeded workflow graphs designed for common business use cases:
- Employee onboarding
- Leave approval
- Purchase requests
- Invoice approval
- Customer escalation

Templates will generate a complete Draft clone in the user's workspace upon selection.
