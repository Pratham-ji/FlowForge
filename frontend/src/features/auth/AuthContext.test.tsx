import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as api from '../../api/client';

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return {
    ...actual,
    getStoredToken: vi.fn(),
    setStoredToken: vi.fn(),
    clearStoredToken: vi.fn(),
    getMe: vi.fn(),
    login: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
  };
});

function TestComponent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Unauthenticated'}</div>
      <div data-testid="user-role">{user?.role}</div>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('restores session successfully', async () => {
    vi.mocked(api.getStoredToken).mockReturnValue('fake-token');
    vi.mocked(api.getMe).mockResolvedValue({ id: '1', organizationId: '2', role: 'Admin' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
      expect(screen.getByTestId('user-role')).toHaveTextContent('Admin');
    });
  });

  it('clears token and logs out if session restoration fails', async () => {
    vi.mocked(api.getStoredToken).mockReturnValue('fake-token');
    vi.mocked(api.getMe).mockRejectedValue(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated');
      expect(api.clearStoredToken).toHaveBeenCalled();
    });
  });

  it('registers unauthorized handler that triggers logout', async () => {
    vi.mocked(api.getStoredToken).mockReturnValue('fake-token');
    vi.mocked(api.getMe).mockResolvedValue({ id: '1', organizationId: '2', role: 'Admin' });

    // Capture the registered handler
    let registeredHandler: (() => void) | null = null;
    vi.mocked(api.setUnauthorizedHandler).mockImplementation((handler) => {
      registeredHandler = handler;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    // Simulate a 401 happening globally
    expect(registeredHandler).not.toBeNull();
    act(() => {
      registeredHandler!();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated');
      expect(api.clearStoredToken).toHaveBeenCalled();
    });
  });

  it('clears session on manual logout', async () => {
    vi.mocked(api.getStoredToken).mockReturnValue('fake-token');
    vi.mocked(api.getMe).mockResolvedValue({ id: '1', organizationId: '2', role: 'Admin' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    act(() => {
      screen.getByRole('button', { name: 'Logout' }).click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated');
      expect(api.clearStoredToken).toHaveBeenCalled();
    });
  });
});
