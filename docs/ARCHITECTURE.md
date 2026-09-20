# FlowForge Architecture

FlowForge is a B2B SaaS application designed to manage and execute state-machine workflows. It strictly implements a layered architecture to isolate business complexity from infrastructure delivery.

## 1. Frontend Architecture
The frontend is a Single Page Application (SPA).
- **React & TypeScript**: Provides strict compile-time safety and component-driven UI.
- **Vite**: Used for highly performant builds and Hot Module Replacement (HMR).
- **Routing**: `react-router-dom` manages navigation. The application is split into public (`/login`) and protected (`/app/*`) routes.
- **Feature Organization**: Code is organized vertically by business feature (`src/features/workflows`, `src/features/instances`, `src/features/auth`) rather than horizontally by type.
- **API Client**: `client.ts` centralizes HTTP calls, automatically injects the JWT Authorization header, and translates raw HTTP failures into normalized `AppError` types.
- **Auth Context**: `AuthContext.tsx` maintains global JWT state using React Context, shielding components from manual `localStorage` parsing.
- **Protected Routes**: `<ProtectedRoute>` intercepts unauthenticated users and seamlessly redirects them to `/login`.

## 2. Backend Architecture
The backend is built in Haskell, heavily utilizing functional programming design patterns.
- **Servant (API Layer)**: Defines the REST endpoints as a type-level DSL (`Handlers.hs`, `Routes.hs`). It strictly maps HTTP errors and requests.
- **DTO Boundary**: API request and response payloads (e.g., `WorkflowDTO`) are strictly isolated from Domain records.
- **Application / Use-Case Layer**: Functions orchestrate business tasks (e.g., `executeWorkflowTransitionUC`). They fetch data via repository ports, invoke the pure domain functions, and persist the results atomically.
- **Domain Layer**: The pure heart of the software. It contains `Workflow`, `WorkflowInstance`, and pure transition/validation logic. It explicitly performs NO IO.
- **Infrastructure / Repository Layer**: Implements PostgreSQL queries (`postgresql-simple`) and maps raw database rows into Domain objects.
- **Dependency Wiring**: Database connection pools and audit repositories are injected into the use cases via the `ReaderT` pattern (`AppEnv`).

## 3. Dependency Direction
Dependencies point **inward** toward the pure Domain (Hexagonal / Clean Architecture).
- **Infrastructure** depends on Application (implementing its Ports) and Domain (mapping database rows to it).
- **Application** depends on Domain.
- **Domain** depends on absolutely nothing outside itself.

## 4. Authentication and Authorization
**Security Boundary Flow:**
Internet -> Public HTTPS ingress -> Application authentication/authorization -> Tenant-scoped application operations -> PostgreSQL

- **JWT Authentication**: Upon login, a stateless JWT is issued and stored in browser `localStorage`.
- **Enforcement**: `servant-auth` cryptographically verifies the token on protected routes.
- **Authorization vs. Authentication**: Authentication identifies the user. Authorization verifies if the user's role (Admin, Manager, Member, Viewer) permits a specific action.
- **Boundary**: Authorization is strictly enforced *inside the Application layer use cases*, never just at the API boundary, ensuring consistent protection of domain operations.

## 5. Multi-Tenancy
- **Tenant Identity**: The authenticated user's `OrganizationId` is securely extracted from the signed JWT context.
- **Tenant Isolation**: The Application layer explicitly passes the `OrganizationId` into every repository query (e.g., `WHERE org_id = ?`).
- **Zero Trust**: The authenticated organization ID is derived from the verified JWT context and is supplied to repository operations so data access is scoped to that organization.

## 6. Workflow Lifecycle
- **Behavior**: Workflows have three lifecycle states: `Draft`, `Active`, and `Archived`.
- **Transitions**: `Draft -> Active` (Activation) and `Active -> Archived` (Archival) are strictly enforced. `Draft -> Archived` or `Archived -> Active` are invalid.
- **Validation**: Activation requires the workflow to be topologically valid (no dangling transitions, duplicate states, missing initials).
- **Permissions**: Only Admins and Managers may create, activate, or archive workflows.

## 7. Instance Lifecycle
- **Instantiation**: Instances can only be created from `Active` workflows.
- **State Transitions**: Instances traverse the state machine as defined by the parent workflow's transitions.
- **Optimistic Concurrency**: `version` integers on instances prevent race conditions. If a race condition occurs, the update yields 0 rows, surfacing as an HTTP 409 to the frontend.

## 8. Audit
- **Atomicity**: The Application layer requires that modifying an instance and recording the audit log occur within a single PostgreSQL transaction (`transactionPort`).
- **Actor Identity**: The audit log persistently records the exact `UserId` and `Role` responsible for the transition.
- **Retrieval**: Audit logs are cleanly exposed to authorized users via the `/audit` sub-resource.

## 9. Error Handling
- **Domain / Application Errors**: The backend returns descriptive internal `AppError` ADTs (e.g., `ConcurrencyConflict`, `DomainFailure`).
- **HTTP Mapping**: `Handlers.hs` maps these to standard HTTP codes (401, 403, 404, 409, 422).
- **Sanitized Errors**: The client receives a generic `ApiErrorWrapper`. Internal database failures yield 500s without leaking stack traces.
- **Diagnostic Logging**: Backend errors are securely serialized and logged to `stderr` with a contextual diagnostic string, deliberately stripping PII (like emails) and database connection payloads. `X-Request-ID` tracing is implemented via WAI middleware.

## 10. Frontend Error Behavior
- **401 Unauthorized**: Clears `localStorage` and redirects to `/login`.
- **403 Forbidden**: Displays an `ErrorState` detailing insufficient permissions.
- **404 Not Found**: Surfaces generic missing resource states.
- **409 Conflict**: Warns the user of a concurrent modification, prompting a refresh.
- **422 Unprocessable Entity**: Validates and displays specific domain rule violations to the user.
- **Network Failures**: Caught and rendered gracefully without crashing the React application tree.

## 11. Testing Strategy
- **Backend Tests**: Evaluated via `cabal test`. Heavily property-based testing on the pure Domain, combined with integration tests hitting a real PostgreSQL database to verify transactions and concurrency.
- **Frontend Behavioral Tests**: React components are tested using `vitest` and `React Testing Library` to verify rendering, form submission, and route protection.
- **Static Analysis**: TypeScript compilation (`npm run typecheck`) and strict production builds (`npm run build`).
- *(Note: There is currently no full-browser E2E suite like Playwright/Cypress implemented)*.

## 12. Deployment Architecture
**CURRENT STATE:**
- Terraform configuration exists and the `plan` has been validated.
- Azure bootstrap state storage exists.
- Main application infrastructure has not yet been applied.
- Application images have not yet been deployed.

**INTENDED ARCHITECTURE:**
This describes the intended Azure architecture. It is not currently live.
- **Frontend Container**: Nginx alpine container serving compiled static assets on port 8080.
- **Backend Container**: Debian slim container running the compiled Haskell backend binary on port 8080.
- **Azure Container Apps**: Serverless container orchestration for public ingress and TLS termination.
- **Azure Container Registry**: Image repository, accessed via a User-Assigned Managed Identity.
- **PostgreSQL Flexible Server**: Scalable relational backend.
- **Terraform**: Infrastructure definition stored in `infrastructure/terraform/`.
- **Remote State**: Securely stored in an Azure Blob Storage container.

## 13. Security Tradeoffs
The architecture implements pragmatic security suited for modern SaaS, recognizing specific constraints:
- **JWT Storage**: JWTs are stored in `localStorage`. While vulnerable to XSS, this is standard for SPAs without a BFF (Backend-for-Frontend) proxy and accepted for this portfolio scope.
- **Secrets Management**: Some secrets are managed via Terraform variables and Azure configurations rather than a dedicated Key Vault.
- **PostgreSQL Firewall**: Azure PostgreSQL relies on network firewalls allowing Azure IPs (`0.0.0.0`) and strong passwords, rather than deploying inside a dedicated Virtual Network (VNet), strictly to optimize baseline costs.
- **TLS Offloading**: The application containers communicate in plaintext HTTP on port 8080 internally, relying entirely on Azure Container Apps for TLS termination at the edge.
