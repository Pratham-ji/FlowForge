# FlowForge

A robust multi-tenant workflow orchestration platform ensuring predictable state transitions and an immutable execution history.

## Live Demo
*Frontend deployed to Netlify, backend on Azure Container Apps.*

## What It Does

FlowForge allows organizations to design explicit state-machine workflows and execute them with confidence. It bridges the gap between fragmented automation scripts and rigid BPMN tools by providing typed workflow definitions, strongly-enforced state transitions, and an atomic audit log of every execution step.

## Why I Built It

Automation logic often becomes fragmented across queues, scripts, and application code, making it impossible to know the true state of a process. I built FlowForge to centralize workflow orchestration behind a pure, typed domain model that guarantees execution reliability and complete observability, even in distributed environments.

## Core Features

- **Workflow Definitions:** Define strict states and allowed transitions.
- **Controlled Execution:** Create instances and safely transition them between valid states.
- **Tenant Isolation:** Complete data separation boundary by organization.
- **Role-Based Access Control:** Fine-grained authorization based on organization membership (Admin, Manager, Member, Viewer).
- **Atomic Audit Trail:** Every state change is immutably logged in the same transaction as the transition.
- **Optimistic Concurrency:** Protects against race conditions and lost updates during parallel executions.

## Architecture

```text
  React / Vite SPA (Netlify)
           │
           │ HTTPS / JSON
           ▼
  Haskell / Servant API (Azure Container Apps)
           │
           ▼
    Application Layer
           │
           ▼
  Pure Functional Domain
           │
           ▼
 PostgreSQL (Azure Flexible Server)
```

FlowForge implements Clean Architecture. The **Domain** contains purely functional state machine rules with zero I/O. The **Application** layer enforces organization-based multi-tenancy and authorization. The **Infrastructure** boundary handles JWT authentication, Servant API delivery, and PostgreSQL persistence with transaction-scoped audit logging.

## Tech Stack

**Frontend:**
- React (Hooks, Context)
- TypeScript
- Vite
- Tailwind CSS

**Backend:**
- Haskell
- Servant (REST API DSL)
- PostgreSQL (postgresql-simple)

**Infrastructure:**
- Docker
- Terraform
- Azure Container Apps / ACR
- Netlify

## Security / Multi-tenancy

- **Tenant Isolation:** Every protected resource is strictly scoped to an `OrganizationId`. Cross-tenant data leakage is structurally prevented at the repository layer.
- **Organization Membership:** Authorization is verified against canonical roles (`Admin`, `Manager`, `Member`, `Viewer`) securely looked up in the database on every request, never trusting frontend hints.
- **Concurrency Protection:** Optimistic concurrency via `expectedVersion` integers prevents race conditions during distributed workflow execution.
- **Auditability:** Immutably tracked state transitions provide complete visibility into process execution.
- **Authentication:** Stateless JWTs with secure bcrypt password hashing.

## Project Structure

```
frontend/          # React/Vite SPA and Tailwind configuration
  src/
    api/           # Strongly-typed fetch client handling errors/CORS
    features/      # Domain-driven React component boundaries
    pages/         # Route components
    routes/        # React Router configuration
backend/           # Haskell Servant API and pure domain logic
  src/
    FlowForge/
      Domain/        # Pure state-machine logic
      Application/   # Use cases, authorization, and ports
      Infrastructure/# PostgreSQL repositories, Auth, and external I/O
      Api/           # Servant endpoints and JSON DTOs
infrastructure/
  terraform/       # Azure resource definitions (Container Apps, DB)
docs/              # Architectural Decision Records (ADRs) and specs
```

## Local Development

**Backend (Requires GHC/Cabal and PostgreSQL):**
```bash
cd backend
cabal build
cabal run
```

**Frontend (Requires Node.js):**
```bash
cd frontend
npm install
npm run dev
```

**Docker Compose (Full Stack Integration):**
```bash
docker compose up --build
```

## Testing

Verification metrics from the automated test suites:

- **Backend:** 52/52 tests passed (`cabal test`) — Uses property-based testing (QuickCheck) to verify pure domain state transitions alongside PostgreSQL integration tests.
- **Frontend:** 46/46 tests passed (`npm test -- --run`) — Uses React Testing Library for behavioral DOM assertions.
- **TypeScript:** 0 errors (`npm run typecheck`)

## Deployment

- **Frontend:** Built via Vite (`npm run build`) and deployed to a global CDN (Netlify) as static HTML/JS/CSS assets.
- **Backend:** Containerized via a multi-stage Dockerfile, pushed to Azure Container Registry (ACR), and orchestrated on Azure Container Apps behind secure HTTPS ingress.
- **Database:** Fully managed Azure PostgreSQL Flexible Server with migrations applied sequentially.
- **Infrastructure:** Provisioned via Terraform state and variables.

## Screenshots

*(Deployment pending: Screenshots of the Landing Page, Dashboard, Workflow Editor, and Audit Log will be added here once the public environment is provisioned).*

## Engineering Highlights

- **Haskell Domain Modeling:** The core workflow engine is written in Haskell, leveraging algebraic data types (ADTs) to make invalid state transitions unrepresentable at compile time.
- **Typed API Contract:** The REST API is defined using Servant, guaranteeing that the HTTP routing, request parsing, and response serialization perfectly match the application types.
- **Transaction-Scoped Audit Logging:** Repository layers execute within `withTransaction` blocks, guaranteeing that a workflow state change and its corresponding audit log either succeed together or fail together.
- **Error Mapping:** Internal domain errors and SQL exceptions are securely mapped to generic HTTP statuses (e.g., 409 Conflict, 403 Forbidden) without leaking stack traces or database schema details to the client.
- **Frontend Error Boundaries:** The React architecture employs global Error Boundaries to gracefully catch rendering crashes and present a recovery UI instead of a white screen.

## License

MIT License
