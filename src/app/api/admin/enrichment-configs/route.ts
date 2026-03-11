import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const db = getServerSupabase();
    const enabledOnly = request.nextUrl.searchParams.get('enabledOnly') === 'true';

    let query = db
      .from('enrichment_configs')
      .select('*, ai_model:ai_models!ai_model_id(name, provider, model_id, api_key_encrypted, use_env_key, env_key_name, base_url)')
      .order('execution_order');

    if (enabledOnly) {
      query = query.eq('is_enabled', true);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also fetch active AI models if requested
    const modelsParam = request.nextUrl.searchParams.get('includeModels');
    let models = null;
    if (modelsParam === 'true') {
      const { data: modelsData } = await db
        .from('ai_models')
        .select('*')
        .eq('is_active', true);
      models = modelsData;
    }

    return NextResponse.json({ data: data || [], models });
  } catch (err) {
    console.error('Error fetching enrichment configs:', err);
    return NextResponse.json({ error: 'Failed to fetch enrichment configs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getServerSupabase();
    const { data, error } = await db
      .from('enrichment_configs')
      .insert(body)
      .select('*, ai_model:ai_models!ai_model_id(*)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err) {
    console.error('Error creating enrichment config:', err);
    return NextResponse.json({ error: 'Failed to create enrichment config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    const db = getServerSupabase();
    const { error } = await db
      .from('enrichment_configs')
      .update(updates)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error updating enrichment config:', err);
    return NextResponse.json({ error: 'Failed to update enrichment config' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const db = getServerSupabase();
    const { error } = await db
      .from('enrichment_configs')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting enrichment config:', err);
    return NextResponse.json({ error: 'Failed to delete enrichment config' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();
    const db = getServerSupabase();
    const { error } = await db
      .from('enrichment_configs')
      .update(updates)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error patching enrichment config:', err);
    return NextResponse.json({ error: 'Failed to update enrichment config' }, { status: 500 });
  }
}
