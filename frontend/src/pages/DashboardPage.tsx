import { useEffect, useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import * as api from '../api/client';
import type { WorkflowDTO } from '../types/api';

export function DashboardPage() {
  const { currentWorkspace, currentRole } = useAuth();
  const navigate = useNavigate();

  const [workflows, setWorkflows] = useState<WorkflowDTO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        if (currentWorkspace?.id) {
          const data = await api.listWorkflows();
          setWorkflows(data);
        }
      } catch (err) {
        console.error("Failed to load workflows for dashboard", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [currentWorkspace]);

  const activeWorkflows = workflows.filter(w => w.lifecycle === 'Active').length;
  const draftWorkflows = workflows.filter(w => w.lifecycle === 'Draft').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome to {currentWorkspace?.name || 'your workspace'}.
          </p>
        </div>
        {currentRole !== 'Viewer' && (
          <Button onClick={() => navigate('/app/workflows/new')}>
            Create workflow
          </Button>
        )}
      </div>

      {!loading && workflows.length === 0 ? (
        <Card className="text-center py-16 border-dashed">
          <CardContent>
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-semibold text-gray-900">Welcome to FlowForge</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto mb-6">
              Create your first workflow or start from a template to automate your team's processes without writing code.
            </p>
            <div className="flex justify-center gap-4">
              {currentRole !== 'Viewer' && (
                <Button onClick={() => navigate('/app/workflows/new')}>
                  Create workflow
                </Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/app/workflows')} disabled title="Templates coming soon">
                Browse templates
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary-50 rounded-lg">
                  <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Workflows</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '-' : workflows.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-50 rounded-lg">
                  <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Published</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '-' : activeWorkflows}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-50 rounded-lg">
                  <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Drafts</p>
                  <p className="text-2xl font-bold text-gray-900">{loading ? '-' : draftWorkflows}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
