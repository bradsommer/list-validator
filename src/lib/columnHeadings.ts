/**
 * Column Headings — Supabase-backed store for HubSpot column heading names.
 * Users manage these on the /column-headings page and select them during import.
 * Falls back to localStorage when Supabase is unavailable.
 */

import { supabase } from './supabase';

const STORAGE_KEY = 'hubspot_column_headings';
const MAPPING_HISTORY_KEY = 'column_mapping_history';

export interface ColumnHeading {
  id: string;
  name: string;
  createdAt: string;
}

// ============================================================================
// COLUMN HEADINGS - Supabase with localStorage fallback
// ============================================================================

/** Fetch column headings from Supabase */
export async function fetchColumnHeadings(accountId: string): Promise<ColumnHeading[]> {
  try {
    const { data, error } = await supabase
      .from('column_headings')
      .select('id, name, created_at')
      .eq('account_id', accountId)
      .order('name');

    if (error) {
      console.error('[columnHeadings] Supabase fetch error:', error);
      return getColumnHeadingsFromLocalStorage();
    }

    const headings = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      createdAt: row.created_at,
    }));

    // Sync to localStorage as cache
    saveColumnHeadingsToLocalStorage(headings);
    return headings;
  } catch (err) {
    console.error('[columnHeadings] Fetch error:', err);
    return getColumnHeadingsFromLocalStorage();
  }
}

/** Add a column heading to Supabase */
export async function addColumnHeadingAsync(name: string, accountId: string): Promise<ColumnHeading> {
  const trimmedName = name.trim();

  try {
    const { data, error } = await supabase
      .from('column_headings')
      .insert({ account_id: accountId, name: trimmedName })
      .select('id, name, created_at')
      .single();

    if (error) {
      console.error('[columnHeadings] Supabase insert error:', error);
      // Fall back to localStorage
      return addColumnHeadingToLocalStorage(trimmedName);
    }

    const heading: ColumnHeading = {
      id: data.id,
      name: data.name,
      createdAt: data.created_at,
    };

    // Update localStorage cache
    const headings = getColumnHeadingsFromLocalStorage();
    headings.push(heading);
    saveColumnHeadingsToLocalStorage(headings);

    return heading;
  } catch (err) {
    console.error('[columnHeadings] Add error:', err);
    return addColumnHeadingToLocalStorage(trimmedName);
  }
}

/** Remove a column heading from Supabase */
export async function removeColumnHeadingAsync(id: string, accountId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('column_headings')
      .delete()
      .eq('id', id)
      .eq('account_id', accountId);

    if (error) {
      console.error('[columnHeadings] Supabase delete error:', error);
    }
  } catch (err) {
    console.error('[columnHeadings] Remove error:', err);
  }

  // Always update localStorage cache
  removeColumnHeadingFromLocalStorage(id);
}

/** Update a column heading in Supabase */
export async function updateColumnHeadingAsync(id: string, name: string, accountId: string): Promise<void> {
  const trimmedName = name.trim();

  try {
    const { error } = await supabase
      .from('column_headings')
      .update({ name: trimmedName })
      .eq('id', id)
      .eq('account_id', accountId);

    if (error) {
      console.error('[columnHeadings] Supabase update error:', error);
    }
  } catch (err) {
    console.error('[columnHeadings] Update error:', err);
  }

  // Always update localStorage cache
  updateColumnHeadingInLocalStorage(id, trimmedName);
}

// ============================================================================
// MAPPING HISTORY - Supabase with localStorage fallback
// ============================================================================

/** Fetch mapping history from Supabase */
export async function fetchMappingHistory(accountId: string): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('column_mapping_history')
      .select('spreadsheet_header, hubspot_heading')
      .eq('account_id', accountId);

    if (error) {
      console.error('[columnHeadings] Supabase mapping fetch error:', error);
      return getMappingHistoryFromLocalStorage();
    }

    const history: Record<string, string> = {};
    for (const row of data || []) {
      history[row.spreadsheet_header] = row.hubspot_heading;
    }

    // Sync to localStorage as cache
    saveMappingHistoryToLocalStorage(history);
    return history;
  } catch (err) {
    console.error('[columnHeadings] Mapping fetch error:', err);
    return getMappingHistoryFromLocalStorage();
  }
}

/** Save mapping history to Supabase (upsert) */
export async function saveMappingHistoryAsync(
  mapping: Record<string, string>,
  accountId: string
): Promise<void> {
  // Merge with existing history
  const existing = getMappingHistoryFromLocalStorage();
  const merged = { ...existing };
  for (const [key, value] of Object.entries(mapping)) {
    if (value) {
      merged[key] = value;
    }
  }

  // Save to localStorage immediately
  saveMappingHistoryToLocalStorage(merged);

  // Upsert to Supabase
  try {
    const rows = Object.entries(merged).map(([header, heading]) => ({
      account_id: accountId,
      spreadsheet_header: header,
      hubspot_heading: heading,
    }));

    if (rows.length > 0) {
      const { error } = await supabase
        .from('column_mapping_history')
        .upsert(rows, { onConflict: 'account_id,spreadsheet_header' });

      if (error) {
        console.error('[columnHeadings] Supabase mapping upsert error:', error);
      }
    }
  } catch (err) {
    console.error('[columnHeadings] Mapping save error:', err);
  }
}

// ============================================================================
// LEGACY SYNC FUNCTIONS (for backwards compatibility)
// These work synchronously with localStorage only
// ============================================================================

export function getColumnHeadings(): ColumnHeading[] {
  return getColumnHeadingsFromLocalStorage();
}

export function saveColumnHeadings(headings: ColumnHeading[]): void {
  saveColumnHeadingsToLocalStorage(headings);
}

export function addColumnHeading(name: string): ColumnHeading {
  return addColumnHeadingToLocalStorage(name);
}

export function removeColumnHeading(id: string): void {
  removeColumnHeadingFromLocalStorage(id);
}

export function updateColumnHeading(id: string, name: string): void {
  updateColumnHeadingInLocalStorage(id, name);
}

export function getMappingHistory(): Record<string, string> {
  return getMappingHistoryFromLocalStorage();
}

export function saveMappingHistory(mapping: Record<string, string>): void {
  const existing = getMappingHistoryFromLocalStorage();
  const merged = { ...existing };
  for (const [key, value] of Object.entries(mapping)) {
    if (value) {
      merged[key] = value;
    }
  }
  saveMappingHistoryToLocalStorage(merged);
}

// ============================================================================
// LOCALSTORAGE HELPERS
// ============================================================================

function getColumnHeadingsFromLocalStorage(): ColumnHeading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ColumnHeading[];
  } catch {
    // ignore
  }
  return [];
}

function saveColumnHeadingsToLocalStorage(headings: ColumnHeading[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(headings));
}

function addColumnHeadingToLocalStorage(name: string): ColumnHeading {
  const headings = getColumnHeadingsFromLocalStorage();
  const heading: ColumnHeading = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  headings.push(heading);
  saveColumnHeadingsToLocalStorage(headings);
  return heading;
}

function removeColumnHeadingFromLocalStorage(id: string): void {
  const headings = getColumnHeadingsFromLocalStorage().filter((h) => h.id !== id);
  saveColumnHeadingsToLocalStorage(headings);
}

function updateColumnHeadingInLocalStorage(id: string, name: string): void {
  const headings = getColumnHeadingsFromLocalStorage().map((h) =>
    h.id === id ? { ...h, name: name.trim() } : h
  );
  saveColumnHeadingsToLocalStorage(headings);
}

function getMappingHistoryFromLocalStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MAPPING_HISTORY_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    // ignore
  }
  return {};
}

function saveMappingHistoryToLocalStorage(mapping: Record<string, string>): void {
  localStorage.setItem(MAPPING_HISTORY_KEY, JSON.stringify(mapping));
}

/**
 * Auto-match a spreadsheet header to a HubSpot column heading.
 * Priority: 1) previous mapping history, 2) exact match, 3) fuzzy match.
 * Returns the matched heading name, or '' (keep original) if no match.
 */
export function autoMatchHeader(
  header: string,
  headingNames: string[],
  history: Record<string, string>
): string {
  // 1. Previous mapping history — exact key match (case-insensitive)
  const headerLower = header.toLowerCase().trim();
  for (const [prevHeader, prevValue] of Object.entries(history)) {
    if (prevHeader.toLowerCase().trim() === headerLower) {
      // Verify the heading still exists in the current list (or is DO_NOT_USE)
      if (
        prevValue === '__do_not_use__' ||
        headingNames.some((n) => n === prevValue)
      ) {
        return prevValue;
      }
    }
  }

  // 2. Exact match — header name matches a heading name exactly (case-insensitive)
  for (const name of headingNames) {
    if (name.toLowerCase().trim() === headerLower) {
      return name;
    }
  }

  // 3. Fuzzy match — header contains or is contained by a heading name
  const normalizedHeader = headerLower.replace(/[_\-\.\/]/g, ' ').replace(/\s+/g, ' ');

  let bestFuzzy: { name: string; score: number } | null = null;
  for (const name of headingNames) {
    const normalizedName = name.toLowerCase().trim().replace(/[_\-\.\/]/g, ' ').replace(/\s+/g, ' ');

    // Check if one contains the other
    if (normalizedHeader.includes(normalizedName) || normalizedName.includes(normalizedHeader)) {
      // Score by how close the lengths are (closer = better match)
      const score = Math.min(normalizedHeader.length, normalizedName.length) /
                    Math.max(normalizedHeader.length, normalizedName.length);
      if (!bestFuzzy || score > bestFuzzy.score) {
        bestFuzzy = { name, score };
      }
    }
  }

  // Only accept fuzzy matches above a reasonable threshold
  if (bestFuzzy && bestFuzzy.score >= 0.5) {
    return bestFuzzy.name;
  }

  // No match — keep original
  return '';
}
