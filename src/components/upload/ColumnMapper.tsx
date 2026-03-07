'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { ColumnMapping } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import {
  getColumnHeadings,
  fetchColumnHeadings,
  addColumnHeading,
  addColumnHeadingAsync,
  getMappingHistory,
  saveMappingHistory,
  autoMatchHeader,
  type ColumnHeading,
} from '@/lib/columnHeadings';

const DO_NOT_USE = '__do_not_use__';

/** Custom dropdown for a single column mapping row */
function HeadingDropdown({
  value,
  headings,
  onSelect,
  onAddNew,
}: {
  value: string;
  headings: ColumnHeading[];
  onSelect: (val: string) => void;
  onAddNew: (name: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const newNameRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
        setIsAdding(false);
        setNewName('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen]);

  // Focus new name input when adding
  useEffect(() => {
    if (isAdding && newNameRef.current) {
      newNameRef.current.focus();
    }
  }, [isAdding]);

  const filtered = headings.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase())
  );

  const displayValue =
    value === DO_NOT_USE
      ? 'Do not use'
      : value === ''
        ? 'Keep original'
        : value;

  const handleSelect = (val: string) => {
    onSelect(val);
    setIsOpen(false);
    setSearch('');
  };

  const handleCreateNew = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddNew(trimmed);
    setIsAdding(false);
    setNewName('');
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white text-sm text-left outline-none transition-colors ${
          isOpen
            ? 'border-primary-500'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <span className={
          value === DO_NOT_USE
            ? 'text-red-600'
            : value === ''
              ? 'text-gray-500 italic'
              : 'text-gray-900'
        }>
          {displayValue}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col" style={{ maxHeight: '320px' }}>
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded text-sm focus:border-primary-500 outline-none"
              />
              <svg
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Scrollable option list */}
          <div className="overflow-y-auto flex-1" style={{ maxHeight: '180px' }}>
            {/* Keep original */}
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                value === '' ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
              }`}
            >
              Keep original
            </button>

            {filtered.length > 0 ? (
              filtered.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleSelect(h.name)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center justify-between gap-2 ${
                    value === h.name ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span className="truncate">{h.name}</span>
                  {(h.source === 'hubspot' || h.hubspotFieldName) && (
                    <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">
                      HubSpot
                    </span>
                  )}
                </button>
              ))
            ) : search ? (
              <div className="px-4 py-3 text-sm text-gray-400">No results</div>
            ) : null}
          </div>

          {/* Pinned footer: Do not use + Create new */}
          <div className="border-t border-gray-200">
            <button
              type="button"
              onClick={() => handleSelect(DO_NOT_USE)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                value === DO_NOT_USE ? 'bg-red-50 text-red-700 font-medium' : 'text-red-600'
              }`}
            >
              Do not use
            </button>

            {isAdding ? (
              <div className="px-3 py-2 border-t border-gray-100">
                <div className="flex gap-2">
                  <input
                    ref={newNameRef}
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateNew();
                      }
                      if (e.key === 'Escape') {
                        setIsAdding(false);
                        setNewName('');
                      }
                    }}
                    placeholder="Column heading name..."
                    className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:border-primary-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    disabled={!newName.trim()}
                    className="px-3 py-1.5 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="w-full text-left px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 border-t border-gray-100 font-medium"
              >
                + Create new column heading
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ColumnMapper({ onCancel }: { onCancel?: () => void }) {
  const {
    parsedFile,
    headerMatches,
    columnMapping,
    questionColumnValues,
    objectType,
    setColumnMapping,
    nextStep,
    prevStep,
  } = useAppStore();

  const { user } = useAuth();
  const accountId = user?.accountId || '';

  const [allHeadingsRaw, setAllHeadingsRaw] = useState<ColumnHeading[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [headingsLoaded, setHeadingsLoaded] = useState(false);
  const [hubspotConnected, setHubspotConnected] = useState(false);

  // Check HubSpot connection status
  useEffect(() => {
    if (!accountId) return;
    async function checkConnection() {
      try {
        const response = await fetch('/api/hubspot/oauth', {
          headers: { 'x-account-id': accountId },
        });
        const data = await response.json();
        setHubspotConnected(data.connected === true);
      } catch {
        setHubspotConnected(false);
      }
    }
    checkConnection();
  }, [accountId]);

  // Filter headings by object type: show manual headings always,
  // but only show HubSpot-sourced headings if connected and matching the selected object type
  const headings = allHeadingsRaw.filter((h) => {
    if (h.source !== 'hubspot') return true;
    if (!hubspotConnected) return false;
    if (!objectType) return true;
    return h.hubspotObjectType === objectType;
  });

  // Get all headers: spreadsheet headers + question column headers (that don't already exist)
  const questionHeaders = Object.keys(questionColumnValues).filter(
    (h) => !parsedFile?.headers.includes(h)
  );
  const allHeaders = parsedFile ? [...parsedFile.headers, ...questionHeaders] : [];

  // Load headings from Supabase (includes HubSpot-synced properties) or fall back to localStorage
  const loadHeadings = useCallback(async () => {
    let currentHeadings: ColumnHeading[];
    if (accountId) {
      currentHeadings = await fetchColumnHeadings(accountId);
    } else {
      currentHeadings = getColumnHeadings();
    }
    setAllHeadingsRaw(currentHeadings);
    setHeadingsLoaded(true);
    return currentHeadings;
  }, [accountId]);

  useEffect(() => {
    loadHeadings();
  }, [loadHeadings]);

  // Build initial mapping once headings are loaded
  useEffect(() => {
    if (!headingsLoaded || !parsedFile) return;

    const headingNames = headings.map((h) => h.name);
    const history = getMappingHistory();
    const initial: ColumnMapping = {};

    // Map spreadsheet headers
    for (const header of parsedFile.headers) {
      // If already set from store (e.g. user went back and forward), keep it
      if (columnMapping[header]) {
        initial[header] = columnMapping[header];
      } else {
        // Auto-match: history first, then exact, then fuzzy
        initial[header] = autoMatchHeader(header, headingNames, history);
      }
    }

    // Map question headers (new columns from import questions)
    for (const header of questionHeaders) {
      if (columnMapping[header]) {
        initial[header] = columnMapping[header];
      } else {
        // Auto-match question headers too
        initial[header] = autoMatchHeader(header, headingNames, history);
      }
    }

    setMapping(initial);
  }, [headingsLoaded, headings, parsedFile, columnMapping, questionColumnValues]);

  const handleSelect = (originalHeader: string, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [originalHeader]: value,
    }));
  };

  const handleAddNew = async (originalHeader: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!headings.some((h) => h.name.toLowerCase() === trimmed.toLowerCase())) {
      if (accountId) {
        await addColumnHeadingAsync(trimmed, accountId);
      } else {
        addColumnHeading(trimmed);
      }
    }
    await loadHeadings();
    setMapping((prev) => ({
      ...prev,
      [originalHeader]: trimmed,
    }));
  };

  const handleContinue = () => {
    setColumnMapping(mapping);
    // Save to history so future imports remember these choices
    saveMappingHistory(mapping);
    nextStep();
  };

  if (!parsedFile) {
    return <div className="text-center text-gray-500">No file uploaded</div>;
  }

  const mappedCount = allHeaders.filter((h) => mapping[h] && mapping[h] !== DO_NOT_USE).length;
  const excludedCount = allHeaders.filter((h) => mapping[h] === DO_NOT_USE).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Map Columns</h2>
        <p className="text-sm text-gray-600 mt-1">
          Choose an output heading for each column in your spreadsheet. Mapped columns will be renamed in the exported file.
          Columns set to &ldquo;Do not use&rdquo; will be excluded from the export.
        </p>
      </div>

      <div className="text-sm text-gray-500">
        {mappedCount} mapped
        {excludedCount > 0 && <span className="text-red-500 ml-2">{excludedCount} excluded</span>}
        <span className="ml-1">of {allHeaders.length} columns</span>
        {questionHeaders.length > 0 && (
          <span className="text-purple-600 ml-2">({questionHeaders.length} from questions)</span>
        )}
      </div>

      {/* Mapping table */}
      <div className="border border-gray-200 rounded-lg overflow-visible">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-2/5">
                Spreadsheet Column
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-400 w-10">
                &rarr;
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-1/2">
                Output Heading
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {allHeaders.map((header) => {
              const match = headerMatches.find((m) => m.originalHeader === header);
              const detectedType = match?.matchedField?.hubspotField;
              const isExcluded = mapping[header] === DO_NOT_USE;
              const isFromQuestion = questionHeaders.includes(header);

              return (
                <tr key={header} className={`${isExcluded ? 'bg-red-50/30' : isFromQuestion ? 'bg-purple-50/30' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <div>
                      <span className={`font-medium ${isExcluded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {header}
                      </span>
                      {isFromQuestion && !isExcluded && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          from question
                        </span>
                      )}
                      {detectedType && !isExcluded && !isFromQuestion && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-primary-50 text-primary-600 rounded-full">
                          {detectedType}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">&rarr;</td>
                  <td className="px-4 py-3">
                    <HeadingDropdown
                      value={mapping[header] || ''}
                      headings={headings}
                      onSelect={(val) => handleSelect(header, val)}
                      onAddNew={(name) => handleAddNew(header, name)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <div className="flex items-center gap-2">
          {onCancel && (
            <button onClick={onCancel} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">
              Cancel
            </button>
          )}
          <button
            onClick={prevStep}
            className="px-6 py-2 text-gray-600 hover:text-gray-800"
          >
            Back
          </button>
        </div>
        <button
          onClick={handleContinue}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Continue to Validate
        </button>
      </div>
    </div>
  );
}
