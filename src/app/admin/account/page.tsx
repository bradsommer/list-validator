'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function AccountSettingsPage() {
  const { user, isAdmin, checkSession } = useAuth();
  const [accountName, setAccountName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user?.accountId) return;

    const fetchAccount = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('accounts')
          .select('name')
          .eq('id', user.accountId)
          .single();

        if (data) {
          setAccountName(data.name);
          setOriginalName(data.name);
        }
      } catch (err) {
        console.error('Error fetching account:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccount();
  }, [user?.accountId]);

  const handleSave = async () => {
    if (!user?.accountId || !accountName.trim()) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const { error } = await supabase
        .from('accounts')
        .update({ name: accountName.trim() })
        .eq('id', user.accountId);

      if (error) {
        setSaveMessage({ type: 'error', text: 'Failed to update company name.' });
      } else {
        setOriginalName(accountName.trim());
        setSaveMessage({ type: 'success', text: 'Company name updated.' });
        // Refresh session so the header reflects the new name
        await checkSession();
      }
    } catch {
      setSaveMessage({ type: 'error', text: 'Unable to reach the server.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-500">You do not have permission to view this page.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Account Settings</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your account configuration.</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    setSaveMessage(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Enter company name"
                />
              </div>

              {saveMessage && (
                <div className={`text-sm px-3 py-2 rounded-lg ${
                  saveMessage.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {saveMessage.text}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={isSaving || accountName.trim() === originalName || !accountName.trim()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
