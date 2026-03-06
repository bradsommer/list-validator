'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';
  const [isAccepting, setIsAccepting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    // Auto-accept on load
    setIsAccepting(true);
    fetch('/api/auth/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (data.success) {
          setSuccess(true);
        } else if (data.redirectToSetup) {
          // User doesn't have a password yet — redirect to setup-account
          router.replace(`/setup-account?token=${token}`);
        } else {
          setError(data.error || 'Failed to accept invitation');
        }
      })
      .catch(() => {
        setError('Unable to reach the server. Please try again.');
      })
      .finally(() => {
        setIsAccepting(false);
      });
  }, [token, router]);

  if (!token) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Invalid invitation link. Please ask your administrator to resend the invite.</p>
      </div>
    );
  }

  if (isAccepting) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Accepting invitation...</p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-900 font-medium">Invitation accepted!</p>
        <p className="text-gray-500 text-sm mt-1">You now have access to this account. Sign in to get started.</p>
        <Link
          href="/login"
          className="inline-block mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}
      <Link
        href="/login"
        className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
      >
        Go to Sign In
      </Link>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Accept Invitation</h1>
            <p className="text-gray-500 mt-2 text-sm">Join a new account on FreshSegments.</p>
          </div>
          <Suspense fallback={<div className="text-center py-4 text-gray-500">Loading...</div>}>
            <AcceptInviteForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
