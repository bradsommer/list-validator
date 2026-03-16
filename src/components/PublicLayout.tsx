'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { FreshSegmentsLogo } from '@/components/FreshSegmentsLogo';
import { useAuth } from '@/contexts/AuthContext';
import { appLink } from '@/lib/domainLinks';

export function PublicLayout({ children, maxWidth = 'max-w-5xl' }: { children: ReactNode; maxWidth?: string }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#0b8377', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <FreshSegmentsLogo className="h-7" />
            </Link>
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/documentation"
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Help Center
              </Link>
              {isAuthenticated ? (
                <a
                  href={appLink('/')}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                  style={{ backgroundColor: '#0B8377' }}
                >
                  Go to App
                </a>
              ) : (
                <>
                  <a
                    href={appLink('/login')}
                    className="px-4 py-2 text-sm font-medium"
                    style={{ color: '#0B8377' }}
                  >
                    Login
                  </a>
                  <Link
                    href="/signup"
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg"
                    style={{ backgroundColor: '#0B8377' }}
                  >
                    Start Free Trial
                  </Link>
                </>
              )}
            </div>
            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 text-gray-600 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
          {/* Mobile menu */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-100 py-2">
              <Link
                href="/documentation"
                className="block px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Help Center
              </Link>
              {isAuthenticated ? (
                <a
                  href={appLink('/')}
                  className="block px-4 py-2 text-sm font-medium text-white rounded-lg mx-4 mt-1 text-center"
                  style={{ backgroundColor: '#0B8377' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Go to App
                </a>
              ) : (
                <>
                  <a
                    href={appLink('/login')}
                    className="block px-4 py-2 text-sm font-medium hover:bg-gray-50"
                    style={{ color: '#0B8377' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login
                  </a>
                  <Link
                    href="/signup"
                    className="block px-4 py-2 text-sm font-medium text-white rounded-lg mx-4 mt-1 text-center"
                    style={{ backgroundColor: '#0B8377' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Start Free Trial
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Content */}
      <div className={`flex-1 ${maxWidth} mx-auto w-full px-4 sm:px-6 lg:px-8 py-12`}>
        {children}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <FreshSegmentsLogo className="h-6" dark />
            <div className="grid grid-cols-3 md:flex md:items-center gap-x-4 gap-y-2 text-sm text-center md:text-left">
              <Link href="/documentation" className="hover:text-white transition-colors">Documentation</Link>
              <span className="text-gray-500 hidden md:inline">|</span>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
              <span className="text-gray-500 hidden md:inline">|</span>
              <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span className="text-gray-500 hidden md:inline">|</span>
              <Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Use</Link>
              <span className="text-gray-500 hidden md:inline">|</span>
              <button onClick={() => { import('vanilla-cookieconsent').then(cc => cc.showPreferences()); }} className="hover:text-white transition-colors">Privacy Choices</button>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} FreshSegments. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
