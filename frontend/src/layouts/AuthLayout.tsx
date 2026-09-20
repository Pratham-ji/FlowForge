import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export function AuthLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">FlowForge</h1>
      </div>
      <Outlet />
    </div>
  );
}
