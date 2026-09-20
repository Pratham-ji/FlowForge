import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { WorkflowList } from '../features/workflows/WorkflowList';
import { WorkflowCreate } from '../features/workflows/WorkflowCreate';
import { WorkflowDetail } from '../features/workflows/WorkflowDetail';
import { InstanceList } from '../features/instances/InstanceList';
import { InstanceDetail } from '../features/instances/InstanceDetail';
import { InstanceAudit } from '../features/audit/InstanceAudit';
import { OrganizationSettings } from '../features/organizations/OrganizationSettings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app" replace />,
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: 'login',
        element: <LoginPage />,
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
        element: <OrganizationSettings />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
