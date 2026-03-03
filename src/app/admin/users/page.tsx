'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  ROLE_OPTIONS,
  PERMISSION_AREAS,
  defaultCustomPermissions,
  type UserRole,
  type PermissionMap,
  type PermissionLevel,
} from '@/lib/permissions';

interface User {
  id: string;
  username: string;
  display_name: string | null;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  config?: { permissions?: Partial<PermissionMap> };
}

const ROLE_BADGE_CLASS: Record<string, string> = {
  company_admin: 'bg-indigo-100 text-indigo-700',
  admin: 'bg-purple-100 text-purple-700',
  billing: 'bg-emerald-100 text-emerald-700',
  editor: 'bg-blue-100 text-blue-700',
  custom: 'bg-orange-100 text-orange-700',
  user: 'bg-gray-100 text-gray-700',
};

const ROLE_LABEL: Record<string, string> = {
  company_admin: 'Company Admin',
  admin: 'Admin',
  billing: 'Billing',
  editor: 'Editor',
  custom: 'Custom',
  user: 'Standard User',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    display_name: '',
    role: 'user' as UserRole,
    sendEmail: true,
    customPermissions: defaultCustomPermissions(),
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
      setUsers((data || []) as User[]);
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
      sendEmail: true,
      customPermissions: defaultCustomPermissions(),
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
      password: '',
      display_name: user.display_name || '',
      role: user.role,
      sendEmail: false,
      customPermissions: user.config?.permissions
        ? { ...defaultCustomPermissions(), ...user.config.permissions }
        : defaultCustomPermissions(),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.username) {
      setFormError('Email address is required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.username)) {
      setFormError('Please enter a valid email address');
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
        // Update via API
        const res = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            displayName: formData.display_name,
            role: formData.role,
            password: formData.password || undefined,
            customPermissions: formData.role === 'custom' ? formData.customPermissions : undefined,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          setFormError(data.error || 'Failed to update user');
          return;
        }
      } else {
        // Create via API (server-side password hashing)
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            displayName: formData.display_name,
            role: formData.role,
            accountId: currentUser?.accountId,
            sendEmail: formData.sendEmail,
            customPermissions: formData.role === 'custom' ? formData.customPermissions : undefined,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          setFormError(data.error || 'Failed to create user');
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

  const updateCustomPermission = (area: string, level: PermissionLevel) => {
    setFormData((prev) => ({
      ...prev,
      customPermissions: { ...prev.customPermissions, [area]: level },
    }));
  };

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
              Create and manage user accounts. New users will receive a welcome email with their credentials.
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                      <div className="text-sm text-gray-500">{user.username}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${ROLE_BADGE_CLASS[user.role] || ROLE_BADGE_CLASS.user}`}>
                      {ROLE_LABEL[user.role] || user.role}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {user.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">{formatDate(user.last_login)}</td>
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
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
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

                  {/* Email Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      disabled={!!editingUser}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none disabled:bg-gray-100"
                      placeholder="user@company.com"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {editingUser && '(leave blank to keep current)'}
                    </label>
                    <input
                      type="password"
                      required={!editingUser}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder={editingUser ? 'Enter new password' : 'Enter password'}
                    />
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={formData.display_name}
                      onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      placeholder="Enter display name"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">
                      {ROLE_OPTIONS.find((o) => o.value === formData.role)?.description}
                    </p>
                  </div>

                  {/* Custom permissions grid */}
                  {formData.role === 'custom' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Custom Permissions</label>
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Area</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">None</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">View</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500">Edit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {PERMISSION_AREAS.map((area) => (
                              <tr key={area.key}>
                                <td className="px-3 py-2 text-gray-700">{area.label}</td>
                                {(['none', 'view', 'edit'] as PermissionLevel[]).map((level) => (
                                  <td key={level} className="px-3 py-2 text-center">
                                    <input
                                      type="radio"
                                      name={`perm-${area.key}`}
                                      checked={formData.customPermissions[area.key] === level}
                                      onChange={() => updateCustomPermission(area.key, level)}
                                      className="w-4 h-4 text-primary-500 focus:ring-primary-500"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Send welcome email toggle (new users only) */}
                  {!editingUser && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, sendEmail: !formData.sendEmail })}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          formData.sendEmail ? 'bg-primary-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            formData.sendEmail ? 'left-5' : 'left-0.5'
                          }`}
                        />
                      </button>
                      <label className="text-sm text-gray-700">
                        Send welcome email with login credentials
                      </label>
                    </div>
                  )}
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
