import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export function AuthLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col selection:bg-primary-500/30 overflow-hidden relative">
      {/* Background Glows */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Navbar for Auth Layout */}
      <nav className="relative z-10 w-full p-6">
        <Link to="/" className="inline-flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M3 15h6"/><path d="M6 12v6"/></svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">FlowForge</span>
        </Link>
      </nav>

      <div className="flex-1 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative z-10">
        <Outlet />
      </div>
    </div>
  );
}
