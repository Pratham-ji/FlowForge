import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';
import type { WorkflowDTO, WorkflowInstanceDTO } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ErrorState } from '../../components/ui/States';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';

export function InstanceDetail() {
  const { instanceId } = useParams<{ instanceId: string }>();

  const [instance, setInstance] = useState<WorkflowInstanceDTO | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const loadData = async () => {
    if (!instanceId) return;
    setIsLoading(true);
    setError(null);
    setConflictError(null);
    setTransitionError(null);
    try {
      const instData = await api.getInstance(instanceId);
      setInstance(instData);

      const wfData = await api.getWorkflow(instData.workflowId);
      setWorkflow(wfData);
    } catch (err) {
      if (err instanceof AppError) {
        if (err.status === 404) {
          setError('Instance not found.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instanceId, loadData]);

  if (isLoading) return <LoadingScreen />;
  if (error || !instance || !workflow) return <ErrorState message={error || 'Not found'} onRetry={loadData} />;

  const currentState = workflow.states?.find(s => s.id === instance.currentStateId);
  const availableTransitions = workflow.transitions?.filter(t => t.sourceStateId === instance.currentStateId) || [];

  const handleTransition = async (action: string) => {
    if (!instanceId) return;
    if (isTransitioning) return; // Prevent duplicate submission

    setTransitionError(null);
    setConflictError(null);
    setIsTransitioning(action);

    try {
      const updatedInstance = await api.executeTransition(instanceId, { action, expectedVersion: instance.version });
      setInstance(updatedInstance);
    } catch (err) {
      if (err instanceof AppError) {
        if (err.status === 409) {
          setConflictError('This instance was modified by another user concurrently. Please refresh to see the latest state.');
        } else {
          setTransitionError(err.message);
        }
      } else {
        setTransitionError('Failed to execute transition.');
      }
    } finally {
      setIsTransitioning(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          to={`/app/workflows/${instance.workflowId}/instances`}
          className="text-sm text-gray-500 hover:text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 rounded"
        >
          &larr; Back to Instances
        </Link>
      </div>

      {transitionError && <Alert variant="error">{transitionError}</Alert>}

      {conflictError && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700 font-medium">{conflictError}</p>
              </div>
            </div>
            <Button size="sm" onClick={loadData} variant="primary">Refresh Data</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 font-mono text-lg break-all">Instance: {instance.id}</h1>
          <p className="text-sm text-gray-500 mt-1">
            Workflow: <span className="font-medium text-gray-700">{workflow.name}</span>
          </p>
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            <span>Version: {instance.version}</span>
            <span aria-hidden="true">&bull;</span>
            <Link
              to={`/app/instances/${instanceId}/audit`}
              className="text-primary-600 hover:text-primary-800 hover:underline font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 rounded inline-flex items-center"
              aria-label="View instance audit history"
            >
              View audit history
            </Link>
          </div>
        </div>
        <div className="self-start sm:self-auto">
          <Badge variant={currentState?.isTerminal ? 'default' : 'info'}>
            {currentState ? currentState.name : instance.currentStateId}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium text-gray-900">Available Actions</h2>
          </CardHeader>
          <CardContent>
            {currentState?.isTerminal ? (
              <p className="text-sm text-gray-500 italic">This instance has reached a terminal state.</p>
            ) : availableTransitions.length === 0 ? (
              <p className="text-sm text-gray-500">No actions available from this state.</p>
            ) : (
              <div className="space-y-3">
                {availableTransitions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 border border-gray-100 rounded bg-gray-50">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{t.action}</span>
                      <span className="text-xs text-gray-500">Requires: {t.requiredPermission}</span>
                    </div>
                    <Button
                      onClick={() => handleTransition(t.action)}
                      disabled={!!isTransitioning}
                      isLoading={isTransitioning === t.action}
                    >
                      Execute
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
