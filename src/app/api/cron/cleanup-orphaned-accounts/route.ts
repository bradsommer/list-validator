import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

/**
 * POST /api/cron/cleanup-orphaned-accounts
 *
 * Deletes accounts that have 0 users and were created more than 1 hour ago.
 * These are leftover from incomplete signups where the user abandoned
 * Stripe checkout or the user creation step failed.
 *
 * Can be called by:
 * - A cron service (Vercel Cron, external scheduler, etc.)
 * - The company-admin UI (manual cleanup button)
 *
 * Requires the CRON_SECRET header for external cron calls,
 * or a valid super_admin/company_admin session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth: either CRON_SECRET header or admin session
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      // Authorized via cron secret
    } else {
      // Check for admin session
      const token = request.cookies.get('auth_token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: session } = await getServerSupabase()
        .from('user_sessions')
        .select('user:users(role)')
        .eq('token', token)
        .gt('expires_at', new Date().toISOString())
        .single();

      const userRole = (session?.user as { role: string } | null)?.role;
      if (userRole !== 'super_admin' && userRole !== 'company_admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const db = getServerSupabase();

    // Grace period: 26 hours. Stripe checkout sessions expire after 24 hours,
    // so 26 hours ensures the checkout is fully expired before we clean up.
    const gracePeriodMs = 26 * 60 * 60 * 1000; // 26 hours
    const cutoff = new Date(Date.now() - gracePeriodMs).toISOString();

    // Find all accounts created before the cutoff
    const { data: oldAccounts, error: fetchError } = await db
      .from('accounts')
      .select('id, name, slug, created_at')
      .lt('created_at', cutoff);

    if (fetchError) {
      console.error('Error fetching accounts for cleanup:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    if (!oldAccounts || oldAccounts.length === 0) {
      return NextResponse.json({ deleted: 0, message: 'No accounts to evaluate' });
    }

    const deletedAccounts: { id: string; slug: string; name: string }[] = [];

    for (const account of oldAccounts) {
      // Count users in this account
      const { count, error: countError } = await db
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', account.id);

      if (countError) {
        console.error(`Error counting users for account ${account.id}:`, countError);
        continue;
      }

      if (count === 0) {
        // No users — this account is orphaned. Delete it.
        // CASCADE will clean up account_integrations, upload_sessions,
        // upload_rows, crm_properties, crm_records, etc.
        const { error: deleteError } = await db
          .from('accounts')
          .delete()
          .eq('id', account.id);

        if (deleteError) {
          console.error(`Error deleting orphaned account ${account.id}:`, deleteError);
          continue;
        }

        deletedAccounts.push({
          id: account.id,
          slug: account.slug,
          name: account.name,
        });

        console.log(`Deleted orphaned account: ${account.slug} (${account.id}), created ${account.created_at}`);
      }
    }

    return NextResponse.json({
      deleted: deletedAccounts.length,
      accounts: deletedAccounts,
      message: deletedAccounts.length > 0
        ? `Cleaned up ${deletedAccounts.length} orphaned account(s)`
        : 'No orphaned accounts found',
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
