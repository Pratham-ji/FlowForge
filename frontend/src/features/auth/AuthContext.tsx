import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { UserDTO } from '../../types/api';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';

interface AuthState {
  user: UserDTO | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logout = useCallback(() => {
    api.clearStoredToken();
    setUser(null);
  }, []);

  // Restore session on mount
  useEffect(() => {
    api.setUnauthorizedHandler(logout);

    const token = api.getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.getMe()
      .then(setUser)
      .catch(() => {
        api.clearStoredToken();
      })
      .finally(() => setIsLoading(false));

    return () => {
      api.setUnauthorizedHandler(null);
    };
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await api.login({ email, password });
      api.setStoredToken(res.token);
      setUser(res.user);
    } catch (err) {
      if (err instanceof AppError && err.isUnauthorized) {
        setError('Invalid email or password.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
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
