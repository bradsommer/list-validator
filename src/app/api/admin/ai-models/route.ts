import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = getServerSupabase();
    const { data, error } = await db
      .from('ai_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data: data || [] });
  } catch (err) {
    console.error('Error fetching AI models:', err);
    return NextResponse.json({ error: 'Failed to fetch AI models' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getServerSupabase();
    const { data, error } = await db
      .from('ai_models')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error creating AI model:', err);
    return NextResponse.json({ error: 'Failed to create AI model' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const db = getServerSupabase();

    const { error } = await db
      .from('ai_models')
      .update(updates)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If setting as default, unset others
    if (updates.is_default) {
      await db
        .from('ai_models')
        .update({ is_default: false })
        .neq('id', id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating AI model:', err);
    return NextResponse.json({ error: 'Failed to update AI model' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const db = getServerSupabase();
    const { error } = await db
      .from('ai_models')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting AI model:', err);
    return NextResponse.json({ error: 'Failed to delete AI model' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();
    const db = getServerSupabase();
    const { error } = await db
      .from('ai_models')
      .update(updates)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error patching AI model:', err);
    return NextResponse.json({ error: 'Failed to update AI model' }, { status: 500 });
  }
}
