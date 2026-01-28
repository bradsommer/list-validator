import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Save new header mappings
export async function POST(request: NextRequest) {
  try {
    const { mappings } = await request.json();

    if (!Array.isArray(mappings) || mappings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Mappings array is required' },
        { status: 400 }
      );
    }

    // Process each mapping
    const results = await Promise.all(
      mappings.map(async (mapping: { originalHeader: string; hubspotField: string }) => {
        const { originalHeader, hubspotField } = mapping;

        if (!originalHeader || !hubspotField) {
          return { success: false, header: originalHeader, error: 'Missing data' };
        }

        // Get the HubSpot field ID
        const { data: field, error: fieldError } = await supabase
          .from('hubspot_fields')
          .select('id')
          .eq('field_name', hubspotField)
          .single();

        if (fieldError || !field) {
          return { success: false, header: originalHeader, error: 'Field not found' };
        }

        // Try to insert or update the mapping
        const normalizedHeader = originalHeader.toLowerCase().trim();

        const { error: upsertError } = await supabase.from('header_mappings').upsert(
          {
            original_header: originalHeader.trim(),
            normalized_header: normalizedHeader,
            hubspot_field_id: field.id,
            confidence: 1.0,
            usage_count: 1,
            last_used_at: new Date().toISOString(),
          },
          {
            onConflict: 'normalized_header,hubspot_field_id',
            ignoreDuplicates: false,
          }
        );

        if (upsertError) {
          // If duplicate, just update usage count
          await supabase
            .from('header_mappings')
            .update({
              usage_count: supabase.rpc('increment_usage_count'),
              last_used_at: new Date().toISOString(),
            })
            .eq('normalized_header', normalizedHeader)
            .eq('hubspot_field_id', field.id);
        }

        return { success: true, header: originalHeader };
      })
    );

    const saved = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      saved,
      failed,
      results,
    });
  } catch (error) {
    console.error('Save mappings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save mappings' },
      { status: 500 }
    );
  }
}

// Get learned mappings for auto-matching
export async function GET() {
  try {
    const { data: mappings, error } = await supabase
      .from('header_mappings')
      .select('*, hubspot_field:hubspot_fields(*)')
      .order('usage_count', { ascending: false });

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch mappings' },
        { status: 500 }
      );
    }

    // Transform to a lookup format
    const lookup: Record<string, { field: string; label: string; confidence: number }> = {};
    mappings?.forEach((mapping) => {
      const key = mapping.normalized_header;
      if (!lookup[key] || mapping.usage_count > lookup[key].confidence) {
        lookup[key] = {
          field: mapping.hubspot_field.field_name,
          label: mapping.hubspot_field.field_label,
          confidence: mapping.confidence,
        };
      }
    });

    return NextResponse.json({ success: true, mappings: lookup });
  } catch (error) {
    console.error('Get mappings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mappings' },
      { status: 500 }
    );
  }
}
