import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/company-admin/accounts/[accountId]
 *
 * Deletes a single account. Requires super_admin or company_admin role.
 * Will not delete your own account.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;

    // Authenticate: require super_admin or company_admin session
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getServerSupabase();

    const { data: session } = await db
      .from('user_sessions')
      .select('user:users(id, role, account_id)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single();

    const sessionUser = session?.user as { id: string; role: string; account_id: string | null } | null;
    if (!sessionUser || (sessionUser.role !== 'super_admin' && sessionUser.role !== 'company_admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prevent deleting your own account
    if (sessionUser.account_id === accountId) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Fetch the account to confirm it exists
    const { data: account, error: fetchError } = await db
      .from('accounts')
      .select('id, name, slug')
      .eq('id', accountId)
      .single();

    if (fetchError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Set account_id to NULL on any users in this account (ON DELETE SET NULL handles this,
    // but let's be explicit about what happens)
    // The foreign key ON DELETE SET NULL will handle users automatically.

    // Delete the account (CASCADE will clean up integrations, uploads, crm data, etc.)
    const { error: deleteError } = await db
      .from('accounts')
      .delete()
      .eq('id', accountId);

    if (deleteError) {
      console.error(`Error deleting account ${accountId}:`, deleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    console.log(`Account deleted by ${sessionUser.id}: ${account.slug} (${account.id})`);

    return NextResponse.json({
      success: true,
      message: `Account "${account.name}" has been deleted`,
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
