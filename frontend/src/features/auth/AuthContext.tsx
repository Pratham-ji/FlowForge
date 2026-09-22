import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserDTO } from '../../types/api';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';

interface AuthState {
  user: UserDTO | null;
  currentOrg: api.OrganizationDTO | null;
  currentRole: string | null;
  organizations: api.OrganizationDTO[];
  setCurrentOrgId: (id: string) => void;
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
  const [organizations, setOrganizations] = useState<api.OrganizationDTO[]>([]);
  const [currentOrg, setCurrentOrg] = useState<api.OrganizationDTO | null>(null);
  const [currentRole, setCurrentRole] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    api.clearStoredToken();
    api.clearStoredOrganization();
    setUser(null);
    setOrganizations([]);
    setCurrentOrg(null);
    setCurrentRole(null);
  }, []);

  const resolveRole = async (orgId: string, u: UserDTO) => {
    try {
      const members = await api.listOrganizationMembers(orgId);
      const m = members.find(m => m.userId === u.id);
      setCurrentRole(m ? m.role : null);
    } catch {
      setCurrentRole(null);
    }
  };

  const setCurrentOrgId = useCallback(async (id: string) => {
    const org = organizations.find(o => o.id === id);
    if (org) {
      setCurrentOrg(org);
      api.setStoredOrganization(id);
      if (user) {
        await resolveRole(id, user);
      }
    }
  }, [organizations, user]);

  // Restore session on mount
  useEffect(() => {
    api.setUnauthorizedHandler(logout);

    const token = api.getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    async function loadData() {
      try {
        const u = await api.getMe();
        setUser(u);
        const orgs = await api.listOrganizations();
        setOrganizations(orgs);
        const storedOrgId = api.getStoredOrganization();

        let targetOrg = null;
        if (storedOrgId && orgs.find(o => o.id === storedOrgId)) {
          targetOrg = orgs.find(o => o.id === storedOrgId)!;
        } else if (orgs.length > 0) {
          targetOrg = orgs[0];
        }

        if (targetOrg) {
          setCurrentOrg(targetOrg);
          api.setStoredOrganization(targetOrg.id);
          await resolveRole(targetOrg.id, u);
        }
      } catch {
        api.clearStoredToken();
      } finally {
        setIsLoading(false);
      }
    }
    loadData();

    return () => {
      api.setUnauthorizedHandler(null);
    };
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await api.login({ email, password });
      api.setStoredToken(res.token);

      const u = await api.getMe();
      setUser(u);
      const orgs = await api.listOrganizations();
      setOrganizations(orgs);
      if (orgs.length > 0) {
        const targetOrg = orgs[0];
        setCurrentOrg(targetOrg);
        api.setStoredOrganization(targetOrg.id);
        await resolveRole(targetOrg.id, u);
      }
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
      setOrganizations(orgs);
      if (orgs.length > 0) {
        const targetOrg = orgs[0];
        setCurrentOrg(targetOrg);
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
        currentOrg,
        currentRole,
        organizations,
        setCurrentOrgId,
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
