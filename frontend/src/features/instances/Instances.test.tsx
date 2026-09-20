import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { InstanceList } from './InstanceList';
import { InstanceDetail } from './InstanceDetail';
import { AuthProvider } from '../auth/AuthContext';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';

vi.mock('../../api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/client')>();
  return {
    ...actual,
    getStoredToken: vi.fn(),
    getMe: vi.fn(),
    getWorkflow: vi.fn(),
    listInstances: vi.fn(),
    createInstance: vi.fn(),
    getInstance: vi.fn(),
    executeTransition: vi.fn(),
  };
});

describe('Instance Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getStoredToken).mockReturnValue('fake-token');
    vi.mocked(api.getMe).mockResolvedValue({ id: '1', organizationId: '2', role: 'Admin' });
  });

  const renderComponent = (element: React.ReactElement, path = '/', routePattern = path) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <Routes>
            <Route path={routePattern} element={element} />
            <Route path="/app/instances/:instanceId" element={<div>Detail Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

  const mockWf = {
    id: 'wf1', name: 'Test WF', lifecycle: 'Active' as const, organizationId: 'org1', initialStateId: 's1',
    states: [
      { id: 's1', name: 'Draft', isTerminal: false },
      { id: 's2', name: 'Approved', isTerminal: true }
    ],
    transitions: [
      { id: 't1', sourceStateId: 's1', targetStateId: 's2', action: 'approve', requiredPermission: 'TransitionInstance' }
    ]
  };

  describe('InstanceList', () => {
    it('renders loading state initially', () => {
      vi.mocked(api.getWorkflow).mockReturnValue(new Promise(() => {}));
      vi.mocked(api.listInstances).mockReturnValue(new Promise(() => {}));
      renderComponent(<InstanceList />, '/app/workflows/wf1/instances', '/app/workflows/:workflowId/instances');
      expect(screen.getAllByRole('status')[0]).toBeInTheDocument();
    });

    it('renders empty state', async () => {
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      vi.mocked(api.listInstances).mockResolvedValue([]);
      renderComponent(<InstanceList />, '/app/workflows/wf1/instances', '/app/workflows/:workflowId/instances');
      expect(await screen.findByText('No instances found')).toBeInTheDocument();
    });

    it('renders error state', async () => {
      vi.mocked(api.getWorkflow).mockRejectedValue(new AppError('ERR', 'API Failed', 500));
      renderComponent(<InstanceList />, '/app/workflows/wf1/instances', '/app/workflows/:workflowId/instances');
      expect(await screen.findByText('API Failed')).toBeInTheDocument();
    });

    it('renders list of instances', async () => {
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      vi.mocked(api.listInstances).mockResolvedValue([
        { id: 'inst1', workflowId: 'wf1', currentStateId: 's1', createdBy: 'u1', version: 1 }
      ]);
      renderComponent(<InstanceList />, '/app/workflows/wf1/instances', '/app/workflows/:workflowId/instances');

      expect(await screen.findByText('inst1')).toBeInTheDocument();
      // Uses the state name from the workflow
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('allows creating instance and navigates', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      vi.mocked(api.listInstances).mockResolvedValue([]);
      vi.mocked(api.createInstance).mockResolvedValue({
        id: 'new-inst', workflowId: 'wf1', currentStateId: 's1', createdBy: 'u1', version: 1
      });

      renderComponent(<InstanceList />, '/app/workflows/wf1/instances', '/app/workflows/:workflowId/instances');

      const btn = await screen.findByRole('button', { name: /New Instance/i });
      await user.click(btn);

      await waitFor(() => {
        expect(api.createInstance).toHaveBeenCalledWith('wf1');
        expect(screen.getByText('Detail Page')).toBeInTheDocument();
      });
    });
  });

  describe('InstanceDetail', () => {
    const mockInst = { id: 'inst1', workflowId: 'wf1', currentStateId: 's1', createdBy: 'u1', version: 1 };

    it('renders instance details, state, and available actions', async () => {
      vi.mocked(api.getInstance).mockResolvedValue(mockInst);
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      renderComponent(<InstanceDetail />, '/app/instances/inst1', '/app/instances/:instanceId');

      expect(await screen.findByText('Instance: inst1')).toBeInTheDocument();
      expect(screen.getByText('Draft')).toBeInTheDocument();
      expect(screen.getByText('approve')).toBeInTheDocument(); // The available action
    });

    it('executes transition and updates UI', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getInstance).mockResolvedValue(mockInst);
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);

      renderComponent(<InstanceDetail />, '/app/instances/inst1', '/app/instances/:instanceId');

      const executeBtn = await screen.findByRole('button', { name: /Execute/i });

      vi.mocked(api.executeTransition).mockResolvedValue({
        ...mockInst, currentStateId: 's2', version: 2
      });

      await user.click(executeBtn);

      await waitFor(() => {
        expect(api.executeTransition).toHaveBeenCalledWith('inst1', { action: 'approve', expectedVersion: 1 });
        // After transition, state should be Approved and no actions available
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getByText('This instance has reached a terminal state.')).toBeInTheDocument();
      });
    });

    it('handles 409 conflict errors during transition', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getInstance).mockResolvedValue(mockInst);
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      vi.mocked(api.executeTransition).mockRejectedValue(new AppError('CONFLICT', 'Stale version', 409));

      renderComponent(<InstanceDetail />, '/app/instances/inst1', '/app/instances/:instanceId');
      const executeBtn = await screen.findByRole('button', { name: /Execute/i });

      await user.click(executeBtn);

      expect(await screen.findByText(/This instance was modified by another user concurrently/i)).toBeInTheDocument();
    });

    it('handles 422 invalid transition errors', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getInstance).mockResolvedValue(mockInst);
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      vi.mocked(api.executeTransition).mockRejectedValue(new AppError('INVALID_TRANSITION', 'Transition not allowed', 422));

      renderComponent(<InstanceDetail />, '/app/instances/inst1', '/app/instances/:instanceId');
      const executeBtn = await screen.findByRole('button', { name: /Execute/i });

      await user.click(executeBtn);

      expect(await screen.findByText('Transition not allowed')).toBeInTheDocument();
    });

    it('handles 404 instance not found', async () => {
      vi.mocked(api.getInstance).mockRejectedValue(new AppError('NOT_FOUND', 'Not found', 404));
      renderComponent(<InstanceDetail />, '/app/instances/inst1', '/app/instances/:instanceId');

      expect(await screen.findByText('Instance not found.')).toBeInTheDocument();
    });

    it('prevents duplicate action submission while transitioning', async () => {
      const user = userEvent.setup();
      vi.mocked(api.getInstance).mockResolvedValue(mockInst);
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);

      // Delay the resolution of the API call to check loading state
      let resolveApi: (val: any) => void;
      vi.mocked(api.executeTransition).mockReturnValue(new Promise(resolve => {
        resolveApi = resolve;
      }));

      renderComponent(<InstanceDetail />, '/app/instances/inst1', '/app/instances/:instanceId');

      const executeBtn = await screen.findByRole('button', { name: /Execute/i });
      await user.click(executeBtn);

      expect(executeBtn).toBeDisabled();

      // Secondary click should be ignored
      await user.click(executeBtn);
      expect(api.executeTransition).toHaveBeenCalledTimes(1);

      resolveApi!({ ...mockInst, currentStateId: 's2', version: 2 });
    });

    it('contains valid navigation links', async () => {
      vi.mocked(api.getInstance).mockResolvedValue(mockInst);
      vi.mocked(api.getWorkflow).mockResolvedValue(mockWf);
      renderComponent(<InstanceDetail />, '/app/instances/inst1', '/app/instances/:instanceId');

      const backLink = await screen.findByRole('link', { name: /Back to Instances/i });
      expect(backLink).toHaveAttribute('href', '/app/workflows/wf1/instances');

      const auditLink = screen.getByRole('link', { name: /View instance audit history/i });
      expect(auditLink).toHaveAttribute('href', '/app/instances/inst1/audit');
    });
  });
});
