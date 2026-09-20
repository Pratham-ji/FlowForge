import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import * as api from '../../api/client';
import { AppError } from '../../api/errors';

export function OrganizationSettings() {
  const { currentOrg, currentRole } = useAuth();
  const [members, setMembers] = useState<api.OrganizationMemberDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<string>('Viewer');
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (currentOrg && currentRole === 'Admin') {
      loadMembers();
    } else {
      setLoading(false);
    }
  }, [currentOrg, currentRole]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.listOrganizationMembers(currentOrg!.id);
      setMembers(data);
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to load members');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    try {
      setAdding(true);
      setAddError(null);
      await api.addOrganizationMember(currentOrg.id, newEmail, newRole);
      setNewEmail('');
      setNewRole('Viewer');
      await loadMembers();
    } catch (err) {
      if (err instanceof AppError) {
        setAddError(err.message);
      } else {
        setAddError('Failed to add member');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentOrg || !window.confirm('Are you sure you want to remove this member?')) return;
    try {
      setError(null);
      await api.removeOrganizationMember(currentOrg.id, userId);
      await loadMembers();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to remove member');
      }
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    if (!currentOrg) return;
    try {
      setError(null);
      await api.updateOrganizationMemberRole(currentOrg.id, userId, role);
      await loadMembers();
    } catch (err) {
      if (err instanceof AppError) {
        setError(err.message);
      } else {
        setError('Failed to update role');
      }
    }
  };

  if (currentRole !== 'Admin') {
    return (
      <div className="text-center mt-12">
        <h2 className="text-xl font-bold text-gray-900">Organization Settings</h2>
        <p className="mt-2 text-gray-600">Only organization administrators can view or modify settings.</p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center mt-12">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{currentOrg?.name} Settings</h1>
      </div>

      {error && (
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
          <h2 className="text-lg font-medium text-gray-900">Members</h2>
        </div>

        <div className="px-4 py-5 sm:p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Add Member</h3>
          <form onSubmit={handleAddMember} className="flex gap-4 items-end">
            <div className="flex-1">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <input
                type="email"
                id="email"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
              <select
                id="role"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-3 py-2 border"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Member">Member</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={adding}
              className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Add Member
            </button>
          </form>
          {addError && <p className="mt-2 text-sm text-red-600">{addError}</p>}
        </div>

        <ul className="divide-y divide-gray-200">
          {members.map(member => (
            <li key={member.userId} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{member.userId}</p>
                <p className="text-sm text-gray-500">{member.role}</p>
              </div>
              <div className="flex items-center space-x-4">
                <select
                  value={member.role}
                  onChange={(e) => handleChangeRole(member.userId, e.target.value)}
                  className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-2 py-1 border"
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager">Manager</option>
                  <option value="Member">Member</option>
                  <option value="Viewer">Viewer</option>
                </select>
                <button
                  onClick={() => handleRemoveMember(member.userId)}
                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
