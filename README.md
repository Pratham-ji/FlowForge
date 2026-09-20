# FlowForge

FlowForge is a B2B SaaS application designed to manage and execute state-machine workflows with strict role-based access control and atomic audit logging.

## Overview

FlowForge provides a robust platform for managing workflow lifecycles. It supports defining workflows as strict state machines and instantiating them for execution. The system features:

- Strict workflow definitions (states and transitions)
- Instantiated workflow execution
- Controlled state transitions with optimistic concurrency
- Role-based authorization (Admin, Manager, Member, Viewer)
- Tenant isolation by organization
- Atomic state transitions coupled with immutable audit events

## Architecture

```text
       Internet
          │
          ▼
Public HTTPS Frontend
          │
          ▼
  Public HTTPS API
          │
          ▼
Application / Use Cases
          │
          ▼
        Domain
          │
          ▼
      PostgreSQL
```

- **Frontend:** React + TypeScript + Vite
- **Backend:** Haskell + Servant
- **Database:** PostgreSQL
- **Infrastructure:** Docker + Terraform + Azure Container Apps

*(Note: The Terraform infrastructure-as-code is fully defined and validated, but Azure deployment is not currently live.)*

## Key Engineering Decisions

- **Domain/Application/Infrastructure Separation:** Implements a strict Clean Architecture boundary. The domain contains purely functional state machine rules with no IO.
- **Repository Ports:** Database access is abstracted behind Application-layer interfaces.
- **JWT Authentication:** Stateless, verifiable tokens managed via the API boundary.
- **Use-Case Authorization:** Permissions are strictly enforced within the Application layer use cases, securely isolating business operations.
- **Tenant Isolation:** Explicit organization ID filtering enforced at the repository level, preventing cross-tenant data leakage.
- **Optimistic Concurrency:** Instance transitions utilize `version` integers to prevent race conditions and lost updates.
- **Atomic Transition & Audit:** Instance updates and their corresponding audit logs are committed within a single PostgreSQL transaction.
- **Safe Error Mapping:** Internal domain and persistence failures are safely translated to HTTP status codes without leaking stack traces or SQL details.
- **Request IDs:** Distributed tracing IDs are injected into logging contexts via WAI middleware.
- **Dockerized Deployment:** The application relies on explicitly defined, multi-stage Dockerfiles with native health checks.

See the [Architecture Decision Records (ADRs)](docs/adr/) for detailed context.

## Features

- User Authentication
- Workflow creation
- Workflow activation
- Workflow archival
- Workflow instance creation
- Instance transitions
- Optimistic concurrency conflict resolution
- Audit history tracking
- Role-based permissions
- Tenant isolation
- Graceful error states and network handling
- Responsive design and accessibility considerations

## API

The backend exposes strongly typed REST endpoints via the Servant DSL.

For the comprehensive API contract, see:
[API Documentation](docs/API.md)

## Testing

Verification metrics from the automated test suites:

- **Backend:** 52/52 tests passed
- **Frontend:** 46/46 tests passed

The backend test suite heavily utilizes **property-based testing** (QuickCheck/Hspec) to rigorously verify domain state transitions, alongside **PostgreSQL integration tests** to validate repository mapping and concurrency constraints.

Additional verifications:
- TypeScript strict typecheck (`npm run typecheck`)
- Production frontend build validation
- Backend Haskell compilation
- Trailing whitespace verification (`git diff --check`)

*Note: Full browser E2E testing is not currently included.*

## Local Development

### Backend (Haskell)
Requires GHC and Cabal.
Ensure PostgreSQL is running locally, then initialize the database.
```bash
cd backend
cabal build
cabal run
```

### Frontend (React/Vite)
Requires Node.js.
```bash
cd frontend
npm install
npm run dev
```

### Docker
To run the entire stack locally with Docker Compose:
```bash
docker compose up --build
```

## Configuration

Configuration is provided via environment variables. Refer to the respective `.env.example` files in the `frontend/` and `backend/` directories.

- **`VITE_API_BASE_URL`**: Sets the base URL for the frontend API client.
- **`CORS_ALLOWED_ORIGIN`**: Restricts the backend CORS policy to a specific frontend origin.
- **`DATABASE_URL`**: Connection string for PostgreSQL.
- **`JWT_SECRET`**: Secret key for signing authentication tokens.

*Important: Never commit real credentials to `.env` files.*

## Deployment Architecture

**CURRENT STATE:**
- Terraform configuration and plan exist in `infrastructure/terraform/`.
- Azure bootstrap remote state exists.
- Main application infrastructure has not yet been applied.

**INTENDED ARCHITECTURE:**
The intended public deployment architecture is:
- **Frontend:** Netlify-hosted React/Vite SPA with public HTTPS access.
- **Backend:** Azure Container Apps with public HTTPS ingress.
- **Database:** Azure PostgreSQL Flexible Server accessed by the backend.
- **Registry:** Azure Container Registry.
- **Observability:** Azure Log Analytics.
- **Infrastructure:** Terraform with Azure Blob Storage remote state.

*(Note: The Dockerized frontend and backend configuration in `docker-compose.yml` is maintained as the local/full-stack container deployment option).*

## Security Considerations

The architecture embraces specific pragmatic tradeoffs:
- **JWT localStorage:** Tokens are persisted in browser `localStorage`. (If strict compliance is required, an HttpOnly cookie strategy should be implemented).
- **CORS Restriction:** Production configuration defaults to blocking cross-origin requests unless explicitly whitelisted via `CORS_ALLOWED_ORIGIN`.
- **Tenant Scoping:** Relying on organization claims securely embedded within the JWT.
- **Sanitized Errors:** Internal application and database errors are scrubbed before reaching the HTTP boundary.
- **Safe Diagnostic Logging:** Operational diagnostics strictly exclude PII or credentials.
- **Terraform State Protection:** Remote Terraform state is authenticated via Azure AD.
- **PostgreSQL Network/Firewall Tradeoff:** PostgreSQL access is currently controlled through the Azure PostgreSQL firewall configuration defined in Terraform (allowing `0.0.0.0` for Azure services). This is a cost-conscious alternative to a dedicated VNet/private networking design for this project.

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [API Design](docs/API.md)
- [Database Schema](docs/DATABASE.md)
- [Domain Model](docs/DOMAIN.md)
- [Docker Architecture](docs/docker.md)
- [Configuration Guide](docs/configuration.md)
- [Azure Deployment Architecture](docs/azure-architecture.md)
- [Architecture Decision Records (ADR)](docs/adr/)

## Project Status

Application implementation is complete and locally verified. Azure application infrastructure is configured in Terraform but has not yet been applied. Public deployment is the next deployment phase.
