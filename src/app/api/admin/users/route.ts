import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendInviteEmail, sendAccountAcceptEmail } from '@/lib/email';
import { validatePassword } from '@/lib/passwordValidation';

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * POST /api/admin/users — Create a new user (invite flow)
 *
 * If the email already exists in another account AND has a password set,
 * the new user record copies the password_hash and receives an "accept invite"
 * email instead of a "set up your account" email.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, displayName, role, accountId, customPermissions } = body;

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Email address is required' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const normalizedEmail = username.toLowerCase().trim();

    // Check if this email already exists in any account
    const { data: existingUsers } = await supabase
      .from('users')
      .select('id, password_hash, display_name, account_id')
      .eq('username', normalizedEmail);

    // Block duplicate within the same account
    if (accountId && existingUsers?.some((u) => u.account_id === accountId)) {
      return NextResponse.json(
        { success: false, error: 'This user has already been invited to this account' },
        { status: 409 }
      );
    }

    const existingWithPassword = existingUsers?.find((u) => u.password_hash);
    const isExistingUser = !!existingWithPassword;

    // Build user insert
    const insertData: Record<string, unknown> = {
      username: normalizedEmail,
      password_hash: isExistingUser ? existingWithPassword.password_hash : null,
      display_name: displayName || existingWithPassword?.display_name || null,
      role: role || 'user',
      account_id: accountId || null,
      is_active: false, // Activated when user accepts invite / sets up account
    };

    if (role === 'custom' && customPermissions) {
      insertData.config = { permissions: customPermissions };
    }

    const { data: user, error: createError } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        // If we get here despite the pre-check, it likely means the old UNIQUE(username)
        // constraint is still in place. The migration 20260306_multi_account_users.sql
        // needs to be applied to allow the same email across different accounts.
        const isOldConstraint = createError.message?.includes('users_username_key');
        return NextResponse.json(
          {
            success: false,
            error: isOldConstraint
              ? 'Database migration required: run the 20260306_multi_account_users.sql migration to allow multi-account users'
              : 'This user has already been invited to this account',
          },
          { status: 409 }
        );
      }
      console.error('Create error:', createError);
      return NextResponse.json(
        { success: false, error: `Failed to create user: ${createError.message}` },
        { status: 500 }
      );
    }

    // Generate invite/accept token (48-hour expiry)
    const token = generateToken();

    const { error: tokenError } = await supabase.from('password_reset_tokens').insert({
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });

    if (tokenError) {
      console.error('Token error:', tokenError);
    }

    // Send appropriate email
    if (!tokenError) {
      if (isExistingUser) {
        // Existing user — send accept-only email (no password setup needed)
        await sendAccountAcceptEmail(normalizedEmail, displayName || '', token);
      } else {
        // New user — send full invite to set up password
        await sendInviteEmail(normalizedEmail, displayName || '', token);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        isActive: user.is_active,
      },
    });
  } catch (error) {
    console.error('Create user API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to create user: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users — Resend invite email for a pending user
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Fetch the user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.is_active) {
      return NextResponse.json(
        { success: false, error: 'User has already accepted their invite' },
        { status: 400 }
      );
    }

    // Delete any existing tokens for this user
    await supabase.from('password_reset_tokens').delete().eq('user_id', userId);

    // Generate new invite token (48-hour expiry)
    const token = generateToken();

    const { error: tokenError } = await supabase.from('password_reset_tokens').insert({
      user_id: userId,
      token,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });

    if (tokenError) {
      console.error('Token error:', tokenError);
      return NextResponse.json(
        { success: false, error: 'Failed to generate invite token' },
        { status: 500 }
      );
    }

    // If user already has a password (existing user invited to new account),
    // send accept email. Otherwise send full invite email.
    const emailSent = user.password_hash
      ? await sendAccountAcceptEmail(user.username, user.display_name || '', token)
      : await sendInviteEmail(user.username, user.display_name || '', token);

    if (!emailSent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send invite email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend invite API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to resend invite: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users — Update a user
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, displayName, role, password, customPermissions } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (displayName !== undefined) updates.display_name = displayName || null;
    if (role !== undefined) updates.role = role;

    if (role === 'custom' && customPermissions) {
      updates.config = { permissions: customPermissions };
    }

    // If password provided, validate and hash it server-side
    if (password) {
      const pwCheck = validatePassword(password);
      if (!pwCheck.valid) {
        return NextResponse.json(
          { success: false, error: pwCheck.error },
          { status: 400 }
        );
      }

      const { data: hash, error: hashError } = await supabase.rpc('hash_password', {
        password,
      });

      if (hashError || !hash) {
        return NextResponse.json(
          { success: false, error: 'Failed to hash password' },
          { status: 500 }
        );
      }

      updates.password_hash = hash;
    }

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { success: false, error: `Failed to update user: ${error.message}` },
        { status: 500 }
      );
    }

    // If password was changed, sync across all accounts for this email
    if (updates.password_hash) {
      const { data: thisUser } = await supabase
        .from('users')
        .select('username')
        .eq('id', id)
        .single();

      if (thisUser) {
        await supabase
          .from('users')
          .update({ password_hash: updates.password_hash as string })
          .eq('username', thisUser.username)
          .neq('id', id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to update user: ${message}` },
      { status: 500 }
    );
  }
}
