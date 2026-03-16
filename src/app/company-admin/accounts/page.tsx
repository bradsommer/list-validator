'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Account {
  id: string;
  name: string;
  slug: string;
  account_number: number | null;
  is_active: boolean;
  created_at: string;
}

interface AccountUser {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  is_active: boolean;
  last_login: string | null;
  account_id: string | null;
}

export default function CompanyAdminAccountsPage() {
  const { user, isCompanyAdmin, impersonate, impersonating, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [copyingConfigTo, setCopyingConfigTo] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<{ accountId: string; message: string; success: boolean } | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ message: string; success: boolean } | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState<{ accountId: string; message: string; success: boolean } | null>(null);

  useEffect(() => {
    if (!authLoading && !isCompanyAdmin) {
      router.push('/');
    }
  }, [authLoading, isCompanyAdmin, router]);

  useEffect(() => {
    if (!isCompanyAdmin) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/company-admin/accounts');
        const json = await res.json();

        setAccounts(json.accounts || []);
        setUsers(json.users || []);
      } catch (err) {
        console.error('Failed to fetch accounts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isCompanyAdmin]);

  const handleImpersonate = async (user: AccountUser) => {
    setImpersonatingId(user.id);
    const result = await impersonate(user.id);
    if (result.success) {
      router.push('/');
    }
    setImpersonatingId(null);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getUsersForAccount = (accountId: string) => {
    return users.filter((u) => u.account_id === accountId);
  };

  const handleCopyConfig = async (targetAccountId: string) => {
    const sourceAccountId = user?.accountId;
    if (!sourceAccountId) return;
    setCopyingConfigTo(targetAccountId);
    setCopyResult(null);
    try {
      const res = await fetch('/api/admin/copy-account-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceAccountId, targetAccountId }),
      });
      const data = await res.json();
      if (data.success) {
        setCopyResult({
          accountId: targetAccountId,
          message: `Copied ${data.rulesCopied} rules and ${data.questionsCopied} questions`,
          success: true,
        });
      } else {
        setCopyResult({ accountId: targetAccountId, message: data.error || 'Copy failed', success: false });
      }
    } catch {
      setCopyResult({ accountId: targetAccountId, message: 'Network error', success: false });
    } finally {
      setCopyingConfigTo(null);
    }
  };

  const handleCleanupOrphans = async () => {
    setCleaningUp(true);
    setCleanupResult(null);
    try {
      const res = await fetch('/api/cron/cleanup-orphaned-accounts', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCleanupResult({ message: data.message, success: true });
        // Refresh the accounts list
        if (data.deleted > 0) {
          const refreshRes = await fetch('/api/company-admin/accounts');
          const refreshData = await refreshRes.json();
          setAccounts(refreshData.accounts || []);
          setUsers(refreshData.users || []);
        }
      } else {
        setCleanupResult({ message: data.error || 'Cleanup failed', success: false });
      }
    } catch {
      setCleanupResult({ message: 'Network error', success: false });
    } finally {
      setCleaningUp(false);
    }
  };

  const handleDeleteAccount = async (account: Account) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${account.name}"${account.account_number ? ` (#${account.account_number})` : ''}? This will permanently remove the account and all its data.`
    );
    if (!confirmed) return;

    setDeletingAccount(account.id);
    setDeleteResult(null);
    try {
      const res = await fetch(`/api/company-admin/accounts/${account.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        setDeleteResult({ accountId: account.id, message: data.message, success: true });
        // Remove from local state
        setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      } else {
        setDeleteResult({ accountId: account.id, message: data.error || 'Delete failed', success: false });
      }
    } catch {
      setDeleteResult({ accountId: account.id, message: 'Network error', success: false });
    } finally {
      setDeletingAccount(null);
    }
  };

  const orphanedAccountCount = accounts.filter(
    (a) => getUsersForAccount(a.id).length === 0
  ).length;

  const unassignedUsers = users.filter((u) => !u.account_id);

  if (authLoading || (!isCompanyAdmin && !authLoading)) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <p className="text-gray-600">
            View all accounts and their users. Click an account to see its users and log in as any user for troubleshooting.
          </p>
          {orphanedAccountCount > 0 && (
            <button
              onClick={handleCleanupOrphans}
              disabled={cleaningUp}
              className="shrink-0 px-3 py-1.5 text-sm font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {cleaningUp ? 'Cleaning up...' : `Remove ${orphanedAccountCount} orphaned account${orphanedAccountCount !== 1 ? 's' : ''}`}
            </button>
          )}
        </div>
        {cleanupResult && (
          <div className={`px-4 py-2 rounded text-sm ${
            cleanupResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {cleanupResult.message}
          </div>
        )}
        {deleteResult && deleteResult.success && (
          <div className="px-4 py-2 rounded text-sm bg-green-50 text-green-700">
            {deleteResult.message}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
            Loading accounts...
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => {
              const acctUsers = getUsersForAccount(account.id);
              const isExpanded = expandedAccount === account.id;

              const isOrphaned = acctUsers.length === 0;

              return (
                <div key={account.id} className={`bg-white rounded-lg border overflow-hidden ${isOrphaned ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                  {/* Account header */}
                  <button
                    onClick={() => setExpandedAccount(isExpanded ? null : account.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{account.name}</span>
                          {account.account_number != null && (
                            <span className="px-1.5 py-0.5 text-xs font-mono bg-gray-100 text-gray-500 rounded">
                              #{account.account_number}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{account.slug}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {account.id !== user?.accountId && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyConfig(account.id);
                              }}
                              disabled={copyingConfigTo === account.id}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-primary-50 text-primary-600 hover:bg-primary-100 disabled:opacity-50 transition-colors"
                            >
                              {copyingConfigTo === account.id ? 'Copying...' : 'Apply My Rules & Questions'}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAccount(account);
                              }}
                              disabled={deletingAccount === account.id}
                              className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                              title="Delete this account"
                            >
                              {deletingAccount === account.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          account.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className="text-sm text-gray-500">{acctUsers.length} users</span>
                      </div>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Copy config result */}
                  {copyResult && copyResult.accountId === account.id && (
                    <div className={`mx-5 mb-3 px-3 py-2 rounded text-sm ${
                      copyResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {copyResult.message}
                    </div>
                  )}
                  {/* Delete result */}
                  {deleteResult && deleteResult.accountId === account.id && !deleteResult.success && (
                    <div className="mx-5 mb-3 px-3 py-2 rounded text-sm bg-red-50 text-red-700">
                      {deleteResult.message}
                    </div>
                  )}

                  {/* Users list */}
                  {isExpanded && (
                    <div className="border-t border-gray-200">
                      {acctUsers.length === 0 ? (
                        <div className="px-5 py-6 text-center text-sm text-gray-400">
                          No users in this account.
                        </div>
                      ) : (
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                              <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                              <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                              <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                              <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {acctUsers.map((u) => (
                              <tr key={u.id} className="hover:bg-gray-50">
                                <td className="px-5 py-3">
                                  <div className="font-medium text-gray-900 text-sm">{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}</div>
                                  <div className="text-xs text-gray-400">{u.username}</div>
                                </td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    u.role === 'company_admin'
                                      ? 'bg-primary-100 text-primary-700'
                                      : u.role === 'admin'
                                      ? 'bg-purple-100 text-purple-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {u.role === 'super_admin' ? 'Super Admin' : u.role === 'company_admin' ? 'Company Admin' : u.role}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {u.is_active ? 'Active' : 'Disabled'}
                                  </span>
                                </td>
                                <td className="px-5 py-3 text-sm text-gray-500">
                                  {formatDate(u.last_login)}
                                </td>
                                <td className="px-5 py-3 text-right">
                                  <button
                                    onClick={() => handleImpersonate(u)}
                                    disabled={!!impersonating || impersonatingId === u.id}
                                    className="text-sm text-amber-600 hover:text-amber-700 hover:underline disabled:opacity-50 disabled:no-underline"
                                  >
                                    {impersonatingId === u.id ? 'Switching...' : 'Login as user'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unassigned users */}
            {unassignedUsers.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 bg-yellow-50 border-b border-yellow-200">
                  <div className="font-medium text-yellow-800">Unassigned Users ({unassignedUsers.length})</div>
                  <div className="text-xs text-yellow-600">Users not linked to any account.</div>
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-5 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {unassignedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <div className="font-medium text-gray-900 text-sm">{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}</div>
                          <div className="text-xs text-gray-400">{u.username}</div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            u.role === 'company_admin'
                              ? 'bg-primary-100 text-primary-700'
                              : u.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {u.role === 'company_admin' ? 'Company Admin' : u.role}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => handleImpersonate(u)}
                            disabled={!!impersonating || impersonatingId === u.id}
                            className="text-sm text-amber-600 hover:text-amber-700 hover:underline disabled:opacity-50 disabled:no-underline"
                          >
                            {impersonatingId === u.id ? 'Switching...' : 'Login as user'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {accounts.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-600 font-medium">No accounts found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
