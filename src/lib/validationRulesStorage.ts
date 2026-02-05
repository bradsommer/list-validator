/**
 * Validation Rules Storage — Supabase-backed storage for disabled validation rules.
 * Falls back to localStorage when Supabase is unavailable.
 */

import { supabase } from './supabase';

const LOCAL_STORAGE_KEY = 'disabled_validation_rules';

// ============================================================================
// SUPABASE FUNCTIONS
// ============================================================================

/** Fetch disabled script IDs from Supabase */
export async function fetchDisabledRules(accountId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('disabled_validation_rules')
      .select('script_id')
      .eq('account_id', accountId);

    if (error) {
      console.error('[validationRulesStorage] Supabase fetch error:', error);
      return getDisabledRulesFromLocalStorage();
    }

    const disabledIds = (data || []).map((row) => row.script_id);

    // Sync to localStorage as cache
    saveDisabledRulesToLocalStorage(disabledIds);
    return disabledIds;
  } catch (err) {
    console.error('[validationRulesStorage] Fetch error:', err);
    return getDisabledRulesFromLocalStorage();
  }
}

/** Save disabled rules to Supabase (replaces all) */
export async function saveDisabledRulesAsync(
  disabledIds: string[],
  accountId: string
): Promise<void> {
  // Save to localStorage immediately
  saveDisabledRulesToLocalStorage(disabledIds);

  try {
    // Delete all existing disabled rules for this account
    const { error: deleteError } = await supabase
      .from('disabled_validation_rules')
      .delete()
      .eq('account_id', accountId);

    if (deleteError) {
      console.error('[validationRulesStorage] Supabase delete error:', deleteError);
      return;
    }

    // Insert new disabled rules
    if (disabledIds.length > 0) {
      const rows = disabledIds.map((scriptId) => ({
        account_id: accountId,
        script_id: scriptId,
      }));

      const { error: insertError } = await supabase
        .from('disabled_validation_rules')
        .insert(rows);

      if (insertError) {
        console.error('[validationRulesStorage] Supabase insert error:', insertError);
      }
    }
  } catch (err) {
    console.error('[validationRulesStorage] Save error:', err);
  }
}

// ============================================================================
// LOCALSTORAGE FUNCTIONS (sync, for backwards compatibility)
// ============================================================================

export function getDisabledRulesFromLocalStorage(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch {
    // ignore
  }
  return [];
}

export function saveDisabledRulesToLocalStorage(disabledIds: string[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(disabledIds));
}

/** Clean up legacy localStorage keys */
export function cleanupLegacyKeys(): void {
  localStorage.removeItem('enabled_validation_rules');
  localStorage.removeItem('known_validation_rules');
}
