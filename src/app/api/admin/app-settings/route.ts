import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    const db = getServerSupabase();

    if (key) {
      const { data, error } = await db
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single();

      if (error && error.code !== 'PGRST116') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ data: data?.value || null });
    }

    const { data, error } = await db
      .from('app_settings')
      .select('*');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('Error fetching app settings:', err);
    return NextResponse.json({ error: 'Failed to fetch app settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { key, value } = await request.json();
    const db = getServerSupabase();
    const { error } = await db
      .from('app_settings')
      .upsert(
        { key, value: typeof value === 'string' ? value : JSON.stringify(value) },
        { onConflict: 'key' }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating app setting:', err);
    return NextResponse.json({ error: 'Failed to update app setting' }, { status: 500 });
  }
}
