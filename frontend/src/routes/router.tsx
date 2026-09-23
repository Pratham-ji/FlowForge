import { LandingPage } from '../pages/LandingPage';
import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { WorkflowList } from '../features/workflows/WorkflowList';
import { WorkflowCreate } from '../features/workflows/WorkflowCreate';
import { WorkflowDetail } from '../features/workflows/WorkflowDetail';
import { InstanceList } from '../features/instances/InstanceList';
import { InstanceDetail } from '../features/instances/InstanceDetail';
import { InstanceAudit } from '../features/audit/InstanceAudit';
import { WorkspaceSettings } from '../features/workspaces/WorkspaceSettings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'register',
        element: <RegisterPage />,
      },
    ],
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'workflows',
        element: <WorkflowList />,
      },
      {
        path: 'workflows/new',
        element: <WorkflowCreate />,
      },
      {
        path: 'workflows/:workflowId',
        element: <WorkflowDetail />,
      },
      {
        path: 'workflows/:workflowId/instances',
        element: <InstanceList />,
      },
      {
        path: 'instances/:instanceId',
        element: <InstanceDetail />,
      },
      {
        path: 'instances/:instanceId/audit',
        element: <InstanceAudit />,
      },
      {
        path: 'settings',
        element: <WorkspaceSettings />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
