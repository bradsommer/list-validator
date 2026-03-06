import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/auth/accept-invite — Accept an account invitation (existing users only).
 * Activates the user record for the new account without requiring password setup.
 */
export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
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

    // Fetch the user to verify they already have a password (existing user)
    const { data: user } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', resetToken.user_id)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.password_hash) {
      // This user needs to set up a password — redirect them to setup-account instead
      return NextResponse.json(
        { success: false, error: 'Please use the account setup link to create your password first.', redirectToSetup: true },
        { status: 400 }
      );
    }

    // Activate the user record for this account
    await supabase
      .from('users')
      .update({ is_active: true })
      .eq('id', resetToken.user_id);

    // Delete used token
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('id', resetToken.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
