'use client';

import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { ColumnMapping } from '@/store/useAppStore';
import {
  getColumnHeadings,
  addColumnHeading,
  type ColumnHeading,
} from '@/lib/columnHeadings';

export function ColumnMapper() {
  const {
    parsedFile,
    headerMatches,
    columnMapping,
    setColumnMapping,
    nextStep,
    prevStep,
  } = useAppStore();

  const [headings, setHeadings] = useState<ColumnHeading[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  // Inline "add new heading" popup state
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [newHeadingName, setNewHeadingName] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHeadings(getColumnHeadings());

    // Initialize mapping: default each column to itself (keep original) unless already set
    if (parsedFile) {
      const initial: ColumnMapping = {};
      for (const header of parsedFile.headers) {
        initial[header] = columnMapping[header] || '';
      }
      setMapping(initial);
    }
  }, [parsedFile, columnMapping]);

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setAddingFor(null);
        setNewHeadingName('');
      }
    };
    if (addingFor) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [addingFor]);

  // Focus input when popup opens
  useEffect(() => {
    if (addingFor && inputRef.current) {
      inputRef.current.focus();
    }
  }, [addingFor]);

  const handleSelect = (originalHeader: string, hubspotHeading: string) => {
    setMapping((prev) => ({
      ...prev,
      [originalHeader]: hubspotHeading,
    }));
  };

  const handleAddNew = (originalHeader: string) => {
    const trimmed = newHeadingName.trim();
    if (!trimmed) return;
    // Add to localStorage
    addColumnHeading(trimmed);
    setHeadings(getColumnHeadings());
    // Select it for this column
    setMapping((prev) => ({
      ...prev,
      [originalHeader]: trimmed,
    }));
    setAddingFor(null);
    setNewHeadingName('');
  };

  const handleContinue = () => {
    setColumnMapping(mapping);
    nextStep();
  };

  if (!parsedFile) {
    return <div className="text-center text-gray-500">No file uploaded</div>;
  }

  const headers = parsedFile.headers;
  const mappedCount = headers.filter((h) => mapping[h]).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Map Columns</h2>
        <p className="text-sm text-gray-600 mt-1">
          Choose a HubSpot column heading for each column in your spreadsheet. Mapped columns will be renamed in the exported file.
          Unmapped columns will keep their original names.
        </p>
      </div>

      <div className="text-sm text-gray-500">
        {mappedCount} of {headers.length} columns mapped
      </div>

      {/* Mapping table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-1/3">
                Spreadsheet Column
              </th>
              <th className="text-center px-4 py-3 text-sm font-medium text-gray-400 w-12">
                &rarr;
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-gray-600 w-1/2">
                HubSpot Column Heading
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {headers.map((header) => {
              const match = headerMatches.find((m) => m.originalHeader === header);
              const detectedType = match?.matchedField?.hubspotField;

              return (
                <tr key={header} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-gray-900">{header}</span>
                      {detectedType && (
                        <span className="ml-2 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                          {detectedType}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400">&rarr;</td>
                  <td className="px-4 py-3 relative">
                    <div className="flex items-center gap-2">
                      <select
                        value={mapping[header] || ''}
                        onChange={(e) => handleSelect(header, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                      >
                        <option value="">-- Keep original --</option>
                        {headings.map((h) => (
                          <option key={h.id} value={h.name}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          setAddingFor(header);
                          setNewHeadingName('');
                        }}
                        className="px-2 py-2 text-primary-600 hover:bg-primary-50 rounded-lg text-sm whitespace-nowrap"
                        title="Add new column heading"
                      >
                        + Add
                      </button>
                    </div>

                    {/* Inline add popup */}
                    {addingFor === header && (
                      <div
                        ref={popupRef}
                        className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-80"
                      >
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Add New Column Heading
                        </p>
                        <div className="flex gap-2">
                          <input
                            ref={inputRef}
                            type="text"
                            value={newHeadingName}
                            onChange={(e) => setNewHeadingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddNew(header);
                              }
                              if (e.key === 'Escape') {
                                setAddingFor(null);
                                setNewHeadingName('');
                              }
                            }}
                            placeholder="Column heading name..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                          />
                          <button
                            onClick={() => handleAddNew(header)}
                            disabled={!newHeadingName.trim()}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={prevStep}
          className="px-6 py-2 text-gray-600 hover:text-gray-800"
        >
          Back
        </button>
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
