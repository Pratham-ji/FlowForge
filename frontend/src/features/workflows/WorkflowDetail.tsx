import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';
import type { WorkflowDTO } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { ErrorState } from '../../components/ui/States';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Alert } from '../../components/ui/Alert';
import { useAuth } from '../auth/AuthContext';

export function WorkflowDetail() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const { user } = useAuth();

  const [workflow, setWorkflow] = useState<WorkflowDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const loadWorkflow = async () => {
    if (!workflowId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getWorkflow(workflowId);
      setWorkflow(data);
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
    loadWorkflow();
  }, [workflowId]);

  if (isLoading) return <LoadingScreen />;
  if (error || !workflow) return <ErrorState message={error || 'Not found'} onRetry={loadWorkflow} />;

  const canManage = user?.role === 'Admin' || user?.role === 'Manager';

  const handleActivate = async () => {
    if (!workflowId) return;
    setActionError(null);
    setIsActivating(true);
    try {
      const data = await api.activateWorkflow(workflowId);
      setWorkflow(data);
    } catch (err) {
      setActionError(err instanceof AppError ? err.message : 'Failed to activate workflow');
    } finally {
      setIsActivating(false);
    }
  };

  const handleArchive = async () => {
    if (!workflowId) return;
    setActionError(null);
    setIsArchiving(true);
    try {
      const data = await api.archiveWorkflow(workflowId);
      setWorkflow(data);
    } catch (err) {
      setActionError(err instanceof AppError ? err.message : 'Failed to archive workflow');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          to="/app/workflows"
          className="text-sm text-gray-500 hover:text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 rounded"
        >
          &larr; Back to Workflows
        </Link>
      </div>

      {actionError && <Alert variant="error">{actionError}</Alert>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 break-all">{workflow.name}</h1>
          <p className="text-sm text-gray-500 font-mono mt-1 break-all">{workflow.id}</p>
          <div className="mt-2">
            <Link
              to={`/app/workflows/${workflowId}/instances`}
              className="text-primary-600 hover:text-primary-800 hover:underline text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 rounded inline-flex items-center"
            >
              View instances &rarr;
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:space-x-4">
          <Badge variant={workflow.lifecycle === 'Active' ? 'success' : workflow.lifecycle === 'Archived' ? 'default' : 'warning'}>
            {workflow.lifecycle}
          </Badge>

          {canManage && workflow.lifecycle === 'Draft' && (
            <Button onClick={handleActivate} isLoading={isActivating}>
              Activate Workflow
            </Button>
          )}

          {canManage && workflow.lifecycle === 'Active' && (
            <Button onClick={handleArchive} isLoading={isArchiving} variant="danger">
              Archive Workflow
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">States</h2>
          </CardHeader>
          <CardContent>
            {workflow.states && workflow.states.length > 0 ? (
              <ul className="space-y-3">
                {workflow.states.map((st) => (
                  <li key={st.id} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100">
                    <span className="font-medium text-gray-900">{st.name}</span>
                    <div className="flex items-center space-x-2">
                      {st.id === workflow.initialStateId && <Badge variant="info">Initial</Badge>}
                      {st.isTerminal && <Badge variant="default">Terminal</Badge>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No states defined.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Transitions</h2>
          </CardHeader>
          <CardContent>
            {workflow.transitions && workflow.transitions.length > 0 ? (
              <ul className="space-y-3">
                {workflow.transitions.map((tr) => {
                  const source = workflow.states?.find(s => s.id === tr.sourceStateId)?.name || tr.sourceStateId;
                  const target = workflow.states?.find(s => s.id === tr.targetStateId)?.name || tr.targetStateId;
                  return (
                    <li key={tr.id} className="p-3 bg-gray-50 rounded border border-gray-100 flex flex-col space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-sm font-semibold text-primary-700">{tr.action}</span>
                        <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">{tr.requiredPermission}</span>
                      </div>
                      <div className="text-sm text-gray-600 flex items-center space-x-2">
                        <span>{source}</span>
                        <span className="text-gray-400" aria-hidden="true">&rarr;</span>
                        <span>{target}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No transitions defined.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
