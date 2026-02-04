/**
 * Column Headings — localStorage-backed store for HubSpot column heading names.
 * Users manage these on the /column-headings page and select them during import.
 */

const STORAGE_KEY = 'hubspot_column_headings';
const MAPPING_HISTORY_KEY = 'column_mapping_history';

export interface ColumnHeading {
  id: string;
  name: string;
  createdAt: string;
}

export function getColumnHeadings(): ColumnHeading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as ColumnHeading[];
  } catch {
    // ignore
  }
  return [];
}

export function saveColumnHeadings(headings: ColumnHeading[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(headings));
}

export function addColumnHeading(name: string): ColumnHeading {
  const headings = getColumnHeadings();
  const heading: ColumnHeading = {
    id: crypto.randomUUID(),
    name: name.trim(),
    createdAt: new Date().toISOString(),
  };
  headings.push(heading);
  saveColumnHeadings(headings);
  return heading;
}

export function removeColumnHeading(id: string): void {
  const headings = getColumnHeadings().filter((h) => h.id !== id);
  saveColumnHeadings(headings);
}

export function updateColumnHeading(id: string, name: string): void {
  const headings = getColumnHeadings().map((h) =>
    h.id === id ? { ...h, name: name.trim() } : h
  );
  saveColumnHeadings(headings);
}

// --- Mapping history: remembers spreadsheet header → HubSpot heading from previous imports ---

/** Get the saved mapping history (spreadsheet header → HubSpot heading name) */
export function getMappingHistory(): Record<string, string> {
  try {
    const raw = localStorage.getItem(MAPPING_HISTORY_KEY);
    if (raw) return JSON.parse(raw) as Record<string, string>;
  } catch {
    // ignore
  }
  return {};
}

/** Save the current mapping so it can be recalled on the next import */
export function saveMappingHistory(mapping: Record<string, string>): void {
  // Merge with existing history so we accumulate mappings over time
  const existing = getMappingHistory();
  const merged = { ...existing };
  for (const [key, value] of Object.entries(mapping)) {
    if (value) {
      merged[key] = value;
    }
  }
  localStorage.setItem(MAPPING_HISTORY_KEY, JSON.stringify(merged));
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
