import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/passwordValidation';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { success: false, error: 'Token and password are required' },
        { status: 400 }
      );
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { success: false, error: pwCheck.error },
        { status: 400 }
      );
    }

    // Find valid invite token
    const { data: resetToken } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!resetToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired invitation link. Please ask your administrator to resend the invite.' },
        { status: 400 }
      );
    }

    // Hash new password
    const { data: hash, error: hashError } = await supabase.rpc('hash_password', {
      password,
    });

    if (hashError || !hash) {
      return NextResponse.json(
        { success: false, error: 'Failed to set password' },
        { status: 500 }
      );
    }

    // Update user: set password and activate account
    await supabase
      .from('users')
      .update({ password_hash: hash, is_active: true })
      .eq('id', resetToken.user_id);

    // Delete used token
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('id', resetToken.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Setup account error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
