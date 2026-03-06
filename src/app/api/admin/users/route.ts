import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendInviteEmail } from '@/lib/email';
import { validatePassword } from '@/lib/passwordValidation';

/**
 * POST /api/admin/users — Create a new user (invite flow, no password)
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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Build user insert — no password_hash; user sets password via invite link
    const insertData: Record<string, unknown> = {
      username: username.toLowerCase().trim(),
      password_hash: null,
      display_name: displayName || null,
      role: role || 'user',
      account_id: accountId || null,
      is_active: false,
    };

    // Store custom permissions in config column if role is custom
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
        return NextResponse.json(
          { success: false, error: 'A user with this email already exists' },
          { status: 409 }
        );
      }
      console.error('Create error:', createError);
      return NextResponse.json(
        { success: false, error: `Failed to create user: ${createError.message}` },
        { status: 500 }
      );
    }

    // Generate invite token (48-hour expiry)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

    const { error: tokenError } = await supabase.from('password_reset_tokens').insert({
      user_id: user.id,
      token,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });

    if (tokenError) {
      console.error('Token error:', tokenError);
      // Still created the user — admin can resend invite later
    }

    // Send invite email
    if (!tokenError) {
      await sendInviteEmail(username.toLowerCase().trim(), displayName || '', token);
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

    if (user.password_hash) {
      return NextResponse.json(
        { success: false, error: 'User has already set up their account' },
        { status: 400 }
      );
    }

    // Delete any existing tokens for this user
    await supabase.from('password_reset_tokens').delete().eq('user_id', userId);

    // Generate new invite token (48-hour expiry)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');

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

    const emailSent = await sendInviteEmail(
      user.username,
      user.display_name || '',
      token
    );

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
