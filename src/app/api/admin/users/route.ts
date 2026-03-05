import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { sendWelcomeEmail } from '@/lib/email';

/**
 * POST /api/admin/users — Create a new user
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const body = await request.json();
    const { username, password, displayName, role, accountId, sendEmail, customPermissions } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Hash password via Supabase RPC
    const { data: hash, error: hashError } = await supabase.rpc('hash_password', {
      password,
    });

    if (hashError || !hash) {
      console.error('Hash error:', hashError);
      return NextResponse.json(
        { success: false, error: 'Failed to hash password' },
        { status: 500 }
      );
    }

    // Build user insert
    const insertData: Record<string, unknown> = {
      username: username.toLowerCase().trim(),
      password_hash: hash,
      display_name: displayName || null,
      role: role || 'user',
      account_id: accountId || null,
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
          { success: false, error: 'Username already exists' },
          { status: 409 }
        );
      }
      console.error('Create error:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Send welcome email if requested
    if (sendEmail && username.includes('@')) {
      await sendWelcomeEmail(username, displayName || '', password);
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
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while creating the user. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/users — Update a user
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
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

    // If password provided, hash it server-side
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { success: false, error: 'Password must be at least 6 characters' },
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
        { success: false, error: 'Failed to update user' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user API error:', error);
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred while updating the user. Please try again.' },
      { status: 500 }
    );
  }
}
