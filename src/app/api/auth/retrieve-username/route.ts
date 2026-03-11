import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { sendUsernameReminderEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by username (which is their email)
    const { data: user } = await supabase
      .from('users')
      .select('username')
      .eq('username', email.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    // Always return success to avoid enumeration
    if (user && user.username.includes('@')) {
      await sendUsernameReminderEmail(user.username, user.username);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Retrieve username error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
