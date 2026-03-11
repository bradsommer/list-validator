/**
 * Client-safe wrapper for column headings operations.
 * Uses fetch() to API routes instead of direct Supabase access.
 * Keeps localStorage functions for client-side caching.
 */

// Re-export the type and pure client-side functions from the original module
export type { ColumnHeading } from '../columnHeadings';
export {
  getColumnHeadings,
  saveColumnHeadings,
  addColumnHeading,
  removeColumnHeading,
  updateColumnHeading,
  getMappingHistory,
  saveMappingHistory,
  deleteMappingHistoryEntry,
  clearMappingHistory,
  updateMappingHistoryEntry,
  autoMatchHeader,
} from '../columnHeadings';

interface ColumnHeading {
  id: string;
  name: string;
  source: 'manual' | 'hubspot';
  hubspotObjectType?: string | null;
  hubspotFieldName?: string | null;
  createdAt: string;
}

const STORAGE_KEY = 'hubspot_column_headings';
const MAPPING_HISTORY_KEY = 'column_mapping_history';

function saveColumnHeadingsToLocalStorage(headings: ColumnHeading[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(headings)); } catch { /* ignore */ }
}

function getColumnHeadingsFromLocalStorage(): ColumnHeading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ColumnHeading[];
  } catch { /* ignore */ }
  return [];
}

function saveMappingHistoryToLocalStorage(mapping: Record<string, string>): void {
  try { localStorage.setItem(MAPPING_HISTORY_KEY, JSON.stringify(mapping)); } catch { /* ignore */ }
}

function getMappingHistoryFromLocalStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MAPPING_HISTORY_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch { /* ignore */ }
  return {};
}

export async function fetchColumnHeadings(accountId: string): Promise<ColumnHeading[]> {
  try {
    const res = await fetch(`/api/column-headings?accountId=${encodeURIComponent(accountId)}`);
    const json = await res.json();
    if (json.error) {
      console.error('[columnHeadings] API error:', json.error);
      return getColumnHeadingsFromLocalStorage();
    }
    const headings = (json.data || []).map((row: Record<string, string | null>) => ({
      id: row.id,
      name: row.name,
      source: (row.source || 'manual') as 'manual' | 'hubspot',
      hubspotObjectType: row.hubspot_object_type || null,
      hubspotFieldName: row.hubspot_field_name || null,
      createdAt: row.created_at,
    }));
    saveColumnHeadingsToLocalStorage(headings);
    return headings;
  } catch (err) {
    console.error('[columnHeadings] Fetch error:', err);
    return getColumnHeadingsFromLocalStorage();
  }
}

export async function addColumnHeadingAsync(name: string, accountId: string): Promise<ColumnHeading> {
  try {
    const res = await fetch('/api/column-headings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, name }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    const heading: ColumnHeading = {
      id: json.data.id,
      name: json.data.name,
      source: 'manual',
      createdAt: json.data.created_at,
    };
    const headings = getColumnHeadingsFromLocalStorage();
    headings.push(heading);
    saveColumnHeadingsToLocalStorage(headings);
    return heading;
  } catch (err) {
    console.error('[columnHeadings] Add error:', err);
    const heading: ColumnHeading = {
      id: crypto.randomUUID(),
      name: name.trim(),
      source: 'manual',
      createdAt: new Date().toISOString(),
    };
    return heading;
  }
}

export async function removeColumnHeadingAsync(id: string, accountId: string): Promise<void> {
  try {
    await fetch('/api/column-headings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, accountId }),
    });
  } catch (err) {
    console.error('[columnHeadings] Remove error:', err);
  }
  const headings = getColumnHeadingsFromLocalStorage().filter((h) => h.id !== id);
  saveColumnHeadingsToLocalStorage(headings);
}

export async function removeAllHubSpotHeadingsAsync(accountId: string): Promise<number> {
  try {
    const res = await fetch('/api/column-headings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, hubspotOnly: true }),
    });
    const json = await res.json();
    const cached = getColumnHeadingsFromLocalStorage().filter((h) => h.source !== 'hubspot');
    saveColumnHeadingsToLocalStorage(cached);
    return json.removedCount || 0;
  } catch (err) {
    console.error('[columnHeadings] Bulk remove error:', err);
    return 0;
  }
}

export async function updateColumnHeadingAsync(id: string, name: string, accountId: string): Promise<void> {
  try {
    await fetch('/api/column-headings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, accountId }),
    });
  } catch (err) {
    console.error('[columnHeadings] Update error:', err);
  }
  const headings = getColumnHeadingsFromLocalStorage().map((h) =>
    h.id === id ? { ...h, name: name.trim() } : h
  );
  saveColumnHeadingsToLocalStorage(headings);
}

export async function fetchMappingHistory(accountId: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(`/api/mapping-history?accountId=${encodeURIComponent(accountId)}`);
    const json = await res.json();
    if (json.error) return getMappingHistoryFromLocalStorage();
    const history = json.data || {};
    saveMappingHistoryToLocalStorage(history);
    return history;
  } catch (err) {
    console.error('[columnHeadings] Mapping fetch error:', err);
    return getMappingHistoryFromLocalStorage();
  }
}

export async function saveMappingHistoryAsync(mapping: Record<string, string>, accountId: string): Promise<void> {
  const existing = getMappingHistoryFromLocalStorage();
  const merged = { ...existing };
  for (const [key, value] of Object.entries(mapping)) {
    if (value) merged[key] = value;
  }
  saveMappingHistoryToLocalStorage(merged);
  try {
    await fetch('/api/mapping-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, mapping: merged }),
    });
  } catch (err) {
    console.error('[columnHeadings] Mapping save error:', err);
  }
}

export async function deleteMappingHistoryEntryAsync(header: string, accountId: string): Promise<void> {
  const existing = getMappingHistoryFromLocalStorage();
  delete existing[header];
  saveMappingHistoryToLocalStorage(existing);
  try {
    await fetch('/api/mapping-history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, header }),
    });
  } catch (err) {
    console.error('[columnHeadings] Mapping delete error:', err);
  }
}

export async function clearMappingHistoryAsync(accountId: string): Promise<void> {
  saveMappingHistoryToLocalStorage({});
  try {
    await fetch('/api/mapping-history', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, clearAll: true }),
    });
  } catch (err) {
    console.error('[columnHeadings] Mapping clear error:', err);
  }
}

export async function updateMappingHistoryEntryAsync(header: string, newValue: string, accountId: string): Promise<void> {
  const existing = getMappingHistoryFromLocalStorage();
  existing[header] = newValue;
  saveMappingHistoryToLocalStorage(existing);
  try {
    await fetch('/api/mapping-history', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, header, value: newValue }),
    });
  } catch (err) {
    console.error('[columnHeadings] Mapping update error:', err);
  }
}
