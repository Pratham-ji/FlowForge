// Backend DTO types — must match the actual Haskell API contract exactly.

export type Role = 'Admin' | 'Manager' | 'Member' | 'Viewer';
export type Lifecycle = 'Draft' | 'Active' | 'Archived';

// --- Response DTOs ---

export interface UserDTO {
  id: string;
}

export interface AuthResponse {
  token: string;
  user: UserDTO;
}

export interface WorkflowDTO {
  id: string;
  organizationId: string;
  name: string;
  lifecycle: Lifecycle;
  initialStateId: string;
  states: StateDefinitionDTO[];
  transitions: TransitionDefinitionDTO[];
}

export interface WorkflowInstanceDTO {
  id: string;
  workflowId: string;
  currentStateId: string;
  createdBy: string;
  version: number;
}

export interface AuditEventDTO {
  actorId: string;
  previousStateId: string;
  action: string;
  resultingStateId: string;
}

// --- Request DTOs ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface StateDefinitionDTO {
  id: string;
  name: string;
  isTerminal: boolean;
}

export interface TransitionDefinitionDTO {
  id: string;
  sourceStateId: string;
  targetStateId: string;
  action: string;
  requiredPermission: string;
}

export interface CreateWorkflowRequest {
  name: string;
  initialStateId: string;
  states: StateDefinitionDTO[];
  transitions: TransitionDefinitionDTO[];
}

export interface ExecuteTransitionRequest {
  action: string;
  expectedVersion: number;
}

// --- Error Contract ---

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
