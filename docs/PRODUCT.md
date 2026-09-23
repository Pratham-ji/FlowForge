# FlowForge Product Vision

## The Promise
"Build, run, and improve reliable business workflows without writing code."

## Target Audience
FlowForge is designed for non-technical business users, including:
- Operations teams
- Project and HR teams
- Finance teams
- Customer support teams
- Founders and small businesses
- Technical teams wanting a lightweight platform

## Terminology
**Prefer:**
- Workspace (instead of Organization)
- Workflow
- Step (instead of Node, where user-facing)
- Condition
- Approval
- Run (instead of Instance)
- Team
- Activity (instead of Audit Log)
- Template
- Published (instead of Active)
- Draft
- Archived

**Never Expose to End Users:**
- Raw UUIDs (Workspace ID, User ID, Workflow ID)
- Internal versioning concepts like `expectedVersion`
- HTTP status codes (400, 401, 500, etc.)
- Database implementation details
