# Architecture

## Current / Implemented Architecture

**Frontend**:
- React + Vite + TypeScript
- Cloudflare Workers Static Assets
- Tailwind CSS

**Backend**:
- Haskell + Servant
- PostgreSQL (Azure Flexible Server)
- Azure Container Apps
- Managed Identity & Log Analytics

**Current Data Model**:
Currently, workflows are implemented as a fixed three-state machine:
`Draft` → `In Review` → `Approved`

This acts as a solid multi-tenant, RBAC-secured foundation, but is highly rigid.

## Target / Planned Architecture (Next Generation)

To fulfill the vision of a flexible workflow automation SaaS, the domain will evolve to a generic graph-based engine.

**Target Data Model (PLANNED - NOT IMPLEMENTED):**
- **Workflow**: The parent container (id, workspace, name, status).
- **WorkflowVersion**: Immutable snapshots of workflow definitions (draft vs published).
- **WorkflowNode**: Discrete steps (Trigger, Action, Approval, Condition, Delay, Notification, Webhook, End).
- **WorkflowEdge**: Directed connections between nodes, optionally containing evaluation conditions.
- **Run (Execution)**: A specific execution tied to an immutable `WorkflowVersion` tracking current node, inputs, and outputs.

**Important Note**: Currently, none of the target visual builder nodes, scheduling, webhooks, or analytics are implemented. They are planned for future iterations.
