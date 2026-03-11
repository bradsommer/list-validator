import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase';

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
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
        const accountName = fullName
          ? `${fullName}'s Account`
          : user.username.split('@')[0] + "'s Account";
        const slug = user.username.split('@')[0] + '-' + Date.now();

        const { data: newAccount } = await getServerSupabase()
          .from('accounts')
          .insert({ name: accountName, slug })
          .select()
          .single();

        if (newAccount) {
          await getServerSupabase()
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
    let subscriptionInactive = false;
    if (user.role !== 'super_admin' && user.role !== 'company_admin' && user.role !== 'admin') {
      const { data: dbUser } = await getServerSupabase()
        .from('users')
        .select('subscription_status, subscription_cancelled_at')
        .eq('id', user.id)
        .single();

      if (dbUser?.subscription_status === 'canceled' || dbUser?.subscription_status === 'cancelled') {
        // If cancelled more than 45 days ago, block access entirely
        if (dbUser.subscription_cancelled_at) {
          const cancelledAt = new Date(dbUser.subscription_cancelled_at);
          const daysSinceCancelled = (Date.now() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCancelled > 45) {
            const response = NextResponse.json(
              { success: false, error: 'Your account has been deactivated. Please contact support.' },
              { status: 403 }
            );
            response.cookies.delete('auth_token');
            return response;
          }
        }
        subscriptionInactive = true;
      }
    }

    // Fetch accounts for multi-account users (same email, different accounts)
    let accounts: { userId: string; accountId: string; accountName: string; role: string }[] = [];
    if (user.username) {
      const { data: userRows } = await getServerSupabase()
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

    return NextResponse.json({ success: true, user, accounts: accounts.length > 1 ? accounts : undefined, subscriptionInactive });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
