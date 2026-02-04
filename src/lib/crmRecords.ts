import { supabase } from '@/lib/supabase';

const DEFAULT_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';
const RETENTION_DAYS = 15;

interface UpsertResult {
  id: string;
  action: 'created' | 'updated';
}

/**
 * Upsert a CRM record with dedup logic.
 * - Contacts dedup by email
 * - Companies dedup by domain (fallback: name)
 * - Deals dedup by deal name
 *
 * If a matching record exists, merges properties and refreshes the 15-day expiry.
 * If no match, creates a new record.
 */
export async function upsertCrmRecord(
  objectType: 'contacts' | 'companies' | 'deals',
  properties: Record<string, string>,
  hubspotRecordId?: string,
  uploadSessionId?: string
): Promise<UpsertResult | null> {
  try {
    // Determine dedup key
    let dedupKey: string | null = null;
    if (objectType === 'contacts') {
      dedupKey = properties.email?.toLowerCase().trim() || null;
    } else if (objectType === 'companies') {
      dedupKey = properties.domain?.toLowerCase().trim() ||
                 properties.name?.toLowerCase().trim() || null;
    } else if (objectType === 'deals') {
      dedupKey = properties.dealname?.toLowerCase().trim() || null;
    }

    const expiresAt = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Try to find existing record by dedup key
    if (dedupKey) {
      const { data: existing } = await supabase
        .from('crm_records')
        .select('id, properties')
        .eq('account_id', DEFAULT_ACCOUNT_ID)
        .eq('object_type', objectType)
        .eq('dedup_key', dedupKey)
        .single();

      if (existing) {
        // Merge: new values overwrite old, keep old values not in new
        const mergedProps = { ...(existing.properties as Record<string, unknown>), ...properties };
        const updateData: Record<string, unknown> = {
          properties: mergedProps,
          expires_at: expiresAt,
        };
        if (hubspotRecordId) updateData.hubspot_record_id = hubspotRecordId;
        if (hubspotRecordId) updateData.synced_at = new Date().toISOString();
        if (uploadSessionId) updateData.upload_session_id = uploadSessionId;

        const { data: updated, error } = await supabase
          .from('crm_records')
          .update(updateData)
          .eq('id', existing.id)
          .select('id')
          .single();

        if (error) {
          console.error('CRM upsert (update) error:', error);
          return null;
        }
        return { id: updated.id, action: 'updated' };
      }
    }

    // Create new
    const insertData: Record<string, unknown> = {
      account_id: DEFAULT_ACCOUNT_ID,
      object_type: objectType,
      properties,
      dedup_key: dedupKey,
      expires_at: expiresAt,
    };
    if (hubspotRecordId) {
      insertData.hubspot_record_id = hubspotRecordId;
      insertData.synced_at = new Date().toISOString();
    }
    if (uploadSessionId) insertData.upload_session_id = uploadSessionId;

    const { data: created, error } = await supabase
      .from('crm_records')
      .insert(insertData)
      .select('id')
      .single();

    if (error) {
      console.error('CRM upsert (insert) error:', error);
      return null;
    }
    return { id: created.id, action: 'created' };
  } catch (err) {
    console.error('CRM upsert exception:', err);
    return null;
  }
}

/**
 * Bulk upsert records from a sync batch.
 * Stores both contact and company records from each row.
 */
export async function storeSyncResults(
  rows: { contactProperties: Record<string, string>; companyProperties: Record<string, string> }[],
  results: { rowIndex: number; contactId?: string; companyId?: string; error?: string }[],
  uploadSessionId?: string
): Promise<{ contactsStored: number; companiesStored: number }> {
  let contactsStored = 0;
  let companiesStored = 0;

  for (const result of results) {
    if (result.error) continue; // Skip failed rows

    const row = rows[result.rowIndex];
    if (!row) continue;

    // Store contact
    if (row.contactProperties && Object.keys(row.contactProperties).length > 0) {
      const cr = await upsertCrmRecord(
        'contacts',
        row.contactProperties,
        result.contactId,
        uploadSessionId
      );
      if (cr) contactsStored++;
    }

    // Store company
    if (row.companyProperties && Object.keys(row.companyProperties).length > 0) {
      const cr = await upsertCrmRecord(
        'companies',
        row.companyProperties,
        result.companyId,
        uploadSessionId
      );
      if (cr) companiesStored++;
    }
  }

  return { contactsStored, companiesStored };
}

/**
 * Purge expired CRM records (older than 15 days).
 */
export async function purgeExpiredRecords(): Promise<number> {
  const { count, error } = await supabase
    .from('crm_records')
    .delete({ count: 'exact' })
    .eq('account_id', DEFAULT_ACCOUNT_ID)
    .lt('expires_at', new Date().toISOString());

  if (error) {
    console.error('CRM purge error:', error);
    return 0;
  }
  return count || 0;
}
