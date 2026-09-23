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
  OrganizationDTO,
  OrganizationMemberDTO,
} from '../types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

const TOKEN_KEY = 'flowforge_token';
const ORG_KEY = 'flowforge_org';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getStoredOrganization(): string | null {
  return localStorage.getItem(ORG_KEY);
}

export function setStoredOrganization(orgId: string): void {
  localStorage.setItem(ORG_KEY, orgId);
}

export function clearStoredOrganization(): void {
  localStorage.removeItem(ORG_KEY);
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
  const org = getStoredOrganization();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const requiresOrg = !path.startsWith('/auth') && path !== '/me' && !path.startsWith('/organizations');
  if (requiresOrg) {
    if (!org) {
      throw new AppError('NO_WORKSPACE', 'Workspace context is required.', 400);
    }
    headers['X-Organization-Id'] = org;
  }

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  let response: Response;
  try {
    const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    response = await fetch(`${cleanBase}${cleanPath}`, {
      ...options,
      headers,
    });
  } catch (err) {
    console.error(`[Network Error] ${options.method || 'GET'} ${path}`, err);
    throw new AppError('NETWORK_ERROR', "We couldn't reach FlowForge. Check your connection and try again.", 0);
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

  try {
    return await response.json() as T;
  } catch (err) {
    console.error('Failed to parse JSON response. Did the server return HTML?', err);
    throw new AppError('PARSE_ERROR', 'Received an invalid response format from the server.', response.status);
  }
}

// --- Auth ---

export async function login(req: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function register(req: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/register', {
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

// --- Organizations ---
export async function listOrganizationMembers(orgId: string): Promise<OrganizationMemberDTO[]>  {
  if (!orgId) throw new AppError('NO_WORKSPACE', 'Workspace context is required.', 400);
  return request<OrganizationMemberDTO[]>(`/organizations/${orgId}/members`);
}
export async function listOrganizations(): Promise<OrganizationDTO[]> {
  return request<OrganizationDTO[]>('/organizations');
}
export async function createOrganization(name: string): Promise<OrganizationDTO> {
  return request<OrganizationDTO>('/organizations', {
    method: 'POST',
    body: JSON.stringify({ name })
  });
}

export async function addOrganizationMember(orgId: string, email: string, role: string): Promise<OrganizationMemberDTO>  {
  if (!orgId) throw new AppError('NO_WORKSPACE', 'Workspace context is required.', 400);
  return request<OrganizationMemberDTO>(`/organizations/${orgId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, role })
  });
}

export async function updateOrganizationMemberRole(orgId: string, userId: string, role: string): Promise<OrganizationMemberDTO>  {
  if (!orgId) throw new AppError('NO_WORKSPACE', 'Workspace context is required.', 400);
  return request<OrganizationMemberDTO>(`/organizations/${orgId}/members/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role })
  });
}

export async function removeOrganizationMember(orgId: string, userId: string): Promise<void>  {
  if (!orgId) throw new AppError('NO_WORKSPACE', 'Workspace context is required.', 400);
  return request<void>(`/organizations/${orgId}/members/${userId}`, {
    method: 'DELETE'
  });
}
