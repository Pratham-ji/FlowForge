import { normalizeError, AppError } from './errors';
import type {
  AuthResponse,
  LoginRequest,
  UserDTO,
  WorkflowDTO,
  WorkflowInstanceDTO,
  AuditEventDTO,
  CreateWorkflowRequest,
  ExecuteTransitionRequest,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const TOKEN_KEY = 'flowforge_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (err) {
    console.error(`[Network Error] ${options.method || 'GET'} ${path}`, err);
    throw new AppError('NETWORK_ERROR', 'Failed to connect to the server.', 0);
  }

  if (!response.ok) {
    const error = await normalizeError(response);
    console.error(`[API Error] ${options.method || 'GET'} ${path} - ${error.status}: ${error.code} - ${error.message}`);
    if (error.isUnauthorized && unauthorizedHandler && path !== '/auth/login') {
      unauthorizedHandler();
    }
    throw error;
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// --- Auth ---

export async function login(req: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function getMe(): Promise<UserDTO> {
  return request<UserDTO>('/me');
}

// --- Workflows ---

export async function listWorkflows(): Promise<WorkflowDTO[]> {
  return request<WorkflowDTO[]>('/workflows');
}

export async function getWorkflow(id: string): Promise<WorkflowDTO> {
  return request<WorkflowDTO>(`/workflows/${id}`);
}

export async function createWorkflow(req: CreateWorkflowRequest): Promise<WorkflowDTO> {
  return request<WorkflowDTO>('/workflows', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function activateWorkflow(id: string): Promise<WorkflowDTO> {
  return request<WorkflowDTO>(`/workflows/${id}/activate`, { method: 'POST' });
}

export async function archiveWorkflow(id: string): Promise<WorkflowDTO> {
  return request<WorkflowDTO>(`/workflows/${id}/archive`, { method: 'POST' });
}

// --- Instances ---

export async function listInstances(workflowId: string): Promise<WorkflowInstanceDTO[]> {
  return request<WorkflowInstanceDTO[]>(`/workflows/${workflowId}/instances`);
}

export async function createInstance(workflowId: string): Promise<WorkflowInstanceDTO> {
  return request<WorkflowInstanceDTO>(`/workflows/${workflowId}/instances`, { method: 'POST' });
}

export async function getInstance(id: string): Promise<WorkflowInstanceDTO> {
  return request<WorkflowInstanceDTO>(`/instances/${id}`);
}

export async function executeTransition(
  instanceId: string,
  req: ExecuteTransitionRequest,
): Promise<WorkflowInstanceDTO> {
  return request<WorkflowInstanceDTO>(`/instances/${instanceId}/transition`, {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

// --- Audit ---

export async function getAuditEvents(instanceId: string): Promise<AuditEventDTO[]> {
  return request<AuditEventDTO[]>(`/instances/${instanceId}/audit`);
}
