import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProtectedRoute } from './ProtectedRoute';
import { AuthProvider } from '../features/auth/AuthContext';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import * as api from '../api/client';

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/client')>();
  return {
    ...actual,
    getStoredToken: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
    getMe: vi.fn(),
    listOrganizations: vi.fn(),
    listOrganizationMembers: vi.fn(),
    getStoredOrganization: vi.fn(),
    setStoredOrganization: vi.fn(),
    clearStoredOrganization: vi.fn(),
  };
});

describe('ProtectedRoute', () => {
  it('shows loading state initially if token exists', () => {
    vi.mocked(api.getStoredToken).mockReturnValue('fake-token');
    // Don't resolve getMe yet so it stays loading
    vi.mocked(api.getMe).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <Routes>
            <Route path="/protected" element={<ProtectedRoute><div>Protected Content</div></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getAllByRole('status', { name: /loading/i })[0]).toBeInTheDocument();
  });

  it('redirects to login if unauthenticated', async () => {
    vi.mocked(api.getStoredToken).mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route path="/protected" element={<ProtectedRoute><div>Protected Content</div></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('renders children if authenticated', async () => {
    vi.mocked(api.getStoredToken).mockReturnValue('fake-token');
    vi.mocked(api.getMe).mockResolvedValue({ id: '1' });
    vi.mocked(api.listOrganizations).mockResolvedValue([{ id: 'org1', name: 'Org 1' }]);
    vi.mocked(api.listOrganizationMembers).mockResolvedValue([{ userId: '1', role: 'Admin' }]);
    vi.mocked(api.getStoredOrganization).mockReturnValue('org1');

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <Routes>
            <Route path="/protected" element={<ProtectedRoute><div>Protected Content</div></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
