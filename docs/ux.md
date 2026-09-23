# UX & Design System Guidelines

## Core Principles
The FlowForge SaaS UI must feel deliberate, premium, and simple enough for non-technical users.
- Hide implementation complexity (No raw UUIDs, technical jargon, or backend terms like `expectedVersion`).
- Use accessible controls and keyboard navigation.
- Present clear focus, hover, disabled, and loading states.
- Be predictable in navigation.

## Standard Error Messaging
Never show raw `HTTP 400`, `HTTP 500`, or raw API responses to the user.

**Map backend errors to consistent, friendly text:**
- Network: "We couldn't reach FlowForge. Check your connection and try again."
- Permission: "You don't have permission to do that."
- Conflict: "This workflow changed while you were editing it. Reload the latest version."
- Validation: "Please complete the required fields."
- Not Found: "This resource no longer exists."
- Workspace Context: "Your workspace could not be loaded."

## Navigation Architecture
### Implemented Routes
- `/app` -> Overview (Dashboard)
- `/app/workflows` -> Workflows (List)
- `/app/settings` -> Team & Settings

### Target Routes (PLANNED)
- Runs (Cross-workspace execution monitoring)
- Activity (Cross-workspace audit logs)
- Analytics (Workflow performance metrics)
- Templates (Gallery of starter workflows)
