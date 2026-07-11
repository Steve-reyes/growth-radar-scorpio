'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost } from '@/lib/api';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
}

export default function SettingsPage() {
  const { user, token, isAuthenticated, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (!isAdmin) {
      router.push('/');
      return;
    }
    if (isAdmin) {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, isAdmin]);

  const fetchUsers = async () => {
    try {
      const data = await apiGet<User[]>('/api/auth/users');
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await apiPost('/api/auth/users', { name, email, password });
      setSuccess(`User ${email} created successfully`);
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="page-breadcrumb mb-1">
          Settings <span className="page-breadcrumb-sep">/</span> <span className="text-[#94A3B8]">Users & Auth</span>
        </div>
        <h1 className="text-2xl font-bold text-[#F1F5F9]">Settings</h1>
        <p className="text-sm text-[#64748B] mt-1">Manage users and authentication</p>
      </div>

      {/* Profile Section */}
      <div className="dark-card p-5">
        <h2 className="text-base font-bold text-[#F1F5F9] mb-4">Your Profile</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[#64748B]">Name:</span>
            <p className="text-[#F1F5F9] font-medium">{user?.name || '-'}</p>
          </div>
          <div>
            <span className="text-[#64748B]">Email:</span>
            <p className="text-[#F1F5F9] font-medium">{user?.email || '-'}</p>
          </div>
          <div>
            <span className="text-[#64748B]">Role:</span>
            <p className="text-[#F1F5F9] font-medium capitalize">{user?.role || '-'}</p>
          </div>
        </div>
      </div>

      {/* Add User Section (Admin Only) */}
      {isAdmin && (
        <div className="dark-card p-5">
          <h2 className="text-base font-bold text-[#F1F5F9] mb-4">Add User</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-sm text-[#EF4444]">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] text-sm text-[#3B82F6]">
              {success}
            </div>
          )}

          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Full name"
              required
              className="px-3 py-2.5 rounded-lg bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.12)]
                text-[#F1F5F9] text-sm placeholder:text-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              required
              className="px-3 py-2.5 rounded-lg bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.12)]
                text-[#F1F5F9] text-sm placeholder:text-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="px-3 py-2.5 rounded-lg bg-[rgba(148,163,184,0.06)] border border-[rgba(148,163,184,0.12)]
                text-[#F1F5F9] text-sm placeholder:text-[#64748B] focus:outline-none focus:border-[#3B82F6]"
            />
            <button
              type="submit"
              className="py-2.5 px-4 rounded-lg bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-semibold transition-all"
            >
              Add User
            </button>
          </form>

          {/* Users List */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-[#F1F5F9] mb-3">All Users ({users.length})</h3>
            {loading ? (
              <div className="text-sm text-[#64748B]">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-sm text-[#64748B]">No users found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="dark-table w-full">
                  <thead>
                    <tr>
                      <th className="text-xs font-bold text-[#64748B] uppercase tracking-[0.08em] px-3 py-2 text-left">Name</th>
                      <th className="text-xs font-bold text-[#64748B] uppercase tracking-[0.08em] px-3 py-2 text-left">Email</th>
                      <th className="text-xs font-bold text-[#64748B] uppercase tracking-[0.08em] px-3 py-2 text-left">Role</th>
                      <th className="text-xs font-bold text-[#64748B] uppercase tracking-[0.08em] px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="font-medium text-[#F1F5F9]">{u.name}</td>
                        <td className="text-[#94A3B8] text-sm">{u.email}</td>
                        <td>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            u.role === 'admin'
                              ? 'bg-[rgba(59,130,246,0.1)] text-[#3B82F6]'
                              : 'bg-[rgba(148,163,184,0.1)] text-[#94A3B8]'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-dot ${u.is_active ? 'status-dot-new' : 'status-dot-dismissed'}`} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Non-admin message */}
      {!isAdmin && !loading && (
        <div className="dark-card p-5">
          <p className="text-sm text-[#64748B]">User management is only available for admins.</p>
        </div>
      )}
    </div>
  );
}
