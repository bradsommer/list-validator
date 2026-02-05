import { supabase } from './supabase';
import { cookies } from 'next/headers';

export interface User {
  id: string;
  username: string;
  displayName: string | null;
  role: 'admin' | 'user';
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  stripeCustomerId: string | null;
  subscriptionStatus: string | null;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// Generate a secure random token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Login user with username and password
export async function loginUser(username: string, password: string): Promise<AuthResult> {
  try {
    // Find user and verify password using Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('username', username.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (userError || !user) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Verify password using Supabase RPC
    const { data: isValid, error: verifyError } = await supabase.rpc('verify_password', {
      password: password,
      password_hash: user.password_hash,
    });

    if (verifyError || !isValid) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Generate session token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create session
    const { error: sessionError } = await supabase.from('user_sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    if (sessionError) {
      return { success: false, error: 'Failed to create session' };
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        stripeCustomerId: user.stripe_customer_id,
        subscriptionStatus: user.subscription_status,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'An error occurred during login' };
  }
}

// Logout user
export async function logoutUser(token: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_sessions').delete().eq('token', token);
    return !error;
  } catch {
    return false;
  }
}

// Validate session token and return user
export async function validateSession(token: string): Promise<User | null> {
  try {
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*, user:users(*)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session || !session.user) {
      return null;
    }

    const user = session.user;
    return {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      stripeCustomerId: user.stripe_customer_id,
      subscriptionStatus: user.subscription_status,
    };
  } catch {
    return null;
  }
}

// Create a new user (admin only)
export async function createUser(
  username: string,
  password: string,
  displayName: string,
  role: 'admin' | 'user',
  createdById?: string
): Promise<AuthResult> {
  try {
    // Hash password using Supabase RPC
    const { data: passwordHash, error: hashError } = await supabase.rpc('hash_password', {
      password,
    });

    if (hashError || !passwordHash) {
      return { success: false, error: 'Failed to hash password' };
    }

    // Create user
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        username: username.toLowerCase().trim(),
        password_hash: passwordHash,
        display_name: displayName,
        role,
        created_by: createdById,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        return { success: false, error: 'Username already exists' };
      }
      return { success: false, error: 'Failed to create user' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        stripeCustomerId: user.stripe_customer_id,
        subscriptionStatus: user.subscription_status,
      },
    };
  } catch (error) {
    console.error('Create user error:', error);
    return { success: false, error: 'An error occurred while creating user' };
  }
}

// Update user password (admin only)
export async function updateUserPassword(userId: string, newPassword: string): Promise<boolean> {
  try {
    const { data: passwordHash, error: hashError } = await supabase.rpc('hash_password', {
      password: newPassword,
    });

    if (hashError || !passwordHash) return false;

    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    return !error;
  } catch {
    return false;
  }
}

// Get all users (admin only)
export async function getAllUsers(): Promise<User[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !users) return [];

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      isActive: user.is_active,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      stripeCustomerId: user.stripe_customer_id,
      subscriptionStatus: user.subscription_status,
    }));
  } catch {
    return [];
  }
}

// Toggle user active status
export async function toggleUserStatus(userId: string, isActive: boolean): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').update({ is_active: isActive }).eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}

// Delete user
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    return !error;
  } catch {
    return false;
  }
}
