import { EmptyState } from '../components/ui/States';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen items-center justify-center p-4">
      <div className="max-w-md w-full">
        <EmptyState
          title="Page not found"
          description="The page you are looking for doesn't exist or has been moved."
          action={
            <Button onClick={() => navigate('/app')}>
              Go to Dashboard
            </Button>
          }
        />
      </div>
    </div>
  );
}
