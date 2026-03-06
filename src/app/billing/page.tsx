'use client';

import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';

export default function BillingPage() {
  const { subscriptionInactive } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResubscribing, setIsResubscribing] = useState(false);
  const [error, setError] = useState('');

  const handleManageBilling = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Unable to open billing portal');
      }
    } catch {
      setError('An error occurred. Please try again.');
    }

    setIsLoading(false);
  };

  const handleResubscribe = async () => {
    setIsResubscribing(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Unable to start checkout');
      }
    } catch {
      setError('An error occurred. Please try again.');
    }

    setIsResubscribing(false);
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <p className="text-gray-600">
            Manage your subscription, payment methods, and invoices through Stripe.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {subscriptionInactive && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">Subscription Inactive</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Your subscription has been cancelled. Your account and data will be retained for 45 days.
                  Resubscribe now to regain full access.
                </p>
                <button
                  onClick={handleResubscribe}
                  disabled={isResubscribing}
                  className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 text-sm font-medium"
                >
                  {isResubscribing ? 'Redirecting...' : 'Resubscribe'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Subscription & Billing</h3>
              <p className="text-sm text-gray-500 mt-1">
                View your current plan, update payment methods, download invoices, or cancel your subscription.
              </p>
              <button
                onClick={handleManageBilling}
                disabled={isLoading}
                className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 text-sm font-medium"
              >
                {isLoading ? 'Opening...' : 'Manage Billing'}
              </button>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-400">
          Billing is managed securely through Stripe. FreshSegments does not store your payment information.
        </div>
      </div>
    </AdminLayout>
  );
}
