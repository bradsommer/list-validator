'use client';

import { ReactNode, useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FreshSegmentsLogo } from '@/components/FreshSegmentsLogo';

interface AdminLayoutProps {
  children: ReactNode;
  hideChrome?: boolean;
}

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const baseNavItems: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
  { href: '/import', label: 'Import', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
];

// Permission-gated items
const rulesItem: NavItem = { href: '/rules', label: 'Rules', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' };
const questionsItem: NavItem = { href: '/import-questions', label: 'Import Questions', icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' };
const headingsItem: NavItem = { href: '/column-headings', label: 'Output Headings', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' };
const billingItem: NavItem = { href: '/billing', label: 'Billing', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' };

const accountItem: NavItem = { href: '/admin/account', label: 'Account', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' };

const settingsNavItems: NavItem[] = [
  { href: '/admin/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
  { href: '/admin/integrations', label: 'Integrations', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
];

const companyAdminNavItems: NavItem[] = [
  { href: '/company-admin', label: 'Overview', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { href: '/company-admin/accounts', label: 'Accounts', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
];

function SidebarNavItem({ href, label, icon, isActive }: { href: string; label: string; icon: string; isActive: boolean }) {
  return (
    <li>
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-gray-100 text-gray-900'
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

export function AdminLayout({ children, hideChrome = false }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    user, logout, isAdmin, isCompanyAdmin, isSuperAdmin,
    subscriptionInactive,
    accounts,
    impersonating, stopImpersonating,
    isLoading, isAuthenticated,
    canView: userCanView,
    selectAccount,
  } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState<string | null>(null);
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

  // Build main nav items based on permissions
  const isBillingRole = user?.role === 'billing';
  const mainNavItems = useMemo(() => {
    // Inactive subscription: no main nav items
    if (subscriptionInactive) return [];
    // Billing users only see Dashboard (Import is excluded)
    if (isBillingRole) return [baseNavItems[0]];
    return [...baseNavItems];
  }, [isBillingRole, subscriptionInactive]);

  const configureNavItems = useMemo(() => {
    if (subscriptionInactive || isBillingRole) return [];
    const items: NavItem[] = [];
    if (isAdmin || userCanView('rules')) items.push(rulesItem);
    if (isAdmin || userCanView('questions')) items.push(questionsItem);
    if (isAdmin || userCanView('column_headings')) items.push(headingsItem);
    return items;
  }, [isAdmin, isBillingRole, subscriptionInactive, userCanView]);

  // Build settings nav items based on permissions
  const visibleSettingsItems = useMemo(() => {
    // Inactive subscription: only show billing
    if (subscriptionInactive) return [billingItem];
    const items: NavItem[] = [];
    if (isAdmin) {
      items.push(settingsNavItems[0]); // Users
    }
    if (isAdmin || userCanView('integrations')) {
      items.push(settingsNavItems[1]); // Integrations
    }
    if (isAdmin || userCanView('billing')) {
      items.push(billingItem);
    }
    if (isAdmin) {
      items.push(accountItem);
    }
    return items;
  }, [isAdmin, subscriptionInactive, userCanView]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-t-transparent rounded-full" style={{ borderColor: '#0b8377', borderTopColor: 'transparent' }} />
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

  const handleSwitchAccount = async (userId: string) => {
    setSwitchingAccount(userId);
    const result = await selectAccount(userId);
    if (result.success) {
      setUserMenuOpen(false);
      router.push('/');
    }
    setSwitchingAccount(null);
  };

  if (hideChrome) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Subscription inactive banner */}
      {subscriptionInactive && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>Your subscription is inactive. Resubscribe to regain full access. Your data will be retained for 45 days.</span>
          </div>
          <Link
            href="/billing"
            className="px-3 py-1 text-sm bg-white text-red-700 rounded-md hover:bg-red-50 font-medium shrink-0"
          >
            Manage Billing
          </Link>
        </div>
      )}

      {/* Impersonation banner */}
      {impersonating && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span>
              Viewing as <strong>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username}</strong>
              {user?.accountName && <span> ({user.accountName})</span>}
            </span>
          </div>
          <button
            onClick={stopImpersonating}
            className="px-3 py-1 text-sm bg-white text-amber-700 rounded-md hover:bg-amber-50 font-medium"
          >
            Back to {[impersonating.firstName, impersonating.lastName].filter(Boolean).join(' ') || impersonating.username}
          </button>
        </div>
      )}

      {/* Top header — full width */}
      <header className="bg-white border-b border-gray-200 shrink-0 z-10">
        <div className="flex items-center justify-between h-14 px-6">
          {/* Left: Logo */}
          <Link href="/">
            <FreshSegmentsLogo className="h-7" />
          </Link>

          {/* Right: Help icon + User dropdown */}
          <div className="flex items-center gap-2">
            <Link
              href="/documentation"
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              title="Documentation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </Link>
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
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.username}
                  </p>
                  {user?.username && (user?.firstName || user?.lastName) && (
                    <p className="text-xs text-gray-500 truncate">{user.username}</p>
                  )}
                  {user?.accountName && (
                    <p className="text-xs truncate mt-0.5" style={{ color: '#0B8377' }}>{user.accountName}</p>
                  )}
                </div>

                {/* Account switcher */}
                {accounts && accounts.length > 1 && (
                  <div className="border-b border-gray-100 py-1">
                    <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">Switch Account</p>
                    <div className="max-h-40 overflow-y-auto">
                      {accounts.map((account) => (
                        <button
                          key={account.userId}
                          onClick={() => handleSwitchAccount(account.userId)}
                          disabled={switchingAccount !== null || account.userId === user?.id}
                          className={`w-full text-left px-3 py-1.5 text-sm flex items-center justify-between ${
                            account.userId === user?.id
                              ? 'font-medium bg-teal-50 text-teal-700'
                              : 'text-gray-700 hover:bg-gray-50'
                          } disabled:opacity-60`}
                        >
                          <span className="truncate">{account.accountName}</span>
                          {switchingAccount === account.userId && (
                            <div className="animate-spin w-3 h-3 border-2 border-t-transparent rounded-full shrink-0 ml-2" style={{ borderColor: '#0b8377', borderTopColor: 'transparent' }} />
                          )}
                          {account.userId === user?.id && switchingAccount !== account.userId && (
                            <svg className="w-3.5 h-3.5 shrink-0 ml-2" style={{ color: '#0b8377' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href="/contact"
                  onClick={() => setUserMenuOpen(false)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Us
                </Link>
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
                  isActive={item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)}
                />
              ))}
            </ul>

            {/* Configure section */}
            {configureNavItems.length > 0 && (
              <>
                <hr className="my-4 border-gray-200" />
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Configure
                </div>
                <ul className="space-y-1">
                  {configureNavItems.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      {...item}
                      isActive={pathname === item.href || pathname.startsWith(item.href)}
                    />
                  ))}
                </ul>
              </>
            )}

            {/* Settings section (admin / permission-gated) */}
            {visibleSettingsItems.length > 0 && (
              <>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3">
                  Settings
                </div>
                <ul className="space-y-1">
                  {visibleSettingsItems.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      {...item}
                      isActive={pathname === item.href || pathname.startsWith(item.href)}
                    />
                  ))}
                </ul>
              </>
            )}

            {/* Company Admin section */}
            {isCompanyAdmin && (
              <>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-3">
                  Company Admin
                </div>
                <ul className="space-y-1">
                  {companyAdminNavItems.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      {...item}
                      isActive={item.href === '/company-admin' ? pathname === '/company-admin' : pathname.startsWith(item.href)}
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
              <p>&copy; {new Date().getFullYear()} FreshSegments. All rights reserved.</p>
              <div className="flex items-center gap-3">
                <Link href="/documentation" className="hover:text-gray-700 transition-colors">
                  Documentation
                </Link>
                <span>|</span>
                <Link href="/contact" className="hover:text-gray-700 transition-colors">
                  Contact Us
                </Link>
                <span>|</span>
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
