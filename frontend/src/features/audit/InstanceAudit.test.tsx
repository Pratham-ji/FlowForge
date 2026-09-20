import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InstanceAudit } from './InstanceAudit';
import { AuthProvider } from '../auth/AuthContext';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return {
    ...actual,
    getStoredToken: vi.fn(),
    getMe: vi.fn(),
    listOrganizations: vi.fn(),
    listOrganizationMembers: vi.fn(),
    getStoredOrganization: vi.fn(),
    setStoredOrganization: vi.fn(),
    clearStoredOrganization: vi.fn(),
    getInstance: vi.fn(),
    getWorkflow: vi.fn(),
    getAuditEvents: vi.fn(),
  };
});

describe('InstanceAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getStoredToken).mockReturnValue('fake-token');
    vi.mocked(api.getMe).mockResolvedValue({ id: '1' });
    vi.mocked(api.listOrganizations).mockResolvedValue([{ id: 'org1', name: 'Org 1' }]);
    vi.mocked(api.listOrganizationMembers).mockResolvedValue([{ userId: '1', role: 'Admin' }]);
    vi.mocked(api.getStoredOrganization).mockReturnValue('org1');
  });

  const renderComponent = (path = '/app/instances/inst1/audit') =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path="/app/instances/:instanceId/audit" element={<InstanceAudit />} />
            <Route path="/app/instances/:instanceId" element={<div>Instance Detail Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

  const mockInst = { id: 'inst1', workflowId: 'wf1', currentStateId: 's2', createdBy: 'u1', version: 2 };
  const mockWf = {
    id: 'wf1', name: 'Test WF', lifecycle: 'Active' as const, organizationId: 'org1', initialStateId: 's1',
    states: [
      { id: 's1', name: 'Draft', isTerminal: false },
      { id: 's2', name: 'Approved', isTerminal: true }
    ],
    transitions: []
  };

  it('renders loading state initially', () => {
    vi.mocked(api.getInstance).mockReturnValue(new Promise(() => {}));
    renderComponent();
    expect(screen.getAllByRole('status')[0]).toBeInTheDocument();
  });

  it('renders empty state if no events', async () => {
    vi.mocked(api.getInstance).mockResolvedValue(mockInst);
    vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
    vi.mocked(api.getAuditEvents).mockResolvedValue([]);

    renderComponent();
    expect(await screen.findByText('No audit events')).toBeInTheDocument();
  });

  it('renders audit events and resolves human-readable state names', async () => {
    vi.mocked(api.getInstance).mockResolvedValue(mockInst);
    vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
    vi.mocked(api.getAuditEvents).mockResolvedValue([
      { actorId: 'user-xyz', previousStateId: 's1', action: 'approve', resultingStateId: 's2' }
    ]);

    renderComponent();

    expect(await screen.findByText('user-xyz')).toBeInTheDocument();
    expect(screen.getByText('approve')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('handles 404 cleanly', async () => {
    vi.mocked(api.getInstance).mockRejectedValue(new AppError('NOT_FOUND', 'Instance not found', 404));
    renderComponent();
    expect(await screen.findByText('Instance not found.')).toBeInTheDocument();
  });

  it('handles 403 authorization error distinctly', async () => {
    vi.mocked(api.getInstance).mockResolvedValue(mockInst);
    vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
    vi.mocked(api.getAuditEvents).mockRejectedValue(new AppError('FORBIDDEN', 'Forbidden', 403));

    renderComponent();
    expect(await screen.findByText('You do not have permission to view this instance\'s audit log.')).toBeInTheDocument();
  });

  it('handles unexpected errors', async () => {
    vi.mocked(api.getInstance).mockRejectedValue(new Error('Network drop'));
    renderComponent();
    expect(await screen.findByText('An unexpected error occurred while loading audit events.')).toBeInTheDocument();
  });

  it('navigates back to instance detail on click', async () => {
    const user = userEvent.setup();
    vi.mocked(api.getInstance).mockResolvedValue(mockInst);
    vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
    vi.mocked(api.getAuditEvents).mockResolvedValue([]);

    renderComponent();
    const link = await screen.findByRole('link', { name: /Back to instance details/i });

    await user.click(link);
    expect(await screen.findByText('Instance Detail Page')).toBeInTheDocument();
  });
});
