import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - list integrations for the current user's account
export async function GET(request: NextRequest) {
  try {
    const accountId = request.headers.get('x-account-id') || '00000000-0000-0000-0000-000000000001';

    // In dev mode, return from supabase or mock
    const { data, error } = await supabase
      .from('account_integrations')
      .select('*')
      .eq('account_id', accountId)
      .order('provider');

    if (error) {
      // Table might not exist yet in dev - return empty
      console.error('Error fetching integrations:', error);
      return NextResponse.json({ success: true, integrations: [] });
    }

    return NextResponse.json({ success: true, integrations: data || [] });
  } catch (err) {
    console.error('Error fetching integrations:', err);
    return NextResponse.json({ success: true, integrations: [] });
  }
}

// DELETE - remove an integration
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Integration ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('account_integrations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting integration:', error);
      return NextResponse.json({ success: false, error: 'Failed to delete integration' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting integration:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete integration' }, { status: 500 });
  }
}
