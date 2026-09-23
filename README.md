# FlowForge

Build, run, and improve reliable business workflows without writing code.

*Note: FlowForge is currently transitioning from a prototype into a flexible SaaS platform.*

## Overview
FlowForge is a lightweight, multi-tenant workflow automation platform designed for business teams. It enables teams to define and execute structured processes reliably.

## Current Core Capabilities
- **Multi-Tenancy**: Securely isolated workspaces with hard data boundaries.
- **Role-Based Access Control (RBAC)**: Fine-grained Admin, Manager, Member, and Viewer permissions.
- **Workflow Executions**: Reliable state transitions powered by a backend state machine.
- **Optimistic Concurrency**: Safe concurrent edits preventing lost updates via expected versioning.
- **Audit Trails**: Immutable event logs for every workflow execution.

*Note: The current workflow engine uses a fixed three-state machine (Draft → In Review → Approved). The flexible visual builder and arbitrary graph definitions are planned for the next major release.*

## Technology Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS. Deployed on Cloudflare Workers.
- **Backend**: Haskell, Servant. Deployed on Azure Container Apps.
- **Database**: PostgreSQL (Azure Flexible Server).
- **Infrastructure**: Terraform, Azure Container Registry, Managed Identities.

## Architecture & Security
FlowForge is built on a highly secure foundation:
- All database queries enforce strict tenant isolation using composite identity checks.
- API requests are secured via JWTs and workspace context validation.
- Concurrency collisions yield graceful conflict errors instead of race conditions.

## Roadmap
The next iteration of FlowForge will introduce:
- **Graph-based Workflow Engine**: Define arbitrary nodes and edges (Triggers, Approvals, Webhooks).
- **Visual Builder**: A drag-and-drop canvas for building workflows.
- **Immutable Versioning**: Drafts, Publishing, and execution tied to frozen versions.
- **Templates**: Ready-to-use business processes.
- **Cross-Workflow Analytics**: High-level views of active runs, blocked tasks, and execution times.

*(Currently, FlowForge does NOT feature AI generation, billing/Stripe integration, enterprise SSO, or arbitrary API integrations).*

## Local Development
*(Refer to individual READMEs in `frontend/` and `backend/` for setup instructions).*
