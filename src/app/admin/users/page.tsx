'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Development mode check
const DEV_MODE = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS !== 'false';

interface User {
  id: string;
  username: string;
  display_name: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    // Check if we're in dev mode by trying to connect to Supabase
    setIsDevMode(DEV_MODE);
  }, []);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'user' as 'admin' | 'user',
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      display_name: '',
      role: 'user',
    });
    setFormError('');
    setEditingUser(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Never show password
      display_name: user.display_name || '',
      role: user.role,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.username) {
      setFormError('Username is required');
      return;
    }

    if (!editingUser && !formData.password) {
      setFormError('Password is required for new users');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      if (editingUser) {
        // Update existing user
        const updates: Record<string, unknown> = {
          display_name: formData.display_name || null,
          role: formData.role,
        };

        // If password provided, hash it
        if (formData.password) {
          const { data: hash } = await supabase.rpc('hash_password', {
            password: formData.password,
          });
          updates.password_hash = hash;
        }

        const { error } = await supabase.from('users').update(updates).eq('id', editingUser.id);

        if (error) {
          setFormError('Failed to update user');
          return;
        }
      } else {
        // Create new user
        const { data: hash, error: hashError } = await supabase.rpc('hash_password', {
          password: formData.password,
        });

        if (hashError) {
          setFormError('Failed to hash password');
          return;
        }

        const { error } = await supabase.from('users').insert({
          username: formData.username.toLowerCase().trim(),
          password_hash: hash,
          display_name: formData.display_name || null,
          role: formData.role,
          created_by: currentUser?.id,
        });

        if (error) {
          if (error.code === '23505') {
            setFormError('Username already exists');
          } else {
            setFormError('Failed to create user');
          }
          return;
        }
      }

      setShowModal(false);
      resetForm();
      fetchUsers();
    } catch {
      setFormError('An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleActive = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert("You can't disable your own account");
      return;
    }

    try {
      await supabase.from('users').update({ is_active: !user.is_active }).eq('id', user.id);
      fetchUsers();
    } catch (err) {
      console.error('Error toggling user:', err);
    }
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert("You can't delete your own account");
      return;
    }

    if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) return;

    try {
      await supabase.from('users').delete().eq('id', user.id);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Dev mode notice
  if (isDevMode) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
            <p className="text-gray-500 text-sm mt-1">
              Create and manage user accounts.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="font-medium text-yellow-800 mb-2">Development Mode</h3>
            <p className="text-yellow-700 text-sm mb-4">
              User management requires a database connection. In development mode, use the default credentials:
            </p>
            <div className="bg-yellow-100 rounded p-3 font-mono text-sm">
              <div><span className="text-yellow-600">Email:</span> admin@example.com</div>
              <div><span className="text-yellow-600">Password:</span> admin123</div>
            </div>
            <p className="text-yellow-700 text-sm mt-4">
              To enable user management, connect Supabase and set <code className="bg-yellow-100 px-1 rounded">DEV_AUTH_BYPASS=false</code> in your environment.
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">User Management</h2>
            <p className="text-gray-500 text-sm mt-1">
              Create and manage user accounts. Users do not need email verification.
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Add User
          </button>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.display_name || user.username}
                        {user.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-gray-500">(you)</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {formatDate(user.last_login)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleActive(user)}
                        disabled={user.id === currentUser?.id}
                        className={`text-sm ${
                          user.id === currentUser?.id
                            ? 'text-gray-400 cursor-not-allowed'
                            : user.is_active
                            ? 'text-orange-600 hover:text-orange-700'
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {user.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser?.id}
                        className={`text-sm ${
                          user.id === currentUser?.id
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-700'
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">No users found.</div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingUser ? 'Edit User' : 'Add User'}
                </h3>

                <div className="space-y-4">
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                      {formError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={!!editingUser}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                      placeholder="Enter username"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {editingUser && '(leave blank to keep current)'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder={editingUser ? 'Enter new password' : 'Enter password'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Enter display name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 hover:text-gray-900"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
