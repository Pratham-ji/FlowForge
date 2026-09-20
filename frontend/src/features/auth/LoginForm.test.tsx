import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';
import { AuthProvider } from './AuthContext';
import { MemoryRouter } from 'react-router-dom';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return {
    ...actual,
    login: vi.fn(),
    getStoredToken: vi.fn(),
    setStoredToken: vi.fn(),
    clearStoredToken: vi.fn(),
    setUnauthorizedHandler: vi.fn(),
    getMe: vi.fn().mockRejectedValue(new Error('no token')),
  };
});

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderForm = () =>
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginForm />
        </AuthProvider>
      </MemoryRouter>
    );

  it('renders email and password fields', () => {
    renderForm();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('displays error message on failed login', async () => {
    const user = userEvent.setup();
    // Simulate 401 error
    vi.mocked(api.login).mockRejectedValue(new AppError('UNAUTHORIZED', 'Invalid email or password', 401));

    renderForm();

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i);
    });
  });

  it('displays client side validation errors', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.type(screen.getByLabelText(/password/i), 'short');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/please enter a valid email address/i);
    });

    await user.clear(screen.getByLabelText(/email address/i));
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/password must be at least 6 characters long/i);
    });
  });

  it('calls login api and updates state on success', async () => {
    const user = userEvent.setup();
    vi.mocked(api.login).mockResolvedValue({
      token: 'fake-jwt',
      user: { id: '1', organizationId: '1', role: 'Admin' },
    });

    renderForm();

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password' });
    });
  });
});
