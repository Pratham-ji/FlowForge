import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';
import type { WorkflowDTO } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { useAuth } from '../auth/AuthContext';

export function WorkflowList() {
  const [workflows, setWorkflows] = useState<WorkflowDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const loadWorkflows = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listWorkflows();
      setWorkflows(data);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  if (isLoading) return <LoadingScreen />;

  if (error) {
    return <ErrorState message={error} onRetry={loadWorkflows} />;
  }

  const canCreate = user?.role !== 'Viewer';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
        {canCreate && (
          <Button onClick={() => navigate('/app/workflows/new')}>Create Workflow</Button>
        )}
      </div>

      {workflows.length === 0 ? (
        <EmptyState
          title="No workflows found"
          description="Get started by creating a new workflow."
          action={canCreate ? <Button onClick={() => navigate('/app/workflows/new')}>Create Workflow</Button> : undefined}
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {workflows.map((wf) => (
              <li key={wf.id}>
                <Link
                  to={`/app/workflows/${wf.id}`}
                  className="w-full text-left block hover:bg-gray-50 focus:outline-none focus:bg-gray-50 focus:ring-inset focus:ring-2 focus:ring-primary-500 transition-colors"
                >
                  <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-primary-600 truncate">{wf.name}</p>
                      <p className="text-xs text-gray-500 mt-1 font-mono break-all">ID: {wf.id}</p>
                    </div>
                    <div className="self-start sm:self-auto">
                      <Badge
                        variant={wf.lifecycle === 'Active' ? 'success' : wf.lifecycle === 'Archived' ? 'default' : 'warning'}
                      >
                        {wf.lifecycle}
                      </Badge>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
