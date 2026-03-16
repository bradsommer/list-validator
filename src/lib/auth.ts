import { getServerSupabase } from './supabase';
import type { UserRole } from './permissions';

export interface User {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  accountId: string | null;
  accountName: string | null;
  accountNumber: number | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface AccountOption {
  userId: string;
  accountId: string;
  accountName: string;
  accountNumber: number | null;
  role: UserRole;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
  accounts?: AccountOption[];
}

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Login user with username and password.
// If the user belongs to multiple accounts, returns the accounts list
// so the frontend can show an account selector.
export async function loginUser(username: string, password: string): Promise<AuthResult> {
  try {
    // Find ALL user records for this email (could be in multiple accounts)
    const { data: users, error: userError } = await getServerSupabase()
      .from('users')
      .select('*, account:accounts(id, name, account_number)')
      .eq('username', username.toLowerCase().trim())
      .eq('is_active', true);

    if (userError || !users || users.length === 0) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Find a record with a password_hash to verify against
    const userWithPassword = users.find((u) => u.password_hash);
    if (!userWithPassword) {
      return { success: false, error: 'Please check your email for the invitation link to set up your account.' };
    }

    // Verify password using Supabase RPC
    const { data: isValid, error: verifyError } = await getServerSupabase().rpc('verify_password', {
      password: password,
      password_hash: userWithPassword.password_hash,
    });

    if (verifyError || !isValid) {
      return { success: false, error: 'Invalid username or password' };
    }

    // If multiple active accounts, return the list for the account selector
    if (users.length > 1) {
      // Create session for the first account (can be switched later)
      const firstUser = users[0];
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await getServerSupabase().from('user_sessions').insert({
        user_id: firstUser.id,
        token,
        expires_at: expiresAt.toISOString(),
      });

      await getServerSupabase()
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', firstUser.id);

      const firstAccount = firstUser.account as { id: string; name: string; account_number: number | null } | null;

      return {
        success: true,
        token,
        user: {
          id: firstUser.id,
          username: firstUser.username,
          firstName: firstUser.first_name,
          lastName: firstUser.last_name,
          role: firstUser.role,
          accountId: firstAccount?.id || null,
          accountName: firstAccount?.name || null,
          accountNumber: firstAccount?.account_number ?? null,
          isActive: firstUser.is_active,
          lastLogin: firstUser.last_login,
          createdAt: firstUser.created_at,
        },
        accounts: users.map((u) => {
          const acc = u.account as { id: string; name: string; account_number: number | null } | null;
          return {
            userId: u.id,
            accountId: acc?.id || '',
            accountName: acc?.name || 'Unknown Account',
            accountNumber: acc?.account_number ?? null,
            role: u.role,
          };
        }),
      };
    }

    // Single account — standard login flow
    const user = users[0];
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { error: sessionError } = await getServerSupabase().from('user_sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      return { success: false, error: 'Failed to create session' };
    }

    await getServerSupabase()
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    // Bootstrap: if this user is an admin and no super_admin exists,
    // auto-promote them to super_admin so there's always a system admin.
    let effectiveRole = user.role;
    if (user.role === 'admin') {
      const { data: superAdmins } = await getServerSupabase()
        .from('users')
        .select('id')
        .eq('role', 'super_admin')
        .limit(1);

      if (!superAdmins || superAdmins.length === 0) {
        await getServerSupabase()
          .from('users')
          .update({ role: 'super_admin' })
          .eq('id', user.id);
        effectiveRole = 'super_admin';
      }
    }

    const account = user.account as { id: string; name: string; account_number: number | null } | null;
    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: effectiveRole,
        accountId: account?.id || null,
        accountName: account?.name || null,
        accountNumber: account?.account_number ?? null,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

// Select a specific account (switch session to a different user record for the same email)
export async function selectAccount(
  currentToken: string,
  targetUserId: string
): Promise<AuthResult> {
  try {
    // Validate current session to get the logged-in username
    const currentUser = await validateSession(currentToken);
    if (!currentUser) {
      return { success: false, error: 'Session expired' };
    }

    // Verify the target user record belongs to the same email
    const { data: targetUser, error: targetError } = await getServerSupabase()
      .from('users')
      .select('*, account:accounts(id, name, account_number)')
      .eq('id', targetUserId)
      .eq('username', currentUser.username)
      .eq('is_active', true)
      .single();

    if (targetError || !targetUser) {
      return { success: false, error: 'Invalid account selection' };
    }

    // Delete old session
    await getServerSupabase().from('user_sessions').delete().eq('token', currentToken);

    // Create new session for the target user record
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const { error: sessionError } = await getServerSupabase().from('user_sessions').insert({
      user_id: targetUser.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      return { success: false, error: 'Failed to create session' };
    }

    await getServerSupabase()
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', targetUser.id);

    const account = targetUser.account as { id: string; name: string; account_number: number | null } | null;
    return {
      success: true,
      token,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        firstName: targetUser.first_name,
        lastName: targetUser.last_name,
        role: targetUser.role,
        accountId: account?.id || null,
        accountName: account?.name || null,
        accountNumber: account?.account_number ?? null,
        isActive: targetUser.is_active,
        lastLogin: targetUser.last_login,
        createdAt: targetUser.created_at,
      },
    };
  } catch (error) {
    console.error('Select account error:', error);
    return { success: false, error: 'An error occurred' };
  }
}

// Logout user
export async function logoutUser(token: string): Promise<boolean> {
  try {
    const { error } = await getServerSupabase().from('user_sessions').delete().eq('token', token);
    return !error;
  } catch {
    return false;
  }
}

// Validate session token and return user
export async function validateSession(token: string): Promise<User | null> {
  try {
    const { data: session, error: sessionError } = await getServerSupabase()
      .from('user_sessions')
      .select('*, user:users(*, account:accounts(id, name, account_number))')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.user) {
      return null;
    }

    const user = session.user;
    const account = user.account as { id: string; name: string; account_number: number | null } | null;
    return {
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      accountId: account?.id || null,
      accountName: account?.name || null,
      accountNumber: account?.account_number ?? null,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
    };
  } catch {
    return null;
  }
}

// Create a new user (admin only)
export async function createUser(
  username: string,
  password: string,
  firstName: string,
  lastName: string,
  role: UserRole,
  createdById?: string
): Promise<AuthResult> {
  try {
    // Hash password using Supabase RPC
    const { data: passwordHash, error: hashError } = await getServerSupabase().rpc('hash_password', {
      password,
    });

    if (hashError || !passwordHash) {
      return { success: false, error: 'Failed to hash password' };
    }

    // Create user
    const { data: user, error: createError } = await getServerSupabase()
      .from('users')
      .insert({
        username: username.toLowerCase().trim(),
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        role,
        created_by: createdById,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        return { success: false, error: 'This user already exists in this account' };
      }
      return { success: false, error: 'Failed to create user' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        accountId: user.account_id || null,
        accountName: null,
        accountNumber: null,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
      },
    };
  } catch (error) {
    console.error('Create user error:', error);
    return { success: false, error: 'An error occurred while creating user' };
  }
}

// Update user password (admin only) — syncs across all accounts for same email
export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    const { data: passwordHash, error: hashError } = await getServerSupabase().rpc('hash_password', {
      password: newPassword,
    });

    if (hashError || !passwordHash) return false;

    const { error } = await getServerSupabase()
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    if (error) return false;

    // Sync password across all accounts for this email
    const { data: thisUser } = await getServerSupabase()
      .from('users')
      .select('username')
      .eq('id', userId)
      .single();

    if (thisUser) {
      await getServerSupabase()
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('username', thisUser.username)
        .neq('id', userId);
    }

    return true;
  } catch {
    return false;
  }
}

// Get all users (admin only)
export async function getAllUsers(): Promise<User[]> {
  try {
    const { data: users, error } = await getServerSupabase()
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !users) return [];

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      accountId: user.account_id || null,
      accountName: null,
      accountNumber: null,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
    }));
  } catch {
    return [];
  }
}

// Toggle user active status
export async function toggleUserStatus(userId: string, isActive: boolean): Promise<boolean> {
  try {
    const { error } = await getServerSupabase().from('users').update({ is_active: isActive }).eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}

// Delete user
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const { error } = await getServerSupabase().from('users').delete().eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}
