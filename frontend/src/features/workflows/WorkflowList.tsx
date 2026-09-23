import { useEffect, useState, useMemo } from 'react';
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const navigate = useNavigate();
  const { currentRole } = useAuth();

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

  const filteredWorkflows = useMemo(() => {
    return workflows.filter(wf => {
      const matchesSearch = wf.name.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || wf.lifecycle === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [workflows, search, statusFilter]);

  if (isLoading) return <LoadingScreen />;

  if (error) {
    return <ErrorState message={error} onRetry={loadWorkflows} />;
  }

  const canCreate = currentRole !== 'Viewer';

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Workflows</h1>
        {canCreate && (
          <Button onClick={() => navigate('/app/workflows/new')}>Create workflow</Button>
        )}
      </div>

      <div className="bg-white px-4 py-3 sm:px-6 shadow sm:rounded-t-md border border-b-0 border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative max-w-sm w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
            placeholder="Search workflows..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Status</label>
          <select
            id="status-filter"
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All</option>
            <option value="Active">Published</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {filteredWorkflows.length === 0 ? (
        <div className="bg-white shadow sm:rounded-b-md border border-gray-200">
          <EmptyState
            title={workflows.length === 0 ? "No workflows found" : "No matches found"}
            description={workflows.length === 0 ? "Get started by creating a new workflow to automate your processes." : "Try adjusting your search or filters."}
            action={workflows.length === 0 && canCreate ? <Button onClick={() => navigate('/app/workflows/new')}>Create workflow</Button> : undefined}
          />
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-b-md border border-gray-200">
          <ul className="divide-y divide-gray-200">
            {filteredWorkflows.map((wf) => (
              <li key={wf.id}>
                <Link
                  to={`/app/workflows/${wf.id}`}
                  className="w-full text-left block hover:bg-gray-50 focus:outline-none focus:bg-gray-50 focus:ring-inset focus:ring-2 focus:ring-primary-500 transition-colors"
                >
                  <div className="px-4 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <p className="text-sm font-semibold text-gray-900 truncate">{wf.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{wf.states.length} steps configured</p>
                    </div>
                    <div className="flex items-center gap-4 self-start sm:self-auto">
                      <Badge
                        variant={wf.lifecycle === 'Active' ? 'success' : wf.lifecycle === 'Archived' ? 'default' : 'warning'}
                      >
                        {wf.lifecycle === 'Active' ? 'Published' : wf.lifecycle}
                      </Badge>
                      <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
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
