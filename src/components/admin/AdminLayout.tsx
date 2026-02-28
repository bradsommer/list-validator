'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface AdminLayoutProps {
  children: ReactNode;
}

const mainNavItems = [
  { href: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { href: '/import', label: 'Import', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
];

const outputSettingsNavItems = [
  { href: '/rules', label: 'Rules', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { href: '/import-questions', label: 'Questions', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { href: '/column-headings', label: 'Column Headings', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
];

const adminNavItems = [
  { href: '/admin/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { href: '/admin/integrations', label: 'Integrations', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
];


function SidebarNavItem({ href, label, icon, isActive }: { href: string; label: string; icon: string; isActive: boolean }) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-primary-50 text-primary-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={icon}
          />
        </svg>
        {label}
      </Link>
    </li>
  );
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAdmin, isLoading, isAuthenticated } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    router.push('/login');
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top header — full width */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="flex items-center justify-between h-14 px-6">
          {/* Left: Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-hubspot-orange rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">List Validator</span>
          </Link>

          {/* Right: User dropdown */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {user?.displayName || user?.username}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.displayName || user?.username}
                  </p>
                  {user?.username && user?.displayName && (
                    <p className="text-xs text-gray-500 truncate">{user.username}</p>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Body: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
          <nav className="flex-1 p-4 overflow-y-auto">
            {/* Main navigation */}
            <ul className="space-y-1">
              {mainNavItems.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  {...item}
                  isActive={item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(item.href + '/')}
                />
              ))}
            </ul>

            {/* Divider */}
            <hr className="my-4 border-gray-200" />

            {/* Output Settings section */}
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Output Settings
            </div>
            <ul className="space-y-1">
              {outputSettingsNavItems.map((item) => (
                <SidebarNavItem
                  key={item.href}
                  {...item}
                  isActive={pathname.startsWith(item.href)}
                />
              ))}
            </ul>

            {/* Admin section */}
            {isAdmin && (
              <>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3">
                  Settings
                </div>
                <ul className="space-y-1">
                  {adminNavItems.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      {...item}
                      isActive={pathname === item.href}
                    />
                  ))}
                </ul>
              </>
            )}
          </nav>
        </aside>

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-auto">
          {/* Page content */}
          <main className="flex-1 p-6">
            {children}
          </main>

          {/* Footer */}
          <footer className="shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
              <p>&copy; {new Date().getFullYear()} List Validator. All rights reserved.</p>
              <div className="flex items-center gap-3">
                <Link href="/legal/privacy" className="hover:text-gray-700 transition-colors">
                  Privacy Policy
                </Link>
                <span>|</span>
                <Link href="/legal/terms" className="hover:text-gray-700 transition-colors">
                  Terms of Use
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
