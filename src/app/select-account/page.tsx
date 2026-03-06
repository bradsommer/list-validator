'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FreshSegmentsLogo } from '@/components/FreshSegmentsLogo';

const ROLE_LABEL: Record<string, string> = {
  company_admin: 'Company Admin',
  admin: 'Admin',
  billing: 'Billing',
  editor: 'Editor',
  custom: 'Custom',
  user: 'Standard User',
};

export default function SelectAccountPage() {
  const { user, accounts, selectAccount, logout, isLoading } = useAuth();
  const [isSelecting, setIsSelecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSelect = async (userId: string) => {
    setIsSelecting(userId);
    setError('');

    const result = await selectAccount(userId);

    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Failed to select account');
      setIsSelecting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !accounts || accounts.length === 0) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <FreshSegmentsLogo className="h-7" />
            <button
              onClick={() => logout()}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Select Account</h1>
              <p className="text-gray-500 mt-2 text-sm">
                Signed in as <span className="font-medium text-gray-700">{user.username}</span>
              </p>
              <p className="text-gray-400 text-sm mt-1">Choose which account to access.</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-3">
              {accounts.map((account) => (
                <button
                  key={account.userId}
                  onClick={() => handleSelect(account.userId)}
                  disabled={isSelecting !== null}
                  className={`w-full text-left px-4 py-4 rounded-lg border transition-colors ${
                    isSelecting === account.userId
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  } disabled:opacity-60`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{account.accountName}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {ROLE_LABEL[account.role] || account.role}
                      </div>
                    </div>
                    {isSelecting === account.userId ? (
                      <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full" />
                    ) : (
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
