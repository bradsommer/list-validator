import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/passwordValidation';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { success: false, error: pwCheck.error },
        { status: 400 }
      );
    }

    // Find valid token
    const { data: resetToken } = await getServerSupabase()
      .from('password_reset_tokens')
      .select('id, user_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (!resetToken) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Hash new password
    const { data: hash, error: hashError } = await getServerSupabase().rpc('hash_password', {
      password: newPassword,
    });

    if (hashError || !hash) {
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Update password
    await getServerSupabase()
      .from('users')
      .update({ password_hash: hash })
      .eq('id', resetToken.user_id);

    // Sync password across all accounts for this email
    const { data: thisUser } = await getServerSupabase()
      .from('users')
      .select('username')
      .eq('id', resetToken.user_id)
      .single();

    if (thisUser) {
      await getServerSupabase()
        .from('users')
        .update({ password_hash: hash })
        .eq('username', thisUser.username)
        .neq('id', resetToken.user_id);
    }

    // Delete used token
    await getServerSupabase()
      .from('password_reset_tokens')
      .delete()
      .eq('id', resetToken.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
