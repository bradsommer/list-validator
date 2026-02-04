import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

// GET - List properties for an object type
export async function GET(request: NextRequest) {
  const objectType = request.nextUrl.searchParams.get('objectType') || 'contacts';

  try {
    const { data, error } = await supabase
      .from('crm_properties')
      .select('*')
      .eq('account_id', DEFAULT_ACCOUNT_ID)
      .eq('object_type', objectType)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, properties: data || [] });
  } catch (err) {
    console.error('CRM properties error:', err);
    return NextResponse.json({ success: false, error: 'Failed to fetch properties' }, { status: 500 });
  }
}

// POST - Create a custom property
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { objectType, name, label, fieldType, options, isRequired } = body as {
      objectType: string;
      name: string;
      label: string;
      fieldType?: string;
      options?: { value: string; label: string }[];
      isRequired?: boolean;
    };

    if (!objectType || !name || !label) {
      return NextResponse.json(
        { success: false, error: 'objectType, name, and label are required' },
        { status: 400 }
      );
    }

    // Sanitize name to snake_case
    const sanitizedName = name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');

    // Get max sort_order for this object type
    const { data: maxOrder } = await supabase
      .from('crm_properties')
      .select('sort_order')
      .eq('account_id', DEFAULT_ACCOUNT_ID)
      .eq('object_type', objectType)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrder?.sort_order || 0) + 1;

    const { data, error } = await supabase
      .from('crm_properties')
      .insert({
        account_id: DEFAULT_ACCOUNT_ID,
        object_type: objectType,
        name: sanitizedName,
        label,
        field_type: fieldType || 'text',
        options: options || [],
        is_required: isRequired || false,
        is_system: false,
        sort_order: nextOrder,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: `Property "${sanitizedName}" already exists for ${objectType}` },
          { status: 409 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, property: data });
  } catch (err) {
    console.error('CRM property create error:', err);
    return NextResponse.json({ success: false, error: 'Failed to create property' }, { status: 500 });
  }
}

// PATCH - Update a property
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, fieldType, options, isRequired } = body as {
      id: string;
      label?: string;
      fieldType?: string;
      options?: { value: string; label: string }[];
      isRequired?: boolean;
    };

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (label !== undefined) updateData.label = label;
    if (fieldType !== undefined) updateData.field_type = fieldType;
    if (options !== undefined) updateData.options = options;
    if (isRequired !== undefined) updateData.is_required = isRequired;

    const { data, error } = await supabase
      .from('crm_properties')
      .update(updateData)
      .eq('id', id)
      .eq('account_id', DEFAULT_ACCOUNT_ID)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true, property: data });
  } catch (err) {
    console.error('CRM property update error:', err);
    return NextResponse.json({ success: false, error: 'Failed to update property' }, { status: 500 });
  }
}

// DELETE - Delete a custom property (not system properties)
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
  }

  try {
    // Check it's not a system property
    const { data: prop } = await supabase
      .from('crm_properties')
      .select('is_system')
      .eq('id', id)
      .single();

    if (prop?.is_system) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete system properties' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('crm_properties')
      .delete()
      .eq('id', id)
      .eq('account_id', DEFAULT_ACCOUNT_ID);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('CRM property delete error:', err);
    return NextResponse.json({ success: false, error: 'Failed to delete property' }, { status: 500 });
  }
}
