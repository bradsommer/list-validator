import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Look up the target user with account info
    const { data: targetUser, error } = await supabase
      .from('users')
      .select('*, account:accounts(name)')
      .eq('id', userId)
      .single();

    if (error || !targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const account = targetUser.account as { name: string } | null;

    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        firstName: targetUser.first_name,
        lastName: targetUser.last_name,
        role: targetUser.role,
        accountId: targetUser.account_id,
        accountName: account?.name || null,
        isActive: targetUser.is_active,
        lastLogin: targetUser.last_login,
        createdAt: targetUser.created_at,
      },
    });
  } catch (error) {
    console.error('Impersonate error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
