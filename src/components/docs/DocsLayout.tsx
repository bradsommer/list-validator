'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FreshSegmentsLogo } from '@/components/FreshSegmentsLogo';
import { useAuth } from '@/contexts/AuthContext';
import { appLink } from '@/lib/domainLinks';

interface NavItem {
  href: string;
  label: string;
}

const guidesNav: NavItem[] = [
  { href: '/documentation', label: 'Overview' },
  { href: '/docs/rules', label: 'Rules Configuration' },
  { href: '/docs/import-questions', label: 'Import Questions' },
  { href: '/docs/output-headings', label: 'Output Headings' },
  { href: '/docs/integrations', label: 'Integrations' },
];

const otherNav: NavItem[] = [
  { href: '/contact', label: 'Contact Us' },
];

export function DocsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#0b8377', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <FreshSegmentsLogo className="h-7" />
            </Link>
            <div className="flex items-center gap-4">
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
                    Sign In
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
          </div>
        </div>
      </nav>

      {/* Body: Sidebar + Content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Left sidebar */}
        <aside className="w-60 shrink-0 hidden lg:block border-r border-gray-200 bg-white">
          <nav className="sticky top-16 p-5 overflow-y-auto max-h-[calc(100vh-4rem)]">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Guides</h3>
            <ul className="space-y-1">
              {guidesNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      pathname === item.href
                        ? 'bg-teal-50 text-teal-700 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3">Support</h3>
            <ul className="space-y-1">
              {otherNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      pathname === item.href
                        ? 'bg-teal-50 text-teal-700 font-medium'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 px-6 sm:px-8 lg:px-12 py-10 max-w-4xl">
          {children}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <FreshSegmentsLogo className="h-6" dark />
            <div className="flex items-center gap-4 text-sm">
              <Link href="/documentation" className="hover:text-white transition-colors">Documentation</Link>
              <span className="text-gray-500">|</span>
              <Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link>
              <span className="text-gray-500">|</span>
              <Link href="/legal/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <span className="text-gray-500">|</span>
              <Link href="/legal/terms" className="hover:text-white transition-colors">Terms of Use</Link>
            </div>
            <p className="text-sm">&copy; {new Date().getFullYear()} FreshSegments. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
