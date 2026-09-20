import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';
import type { CreateWorkflowRequest } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { useAuth } from '../auth/AuthContext';
import { EmptyState } from '../../components/ui/States';

export function WorkflowCreate() {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { currentRole } = useAuth();

  if (currentRole === 'Viewer' || currentRole === 'Member') {
    return <EmptyState title="Unauthorized" description="You do not have permission to create workflows." />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    // Hardcode a minimal state machine structure for this phase
    // Real implementation would have a builder UI
    const payload: CreateWorkflowRequest = {
      name: name.trim(),
      initialStateId: '00000000-0000-0000-0000-000000000001',
      states: [
        { id: '00000000-0000-0000-0000-000000000001', name: 'Draft', isTerminal: false },
        { id: '00000000-0000-0000-0000-000000000002', name: 'In Review', isTerminal: false },
        { id: '00000000-0000-0000-0000-000000000003', name: 'Approved', isTerminal: true },
      ],
      transitions: [
        {
          id: '10000000-0000-0000-0000-000000000001',
          sourceStateId: '00000000-0000-0000-0000-000000000001',
          targetStateId: '00000000-0000-0000-0000-000000000002',
          action: 'submit',
          requiredPermission: 'TransitionInstance'
        },
        {
          id: '10000000-0000-0000-0000-000000000002',
          sourceStateId: '00000000-0000-0000-0000-000000000002',
          targetStateId: '00000000-0000-0000-0000-000000000003',
          action: 'approve',
          requiredPermission: 'TransitionInstance'
        }
      ]
    };

    try {
      const created = await api.createWorkflow(payload);
      navigate(`/app/workflows/${created.id}`);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to create workflow.');
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-4">
        <Link to="/app/workflows" className="text-sm text-gray-500 hover:text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 rounded">
          &larr; Back to Workflows
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Workflow</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Workflow Details</h2>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={handleSubmit} className="space-y-6">
            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label="Workflow Name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Document Approval"
            />

            <div className="bg-blue-50 text-blue-800 p-4 rounded text-sm">
              Note: This basic version creates a fixed 3-state machine (Draft &rarr; In Review &rarr; Approved).
              A visual state machine editor will be added in a future phase.
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="ghost" onClick={() => navigate('/app/workflows')}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting} disabled={!name.trim()}>
                Create Workflow
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
