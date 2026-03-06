'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { getPermissions, type PermissionMap, type PermissionArea, type UserRole, canView, canEdit } from '@/lib/permissions';

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  accountId: string | null;
  accountName: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  customPermissions?: Partial<PermissionMap>;
}

export interface AccountOption {
  userId: string;
  accountId: string;
  accountName: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  accounts: AccountOption[] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isCompanyAdmin: boolean;
  permissions: PermissionMap;
  canView: (area: PermissionArea) => boolean;
  canEdit: (area: PermissionArea) => boolean;
  impersonating: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string; accounts?: AccountOption[] }>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  selectAccount: (userId: string) => Promise<{ success: boolean; error?: string }>;
  impersonate: (userId: string) => Promise<{ success: boolean; error?: string }>;
  stopImpersonating: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [realUser, setRealUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        setRealUser(null);

        if (data.accounts && data.accounts.length > 1) {
          setAccounts(data.accounts);
          return { success: true, accounts: data.accounts };
        }

        setAccounts(null);
        return { success: true };
      }

      return { success: false, error: data.error || 'Login failed' };
    } catch {
      return { success: false, error: 'An error occurred during login' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setRealUser(null);
      setAccounts(null);
    }
  };

  const selectAccount = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/select-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setUser(data.user);
        setRealUser(null);
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to select account' };
    } catch {
      return { success: false, error: 'An error occurred' };
    }
  };

  const impersonate = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (data.success && data.user) {
        setRealUser(user);
        setUser(data.user);
        return { success: true };
      }

      return { success: false, error: data.error || 'Impersonation failed' };
    } catch {
      return { success: false, error: 'An error occurred' };
    }
  };

  const stopImpersonating = () => {
    if (realUser) {
      setUser(realUser);
      setRealUser(null);
    }
  };

  const activeRole = (realUser ? realUser.role : user?.role) as UserRole | undefined;
  const activeCustomPerms = realUser ? realUser.customPermissions : user?.customPermissions;

  const permissions = useMemo(
    () => getPermissions((activeRole || 'user') as UserRole, activeCustomPerms),
    [activeRole, activeCustomPerms]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accounts,
        isLoading,
        isAuthenticated: !!user,
        isAdmin: activeRole === 'admin' || activeRole === 'company_admin',
        isCompanyAdmin: activeRole === 'company_admin',
        permissions,
        canView: (area: PermissionArea) => canView(permissions, area),
        canEdit: (area: PermissionArea) => canEdit(permissions, area),
        impersonating: realUser,
        login,
        logout,
        checkSession,
        selectAccount,
        impersonate,
        stopImpersonating,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
