import { useAuth } from '../features/auth/AuthContext';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-medium text-gray-900">Welcome to FlowForge</h2>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-6">
            You are authenticated as <span className="font-semibold">{user?.role}</span>.
            Use FlowForge to define, execute, and monitor strongly-typed business workflows.
          </p>
          <div className="flex gap-4">
            <Button onClick={() => navigate('/app/workflows')}>
              View Workflows
            </Button>
            {user?.role !== 'Viewer' && (
              <Button variant="secondary" onClick={() => navigate('/app/workflows/new')}>
                Create New Workflow
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
