import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserDTO, OrganizationDTO } from '../../types/api';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';

interface AuthState {
  user: UserDTO | null;
  currentWorkspace: OrganizationDTO | null;
  currentRole: string | null;
  workspaces: OrganizationDTO[];
  setCurrentWorkspaceId: (id: string) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [workspaces, setWorkspaces] = useState<OrganizationDTO[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<OrganizationDTO | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    api.clearStoredToken();
    api.clearStoredOrganization();
    setUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
    setCurrentRole(null);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const resolveRole = async (orgId: string, u: UserDTO) => {
    try {
      if (!orgId) {
        setCurrentRole(null);
        return;
      }
      const members = await api.listOrganizationMembers(orgId);
      const m = members.find(m => m.userId === u.id);
      setCurrentRole(m ? m.role : null);
    } catch {
      setCurrentRole(null);
    }
  };

  const setCurrentWorkspaceId = useCallback(async (id: string) => {
    const org = workspaces.find(o => o.id === id);
    if (org) {
      setCurrentWorkspace(org);
      api.setStoredOrganization(id);
      if (user) {
        await resolveRole(id, user);
      }
    } else {
      // Invalid workspace selection
      setCurrentWorkspace(null);
      api.clearStoredOrganization();
      setCurrentRole(null);
    }
  }, [workspaces, user]);

  const initializeWorkspaces = async (u: UserDTO) => {
    const orgs = await api.listOrganizations();
    setWorkspaces(orgs);
    const storedOrgId = api.getStoredOrganization();

    let targetOrg = null;
    if (storedOrgId && orgs.find(o => o.id === storedOrgId)) {
      targetOrg = orgs.find(o => o.id === storedOrgId)!;
    } else if (orgs.length > 0) {
      targetOrg = orgs[0];
    }

    if (targetOrg) {
      setCurrentWorkspace(targetOrg);
      api.setStoredOrganization(targetOrg.id);
      await resolveRole(targetOrg.id, u);
    } else {
      setCurrentWorkspace(null);
      api.clearStoredOrganization();
      setCurrentRole(null);
    }
    return orgs;
  };

  // Restore session on mount
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      // Triggered by API on 401
      clearSession();
    });

    const token = api.getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function loadData() {
      try {
        const u = await api.getMe();
        setUser(u);
        await initializeWorkspaces(u);
      } catch (err) {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    return () => {
      api.setUnauthorizedHandler(null);
    };
  }, [clearSession]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await api.login({ email, password });
      api.setStoredToken(res.token);

      const u = await api.getMe();
      setUser(u);
      await initializeWorkspaces(u);
    } catch (err) {
      if (err instanceof AppError && err.isUnauthorized) {
        setError('Invalid email or password.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      throw err;
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await api.register({ email, password });
      api.setStoredToken(res.token);

      const u = await api.getMe();
      setUser(u);

      let orgs = await api.listOrganizations();
      if (orgs.length === 0) {
        await api.createOrganization("My Workspace");
        orgs = await api.listOrganizations();
      }

      setWorkspaces(orgs);
      if (orgs.length > 0) {
        const targetOrg = orgs[0];
        setCurrentWorkspace(targetOrg);
        api.setStoredOrganization(targetOrg.id);
        await resolveRole(targetOrg.id, u);
      }
    } catch (err) {
      setError('Registration failed. The email might already be in use.');
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        currentWorkspace,
        currentRole,
        workspaces,
        setCurrentWorkspaceId,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
