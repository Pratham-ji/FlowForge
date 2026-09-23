import { useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export function AppLayout() {
  const { logout, currentRole, currentWorkspace, workspaces, setCurrentWorkspaceId } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Overview', href: '/app', end: true },
    { name: 'Workflows', href: '/app/workflows' },
  ];

  if (currentRole === 'Admin') {
    navigation.push({ name: 'Team & Settings', href: '/app/settings' });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
        <span className="text-xl font-bold text-gray-900 tracking-tight">FlowForge</span>
        <button
          type="button"
          className="text-gray-500 hover:text-gray-900 focus:outline-none"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar Navigation */}
      <nav
        className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block md:w-64 flex-shrink-0 bg-white border-r border-gray-200 shadow-sm z-10`}
      >
        <div className="h-full flex flex-col">
          <div className="hidden md:flex items-center px-6 py-6 border-b border-gray-200">
            <span className="text-2xl font-bold text-gray-900 tracking-tight">FlowForge</span>
          </div>

          <div className="px-4 py-5 border-b border-gray-200 bg-gray-50/50">
            <label htmlFor="workspace-switcher" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Workspace
            </label>
            <select
              id="workspace-switcher"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 rounded-md shadow-sm bg-white"
              value={currentWorkspace?.id || ''}
              onChange={(e) => setCurrentWorkspaceId(e.target.value)}
            >
              {workspaces.map(org => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navigation.map((item) => (
                <li key={item.name}>
                  <NavLink
                    to={item.href}
                    end={item.end}
                    className={({ isActive }) =>
                      `block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`
                    }
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50/50">
            <button
              onClick={() => logout()}
              className="w-full text-left px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 hover:text-gray-900 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto focus:outline-none bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
