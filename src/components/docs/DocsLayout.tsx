'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FreshSegmentsLogo } from '@/components/FreshSegmentsLogo';
import { useAuth } from '@/contexts/AuthContext';
import { appLink } from '@/lib/domainLinks';

const crmLinks = [
  { name: 'HubSpot', slug: 'hubspot' },
  { name: 'Salesforce', slug: 'salesforce' },
  { name: 'Dynamics 365', slug: 'dynamics' },
  { name: 'Pipedrive', slug: 'pipedrive' },
  { name: 'Zoho CRM', slug: 'zoho-crm' },
  { name: 'monday.com', slug: 'monday' },
  { name: 'Airtable', slug: 'airtable' },
];

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
  { href: '/contact', label: 'Contact' },
];

export function DocsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (resourcesRef.current && !resourcesRef.current.contains(e.target as Node)) {
        setResourcesOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-4">
              <div className="relative" ref={resourcesRef}>
                <button
                  onClick={() => setResourcesOpen(!resourcesOpen)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors inline-flex items-center gap-1"
                >
                  Resources
                  <svg className={`w-4 h-4 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {resourcesOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <Link
                      href="/resources"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
                      onClick={() => setResourcesOpen(false)}
                    >
                      All Resources
                    </Link>
                    <Link
                      href="/documentation"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setResourcesOpen(false)}
                    >
                      Help Center
                    </Link>
                    <div className="border-t border-gray-100 my-1" />
                    <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">CRMs</p>
                    {crmLinks.map((crm) => (
                      <Link
                        key={crm.slug}
                        href={`/resources/${crm.slug}`}
                        className="block px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                        onClick={() => setResourcesOpen(false)}
                      >
                        {crm.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
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
                href="/resources"
                className="block px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Resources
              </Link>
              <Link
                href="/documentation"
                className="block px-6 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Help Center
              </Link>
              <p className="px-6 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">CRMs</p>
              {crmLinks.map((crm) => (
                <Link
                  key={crm.slug}
                  href={`/resources/${crm.slug}`}
                  className="block px-6 py-1.5 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {crm.name}
                </Link>
              ))}
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
