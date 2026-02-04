/**
 * Column Headings — localStorage-backed store for HubSpot column heading names.
 * Users manage these on the /column-headings page and select them during import.
 */

const STORAGE_KEY = 'hubspot_column_headings';

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
