import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';
import type { WorkflowDTO, WorkflowInstanceDTO, AuditEventDTO } from '../../types/api';
import { ErrorState, EmptyState } from '../../components/ui/States';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { Card, CardContent } from '../../components/ui/Card';

export function InstanceAudit() {
  const { instanceId } = useParams<{ instanceId: string }>();

  const [instance, setInstance] = useState<WorkflowInstanceDTO | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowDTO | null>(null);
  const [events, setEvents] = useState<AuditEventDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!instanceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const instData = await api.getInstance(instanceId);
      setInstance(instData);

      const [wfData, auditData] = await Promise.all([
        api.getWorkflow(instData.workflowId),
        api.getAuditEvents(instanceId),
      ]);
      setWorkflow(wfData);
      setEvents(auditData);
    } catch (err) {
      if (err instanceof AppError) {
        if (err.status === 404) {
          setError('Instance not found.');
        } else if (err.status === 403) {
          setError("You do not have permission to view this instance's audit log.");
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred while loading audit events.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [instanceId]);

  if (isLoading) return <LoadingScreen />;
  if (error || !instance || !workflow) return <ErrorState message={error || 'Not found'} onRetry={loadData} />;

  const getStateName = (stateId: string) => {
    const state = workflow.states?.find(s => s.id === stateId);
    return state ? state.name : stateId;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          to={`/app/instances/${instanceId}`}
          className="text-sm text-gray-500 hover:text-gray-900 font-medium flex items-center"
          aria-label="Back to instance details"
        >
          &larr; <span className="ml-1">Back to Instance</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit History</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">Instance: {instance.id}</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No audit events" description="This instance has no recorded transitions yet." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actor ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transition
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                        {event.actorId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-primary-600">
                        {event.action}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{getStateName(event.previousStateId)}</span>
                        <span className="mx-2 text-gray-400" aria-hidden="true">&rarr;</span>
                        <span className="font-medium text-gray-900">{getStateName(event.resultingStateId)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
