import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';
import type { WorkflowDTO, WorkflowInstanceDTO } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { useAuth } from '../auth/AuthContext';

export function InstanceList() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { currentRole } = useAuth();

  const [workflow, setWorkflow] = useState<WorkflowDTO | null>(null);
  const [instances, setInstances] = useState<WorkflowInstanceDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!workflowId) return;
    setIsLoading(true);
    setError(null);
    setCreateError(null);
    try {
      const [wfData, instData] = await Promise.all([
        api.getWorkflow(workflowId),
        api.listInstances(workflowId),
      ]);
      setWorkflow(wfData);
      setInstances(instData);
    } catch (err) {
      if (err instanceof AppError) {
        if (err.isNotFound) {
           setError('Workflow not found.');
        } else {
           setError(err.message);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    loadData();
  }, [workflowId, loadData]);

  if (isLoading) return <LoadingScreen />;
  if (error || !workflow) return <ErrorState message={error || 'Not found'} onRetry={loadData} />;

  const canCreate = currentRole !== 'Viewer' && workflow.lifecycle === 'Active';

  const handleCreateInstance = async () => {
    if (!workflowId) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const newInst = await api.createInstance(workflowId);
      navigate(`/app/instances/${newInst.id}`);
    } catch (err) {
      if (err instanceof AppError) {
        setCreateError(err.message);
      } else {
        setCreateError('Failed to create instance.');
      }
      setIsCreating(false);
    }
  };

  const getStateName = (stateId: string) => {
    const state = workflow.states?.find((s) => s.id === stateId);
    return state ? state.name : stateId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          to={`/app/workflows/${workflowId}`}
          className="text-sm text-gray-500 hover:text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 rounded"
        >
          &larr; Back to Workflow
        </Link>
      </div>

      {createError && <Alert variant="error">{createError}</Alert>}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Instances: {workflow.name}</h1>
          <p className="text-sm text-gray-500">Manage running instances for this workflow.</p>
        </div>
        {canCreate && (
          <Button onClick={handleCreateInstance} isLoading={isCreating}>
            New Instance
          </Button>
        )}
      </div>

      {instances.length === 0 ? (
        <EmptyState
          title="No instances found"
          description={workflow.lifecycle === 'Active' ? "Get started by creating a new instance." : "Workflow must be active to create instances."}
          action={canCreate ? <Button onClick={handleCreateInstance} isLoading={isCreating}>Create Instance</Button> : undefined}
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {instances.map((inst) => (
              <li key={inst.id}>
                <Link
                  to={`/app/instances/${inst.id}`}
                  className="w-full text-left block hover:bg-gray-50 focus:outline-none focus:bg-gray-50 focus:ring-inset focus:ring-2 focus:ring-primary-500 transition-colors"
                >
                  <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-primary-600 font-mono break-all">{inst.id}</p>
                      <p className="text-xs text-gray-500 mt-1">Version: {inst.version}</p>
                    </div>
                    <div className="self-start sm:self-auto">
                      <Badge variant="info">{getStateName(inst.currentStateId)}</Badge>
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
