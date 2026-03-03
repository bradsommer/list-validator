'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';

type Mode = 'password' | 'username';

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const endpoint = mode === 'password'
        ? '/api/auth/forgot-password'
        : '/api/auth/retrieve-username';

      const body = mode === 'password'
        ? { username: email }
        : { email };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Something went wrong');
      }
    } catch {
      setError('An error occurred. Please try again.');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'password' ? 'Reset Password' : 'Retrieve Username'}
            </h1>
            <p className="text-gray-500 mt-2 text-sm">
              {mode === 'password'
                ? 'Enter your email and we\'ll send you a reset link.'
                : 'Enter your email and we\'ll send you your username.'}
            </p>
          </div>

          {/* Toggle between modes */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 mb-6">
            <button
              onClick={() => { setMode('password'); setSubmitted(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'password' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Reset Password
            </button>
            <button
              onClick={() => { setMode('username'); setSubmitted(false); setError(''); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === 'username' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Retrieve Username
            </button>
          </div>

          {submitted ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-900 font-medium">Check your email</p>
              <p className="text-gray-500 text-sm mt-1">
                {mode === 'password'
                  ? 'If an account exists with that email, you\'ll receive a password reset link.'
                  : 'If an account exists with that email, you\'ll receive your username.'}
              </p>
              <Link
                href="/login"
                className="inline-block mt-6 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isSubmitting
                  ? 'Sending...'
                  : mode === 'password'
                  ? 'Send Reset Link'
                  : 'Send Username'}
              </button>
            </form>
          )}
        </div>
        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
