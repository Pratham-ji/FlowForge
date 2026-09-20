import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkflowList } from './WorkflowList';
import { WorkflowCreate } from './WorkflowCreate';
import { WorkflowDetail } from './WorkflowDetail';
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
    listWorkflows: vi.fn(),
    getWorkflow: vi.fn(),
    createWorkflow: vi.fn(),
    activateWorkflow: vi.fn(),
    archiveWorkflow: vi.fn(),
  };
});

describe('Workflow Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getStoredToken).mockReturnValue('fake-token');
    vi.mocked(api.getMe).mockResolvedValue({ id: '1' });
    vi.mocked(api.listOrganizations).mockResolvedValue([{ id: 'org1', name: 'Org 1' }]);
    vi.mocked(api.listOrganizationMembers).mockResolvedValue([{ userId: '1', role: 'Admin' }]);
    vi.mocked(api.getStoredOrganization).mockReturnValue('org1');
  });

  const renderComponent = (element: React.ReactElement, path = '/', routePattern = path) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path={routePattern} element={element} />
            <Route path="/app/workflows/new" element={<div>Create Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

  describe('WorkflowList', () => {
    it('renders loading state initially', () => {
      vi.mocked(api.listWorkflows).mockReturnValue(new Promise(() => {}));
      renderComponent(<WorkflowList />);
      expect(screen.getAllByRole('status')[0]).toBeInTheDocument();
    });

    it('renders empty state', async () => {
      vi.mocked(api.listWorkflows).mockResolvedValue([]);
      renderComponent(<WorkflowList />);
      expect(await screen.findByText('No workflows found')).toBeInTheDocument();
    });

    it('renders error state', async () => {
      vi.mocked(api.listWorkflows).mockRejectedValue(new AppError('ERR', 'API Failed', 500));
      renderComponent(<WorkflowList />);
      expect(await screen.findByText('API Failed')).toBeInTheDocument();
    });

    it('renders list of workflows', async () => {
      vi.mocked(api.listWorkflows).mockResolvedValue([
        { id: 'wf1', name: 'Test WF', lifecycle: 'Draft', organizationId: 'org1', initialStateId: 'st1', states: [], transitions: [] }
      ]);
      renderComponent(<WorkflowList />);
      expect(await screen.findByText('Test WF')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });
  });

  describe('WorkflowCreate', () => {
    it('prevents Viewer from creating', async () => {
      vi.mocked(api.getMe).mockResolvedValue({ id: '1' });
      vi.mocked(api.listOrganizations).mockResolvedValue([{ id: 'org1', name: 'Org 1' }]);
    vi.mocked(api.listOrganizationMembers).mockResolvedValue([{ userId: '1', role: 'Viewer' }]);
      vi.mocked(api.getStoredOrganization).mockReturnValue('org1');
      renderComponent(<WorkflowCreate />);
      expect(await screen.findByText('Unauthorized')).toBeInTheDocument();
    });

    it('submits form and navigates', async () => {
      const user = userEvent.setup();
      vi.mocked(api.createWorkflow).mockResolvedValue({
        id: 'new-wf', name: 'New', lifecycle: 'Draft', organizationId: 'org1', initialStateId: 's', states: [], transitions: []
      });

      renderComponent(<WorkflowCreate />);
      const input = await screen.findByLabelText(/Workflow Name/i);

      await user.type(input, 'My Workflow');
      await user.click(screen.getByRole('button', { name: /Create Workflow/i }));

      await waitFor(() => {
        expect(api.createWorkflow).toHaveBeenCalled();
      });
    });

    it('displays backend validation errors', async () => {
      const user = userEvent.setup();
      vi.mocked(api.createWorkflow).mockRejectedValue(new AppError('VALIDATION', 'Name already taken', 422));

      renderComponent(<WorkflowCreate />);
      const input = await screen.findByLabelText(/Workflow Name/i);

      await user.type(input, 'Duplicate');
      await user.click(screen.getByRole('button', { name: /Create Workflow/i }));

      expect(await screen.findByText('Name already taken')).toBeInTheDocument();
    });
  });

  describe('WorkflowDetail', () => {
    const mockWf = {
      id: 'wf-detail-1', name: 'Detail WF', lifecycle: 'Draft' as const, organizationId: 'org1', initialStateId: 's1',
      states: [{ id: 's1', name: 'Start', isTerminal: false }],
      transitions: [{ id: 't1', sourceStateId: 's1', targetStateId: 's1', action: 'loop', requiredPermission: 'ReadWorkflow' }]
    };

    it('renders workflow details, states, and transitions', async () => {
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      renderComponent(<WorkflowDetail />, '/app/workflows/wf-detail-1', '/app/workflows/:workflowId');

      expect(await screen.findByText('Detail WF')).toBeInTheDocument();
      expect(screen.getAllByText('Start')[0]).toBeInTheDocument();
      expect(screen.getByText('loop')).toBeInTheDocument();
    });

    it('allows Admin to activate draft workflow', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      vi.mocked(api.activateWorkflow).mockResolvedValue({ ...mockWf, lifecycle: 'Active' });

      renderComponent(<WorkflowDetail />, '/app/workflows/wf-detail-1', '/app/workflows/:workflowId');

      const btn = await screen.findByRole('button', { name: /Activate Workflow/i });
      await user.click(btn);

      await waitFor(() => {
        expect(api.activateWorkflow).toHaveBeenCalledWith('wf-detail-1');
        expect(screen.queryByRole('button', { name: /Activate Workflow/i })).not.toBeInTheDocument();
      });
    });

    it('hides activation controls for Viewer', async () => {
      vi.mocked(api.listOrganizationMembers).mockResolvedValue([{ userId: '1', role: 'Viewer' }]);
      vi.mocked(api.getMe).mockResolvedValue({ id: '1' });
      vi.mocked(api.listOrganizations).mockResolvedValue([{ id: 'org1', name: 'Org 1' }]);
      vi.mocked(api.getStoredOrganization).mockReturnValue('org1');
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);

      renderComponent(<WorkflowDetail />, '/app/workflows/wf-detail-1', '/app/workflows/:workflowId');

      expect(await screen.findByText('Detail WF')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Activate Workflow/i })).not.toBeInTheDocument();
    });

    it('handles 409 conflict errors during activation', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      vi.mocked(api.activateWorkflow).mockRejectedValue(new AppError('CONFLICT', 'Workflow already active', 409));

      renderComponent(<WorkflowDetail />, '/app/workflows/wf-detail-1', '/app/workflows/:workflowId');
      const btn = await screen.findByRole('button', { name: /Activate Workflow/i });

      await user.click(btn);

      expect(await screen.findByText('Workflow already active')).toBeInTheDocument();
    });

    it('handles 404 workflow not found', async () => {
      vi.mocked(api.getWorkflow).mockRejectedValue(new AppError('NOT_FOUND', 'Not found', 404));
      renderComponent(<WorkflowDetail />, '/app/workflows/invalid-id', '/app/workflows/:workflowId');

      expect(await screen.findByText('Not found')).toBeInTheDocument();
    });

    it('allows Admin to archive active workflow', async () => {
      const user = userEvent.setup();
      const activeWf = { ...mockWf, lifecycle: 'Active' as const };
      vi.mocked(api.getWorkflow).mockResolvedValue(activeWf);
      vi.mocked(api.archiveWorkflow).mockResolvedValue({ ...activeWf, lifecycle: 'Archived' });

      renderComponent(<WorkflowDetail />, '/app/workflows/wf-detail-1', '/app/workflows/:workflowId');

      const btn = await screen.findByRole('button', { name: /Archive Workflow/i });
      await user.click(btn);

      await waitFor(() => {
        expect(api.archiveWorkflow).toHaveBeenCalledWith('wf-detail-1');
        expect(screen.queryByRole('button', { name: /Archive Workflow/i })).not.toBeInTheDocument();
      });
    });

    it('contains valid navigation links', async () => {
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      renderComponent(<WorkflowDetail />, '/app/workflows/wf-detail-1', '/app/workflows/:workflowId');

      const backLink = await screen.findByRole('link', { name: /Back to Workflows/i });
      expect(backLink).toHaveAttribute('href', '/app/workflows');

      const instancesLink = screen.getByRole('link', { name: /View instances/i });
      expect(instancesLink).toHaveAttribute('href', '/app/workflows/wf-detail-1/instances');
    });
  });
});
