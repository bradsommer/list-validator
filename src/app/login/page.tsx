'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FreshSegmentsLogo } from '@/components/FreshSegmentsLogo';
import { PublicLayout } from '@/components/PublicLayout';
import { marketingLink } from '@/lib/domainLinks';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading, accounts } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  if (!isLoading && isAuthenticated) {
    if (accounts && accounts.length > 1) {
      router.push('/select-account');
    } else {
      router.push('/');
    }
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(username, password);

    if (result.success) {
      if (result.accounts && result.accounts.length > 1) {
        router.push('/select-account');
      } else {
        router.push('/');
      }
    } else {
      setError(result.error || 'Login failed');
    }

    setIsSubmitting(false);
  };

  return (
    <PublicLayout centerContent>
      <div className="max-w-md w-full">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Sign In</h1>
            <p className="text-gray-500 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                id="username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Enter your email address"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 text-white rounded-lg disabled:cursor-not-allowed transition-colors font-medium disabled:opacity-60"
              style={{ backgroundColor: '#0B8377' }}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center">
              <a
                href={marketingLink('/forgot-password')}
                className="text-sm transition-colors"
                style={{ color: '#0B8377' }}
              >
                Forgot password or username?
              </a>
              <span className="text-gray-500">|</span>
              <button onClick={() => { import('vanilla-cookieconsent').then(cc => cc.showPreferences()); }} className="hover:text-white transition-colors">
                Privacy Choices
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <a href={marketingLink('/signup')} className="font-medium" style={{ color: '#0B8377' }}>
            Start Free Trial
          </a>
        </div>
      </div>
    </PublicLayout>
  );
}
