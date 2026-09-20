# FlowForge API Contract (v1)

This document defines the HTTP API contract for FlowForge, serving as the boundary between the React frontend and the Haskell backend.

## 1. Authentication Model

FlowForge uses **JWT Bearer Authentication**.
- **Header**: `Authorization: Bearer <token>`
- **Token Contents**: The JWT payload securely encodes the authenticated principal:
  ```json
  {
    "userId": "uuid",
    "organizationId": "uuid",
    "role": "Admin | Manager | Member | Viewer"
  }
  ```
- **Tenant Isolation**: The `organizationId` in the JWT is the authoritative tenant boundary. A client cannot override this via request parameters. Any attempt to access a resource belonging to a different organization will result in a `404 Not Found` to prevent leaking cross-tenant existence.

## 2. Standard Error Contract

All API errors follow a consistent, machine-readable JSON structure.
Internal stack traces, SQL errors, and Haskell-specific exceptions are **never** leaked to the client.

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message suitable for debugging, but not necessarily UI display."
  }
}
```

### Common HTTP Status Codes
- `200 OK` / `201 Created`: Success
- `400 Bad Request`: Malformed JSON or invalid syntax.
- `401 Unauthorized`: Missing, invalid, or expired JWT.
- `403 Forbidden`: Authenticated, but lacks the necessary `Permission`.
- `404 Not Found`: Resource does not exist or belongs to another organization.
- `409 Conflict`: Optimistic concurrency failure or invalid lifecycle operation.
- `422 Unprocessable Entity`: Domain validation failure (e.g. invalid transition).
- `500 Internal Server Error`: Unexpected infrastructure failure.

## 3. Endpoints

### 3.1 Authentication

#### `POST /api/v1/auth/login`
- **User goal**: Authenticate a user to receive an access token for subsequent API calls.
- **Success**: Valid credentials return a JWT token and user profile (200 OK).
- **Failure**: Invalid credentials return 401 Unauthorized. Malformed requests return 400 Bad Request.
- **Authorization**: Public endpoint.
- **Tenant**: Authenticated organization is inherently bound to the token upon success.
- **Success criteria**: Secure extraction of JWT for frontend usage; no password hashes are exposed.
- **Request**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response**:
  ```json
  {
    "token": "eyJhbG...",
    "user": {
      "id": "uuid",
      "organizationId": "uuid",
      "role": "Member"
    }
  }
  ```

#### `GET /api/v1/me`
- **User goal**: Fetch the currently authenticated user's profile and permissions.
- **Success**: Returns the user profile encoded in the current token (200 OK).
- **Failure**: Invalid/missing token returns 401 Unauthorized.
- **Authorization**: Requires any valid JWT.
- **Tenant**: Returns the organization bound to the current token.
- **Success criteria**: Frontend can reliably determine user context and tenant.
- **Response**:
  ```json
  {
    "id": "uuid",
    "organizationId": "uuid",
    "role": "Member"
  }
  ```

### 3.2 Workflows

#### `GET /api/v1/workflows`
- **User goal**: List all workflows belonging to the authenticated organization.
- **Success**: Returns an array of workflow summaries (200 OK). Returns `[]` if no workflows exist.
- **Failure**: Invalid/missing token returns 401 Unauthorized.
- **Authorization**: Requires `ReadWorkflow` permission.
- **Tenant**: Only workflows belonging to the authenticated organization are returned. The organization is derived exclusively from the JWT — no client-supplied org ID.
- **Success criteria**: Tenant-scoped list with no cross-tenant data leakage.
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "name": "Purchase Order Approval",
      "lifecycle": "Draft",
      "initialStateId": "uuid",
      "states": [
        {
          "id": "uuid",
          "name": "Draft",
          "isTerminal": false
        }
      ],
      "transitions": [
        {
          "id": "uuid",
          "sourceStateId": "uuid",
          "targetStateId": "uuid",
          "action": "Submit",
          "requiredPermission": "TransitionInstance"
        }
      ]
    }
  ]
  ```

#### `POST /api/v1/workflows`
- **User goal**: Create a new draft workflow defining states and transitions.
- **Success**: Draft workflow is persisted and the new aggregate is returned (201 Created).
- **Failure**: Invalid workflow semantics (e.g. disconnected states) return 422 Unprocessable Entity.
- **Authorization**: Requires `CreateWorkflow` permission.
- **Tenant**: Authenticated organization must match the workflow's organization context.
- **Success criteria**: Workflows are securely created under the correct tenant boundary.
- **Request**:
  ```json
  {
    "name": "Purchase Order Approval",
    "initialStateId": "uuid",
    "states": [
      { "id": "uuid", "name": "Draft", "isTerminal": false }
    ],
    "transitions": [
      {
        "id": "uuid",
        "sourceStateId": "uuid",
        "targetStateId": "uuid",
        "action": "Submit",
        "requiredPermission": "TransitionInstance"
      }
    ]
  }
  ```

#### `GET /api/v1/workflows/:workflowId`
- **User goal**: Retrieve a specific workflow definition to inspect its states and rules.
- **Success**: The full workflow aggregate is returned (200 OK).
- **Failure**: Non-existent workflow returns 404 Not Found.
- **Authorization**: Requires `ReadWorkflow` permission.
- **Tenant**: Authenticated organization must own the workflow. Mismatched org returns 404.
- **Success criteria**: Users can view their workflows; cross-tenant workflows are invisible.

#### `POST /api/v1/workflows/:workflowId/activate`
- **User goal**: Mark a draft workflow as active, allowing instances to be spawned.
- **Success**: Workflow lifecycle changes to Active (200 OK).
- **Failure**: If already active or archived, returns 409 Conflict.
- **Authorization**: Requires `UpdateWorkflow` permission.
- **Tenant**: Authenticated organization must own the workflow.
- **Success criteria**: Only legally structured workflows can be activated.

#### `POST /api/v1/workflows/:workflowId/archive`
- **User goal**: Archive an active workflow to prevent new instances from being created.
- **Success**: Workflow lifecycle changes to Archived (200 OK).
- **Failure**: If already archived, returns 409 Conflict.
- **Authorization**: Requires `UpdateWorkflow` permission.
- **Tenant**: Authenticated organization must own the workflow.
- **Success criteria**: Prevents new instances while preserving existing historical instances.

### 3.3 Instances

#### `GET /api/v1/workflows/:workflowId/instances`
- **User goal**: List all instances of a specific workflow.
- **Success**: Returns an array of instance summaries (200 OK). Returns `[]` if no instances exist.
- **Failure**: Non-existent or cross-tenant workflow returns 404 Not Found.
- **Authorization**: Requires `ReadInstance` permission.
- **Tenant**: The workflow must belong to the authenticated organization. Instances are scoped to both the workflow and the organization at the SQL level.
- **Success criteria**: Cross-tenant workflow IDs return 404 to prevent existence leakage.
- **Response**:
  ```json
  [
    {
      "id": "uuid",
      "workflowId": "uuid",
      "currentStateId": "uuid",
      "createdBy": "uuid",
      "version": 1
    }
  ]
  ```

#### `POST /api/v1/workflows/:workflowId/instances`
- **User goal**: Spawn a new instance of an active workflow.
- **Success**: A new instance is created at the workflow's initial state with version 1 (201 Created).
- **Failure**: If workflow is draft or archived, returns 422 Unprocessable Entity.
- **Authorization**: Requires `CreateInstance` permission.
- **Tenant**: Authenticated organization must own the workflow.
- **Success criteria**: Instance is cleanly tracked under the authenticated tenant.
- **Response**:
  ```json
  {
    "id": "uuid",
    "workflowId": "uuid",
    "currentStateId": "uuid",
    "createdBy": "uuid",
    "version": 1
  }
  ```

#### `GET /api/v1/instances/:instanceId`
- **User goal**: Check the current state and version of a specific instance.
- **Success**: Returns the instance details and current state (200 OK).
- **Failure**: Non-existent instance returns 404 Not Found.
- **Authorization**: Requires `ReadInstance` permission.
- **Tenant**: Authenticated organization must own the instance. Mismatched org returns 404.
- **Success criteria**: Cross-tenant instances are safely isolated.

#### `POST /api/v1/instances/:instanceId/transition`
- **User goal**: Move a workflow instance to its next valid state.
- **Success**: Instance state and audit record are persisted atomically (200 OK).
- **Failure**: Invalid transition returns 422 Unprocessable Entity and state remains unchanged.
- **Concurrency**: Stale version returns 409 Conflict and does not mutate state.
- **Authorization**: Requires `TransitionInstance` permission.
- **Tenant**: Authenticated organization must own the instance.
- **Success criteria**: The entire instance mutation + audit operation remains atomic under concurrent load.
- **Request**:
  ```json
  {
    "action": "Submit"
  }
  ```

#### `GET /api/v1/instances/:instanceId/audit`
- **User goal**: View the historical transition log of an instance.
- **Success**: Returns an ordered list of all state changes for the instance (200 OK).
- **Failure**: Non-existent instance returns 404 Not Found.
- **Authorization**: Requires `ReadAudit` permission.
- **Tenant**: Authenticated organization must own the instance.
- **Success criteria**: Provides an immutable, append-only history of instance progress.
- **Response**:
  ```json
  [
    {
      "actorId": "uuid",
      "previousStateId": "uuid",
      "action": "Submit",
      "resultingStateId": "uuid",
      "timestamp": "2026-09-19T21:00:00Z"
    }
  ]
  ```
