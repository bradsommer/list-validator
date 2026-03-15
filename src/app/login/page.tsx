'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FreshSegmentsLogo } from '@/components/FreshSegmentsLogo';
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#0b8377', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <a href={marketingLink('/')}>
              <FreshSegmentsLogo className="h-7" />
            </a>
            <a
              href={marketingLink('/')}
              className="px-4 py-2 text-sm font-medium"
              style={{ color: '#0B8377' }}
            >
              Back to Home
            </a>
          </div>
        </div>
      </nav>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
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
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <FreshSegmentsLogo className="h-6" dark />
            <div className="flex items-center gap-4 text-sm">
              <a href={marketingLink('/documentation')} className="hover:text-white transition-colors">
                Documentation
              </a>
              <span className="text-gray-500">|</span>
              <a href={marketingLink('/contact')} className="hover:text-white transition-colors">
                Contact Us
              </a>
              <span className="text-gray-500">|</span>
              <a href={marketingLink('/legal/privacy')} className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <span className="text-gray-500">|</span>
              <a href={marketingLink('/legal/terms')} className="hover:text-white transition-colors">
                Terms of Use
              </a>
              <span className="text-gray-500">|</span>
              <button onClick={() => { import('vanilla-cookieconsent').then(cc => cc.showPreferences()); }} className="hover:text-white transition-colors">
                Privacy Choices
              </button>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} FreshSegments. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
