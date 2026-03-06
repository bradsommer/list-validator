import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const user = await validateSession(token);

    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
      response.cookies.delete('auth_token');
      return response;
    }

    // Auto-create an account for users who don't have one
    if (!user.accountId) {
      try {
        const accountName = user.displayName
          ? `${user.displayName}'s Account`
          : user.username.split('@')[0] + "'s Account";
        const slug = user.username.split('@')[0] + '-' + Date.now();

        const { data: newAccount } = await supabase
          .from('accounts')
          .insert({ name: accountName, slug })
          .select()
          .single();

        if (newAccount) {
          await supabase
            .from('users')
            .update({ account_id: newAccount.id })
            .eq('id', user.id);

          user.accountId = newAccount.id;
          user.accountName = newAccount.name;
        }
      } catch (err) {
        console.error('Failed to auto-create account:', err);
      }
    }

    // Check subscription status for non-admin users
    if (user.role !== 'super_admin' && user.role !== 'company_admin' && user.role !== 'admin') {
      const { data: dbUser } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      if (dbUser?.subscription_status === 'canceled' || dbUser?.subscription_status === 'cancelled') {
        const response = NextResponse.json(
          { success: false, error: 'Your subscription has been cancelled.' },
          { status: 403 }
        );
        response.cookies.delete('auth_token');
        return response;
      }
    }

    // Fetch accounts for multi-account users (same email, different accounts)
    let accounts: { userId: string; accountId: string; accountName: string; role: string }[] = [];
    if (user.username) {
      const { data: userRows } = await supabase
        .from('users')
        .select('id, role, account_id, accounts!inner(id, name)')
        .eq('username', user.username)
        .eq('is_active', true);

      if (userRows && userRows.length > 1) {
        accounts = userRows.map((row: Record<string, unknown>) => {
          const acct = row.accounts as Record<string, unknown>;
          return {
            userId: row.id as string,
            accountId: acct.id as string,
            accountName: acct.name as string,
            role: row.role as string,
          };
        });
      }
    }

    return NextResponse.json({ success: true, user, accounts: accounts.length > 1 ? accounts : undefined });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
