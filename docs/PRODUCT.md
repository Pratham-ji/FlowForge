# FlowForge Product Definition

## 1. Product Vision
FlowForge is a production-grade, typed workflow and business-process platform designed for multi-tenant SaaS environments. 
Organizations can define bespoke workflows, specify valid states and transitions, and create instances of those workflows. FlowForge enforces strict business rules, ensuring that workflow instances only move through valid transitions based on predefined roles and permissions, while maintaining an immutable audit history of all state changes.

### Core Features
- **Workflow Definitions**: Create workflows, states, and valid transitions.
- **Workflow Lifecycle**: Manage workflows through Draft, Active, and Archived phases.
- **Workflow Execution**: Instantiate workflows and transition them through states.
- **Access Control**: Role-based access control governing who can perform specific actions.
- **Auditability**: Immutable audit log of every state change and action.
- **Visibility**: Dashboard for searching, filtering, and tracking workflow instances.

---

## 2. Actors and Roles

The system defines four core roles within an Organization, ordered by descending privilege. For the MVP, roles and permissions are static, strongly-typed concepts rather than dynamically-created database entities.

1. **Admin**
   - *Responsibilities*: Manages the organization, user roles, and system-wide settings.
   - *Permissions*: `ManageOrganization`, `CreateWorkflow`, `ReadWorkflow`, `UpdateWorkflow`, `DeleteWorkflow`, `CreateInstance`, `ReadInstance`, `TransitionInstance`, `ReadAudit`.
2. **Manager**
   - *Responsibilities*: Designs workflows and oversees workflow instances, but cannot manage the organization.
   - *Permissions*: `CreateWorkflow`, `ReadWorkflow`, `UpdateWorkflow`, `CreateInstance`, `ReadInstance`, `TransitionInstance`, `ReadAudit`.
3. **Member**
   - *Responsibilities*: Participates in workflows. Can create instances and transition them if they possess the required action permissions.
   - *Permissions*: `ReadWorkflow`, `CreateInstance`, `ReadInstance`, `TransitionInstance`.
4. **Viewer**
   - *Responsibilities*: Read-only access for reporting or auditing purposes.
   - *Permissions*: `ReadWorkflow`, `ReadInstance`, `ReadAudit`.

---

## 3. Multi-Tenancy

FlowForge is a multi-tenant SaaS. The fundamental data isolation boundary is the **Organization**.

### Hierarchy
`Organization` → `Users` → `Workflows` → `Workflow Instances` → `Audit Entries`

### Multi-Tenant Invariant
A user must not be able to read, mutate, or transition any resource belonging to an organization they are not a member of.

**Enforcement Boundary**: Multi-tenancy is an application and infrastructure concern. 
- *Application Layer*: Use cases will explicitly check `OrganizationId` authorization.
- *Infrastructure Layer*: Database queries will enforce tenant isolation (e.g., via `WHERE org_id = ?` or Row-Level Security). The pure domain layer receives pre-filtered, tenant-safe data.
