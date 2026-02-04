'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { supabase } from '@/lib/supabase';
import type { HeaderMatch, HubSpotObjectType } from '@/types';

const OBJECT_TYPE_LABELS: Record<HubSpotObjectType, string> = {
  contacts: 'Contacts',
  companies: 'Companies',
  deals: 'Deals',
};

const SKIP_IMPORT_VALUE = '__skip__';

export function HeaderMapper() {
  const {
    parsedFile,
    headerMatches,
    fieldMappings,
    requiredFields,
    setRequiredFields,
    updateHeaderMatch,
    nextStep,
    prevStep,
  } = useAppStore();

  const [dbRequiredFields, setDbRequiredFields] = useState<string[]>([]);

  // Fetch required properties from database on mount
  useEffect(() => {
    const fetchRequired = async () => {
      try {
        const { data: setting } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'required_properties')
          .single();

        if (setting?.value) {
          const parsed = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
          if (Array.isArray(parsed)) {
            setDbRequiredFields(parsed);
            // Also update the store so validation can use them
            // Extract just the field names (strip objectType: prefix)
            const fieldNames = parsed.map((f: string) => f.includes(':') ? f.split(':', 2)[1] : f);
            setRequiredFields(fieldNames);
          }
        }
      } catch (err) {
        console.error('Error fetching required properties:', err);
      }
    };
    fetchRequired();
  }, [setRequiredFields]);

  const [isSaving, setIsSaving] = useState(false);
  const [ignoreUnmapped, setIgnoreUnmapped] = useState(false);

  // Store original object types before bulk-skipping, so we can restore on uncheck
  const [savedObjectTypes, setSavedObjectTypes] = useState<Record<number, string>>({});

  // Track selected object type per row (default to 'contacts', or '__skip__' for don't import)
  const [rowObjectTypes, setRowObjectTypes] = useState<Record<number, string>>(() => {
    const initial: Record<number, string> = {};
    headerMatches.forEach((match, i) => {
      initial[i] = match.matchedField?.objectType || 'contacts';
    });
    return initial;
  });

  const getRowObjectType = (index: number): string => {
    return rowObjectTypes[index] || 'contacts';
  };

  const isRowSkipped = (index: number): boolean => {
    return getRowObjectType(index) === SKIP_IMPORT_VALUE;
  };

  const handleIgnoreUnmapped = (checked: boolean) => {
    setIgnoreUnmapped(checked);
    if (checked) {
      // Save current object types for unmapped rows, then skip them
      const saved: Record<number, string> = {};
      const updated: Record<number, string> = { ...rowObjectTypes };
      headerMatches.forEach((match, i) => {
        if (!match.isMatched && !isRowSkipped(i)) {
          saved[i] = getRowObjectType(i);
          updated[i] = SKIP_IMPORT_VALUE;
        }
      });
      setSavedObjectTypes(saved);
      setRowObjectTypes(updated);
    } else {
      // Restore previously saved object types
      const updated: Record<number, string> = { ...rowObjectTypes };
      Object.entries(savedObjectTypes).forEach(([idx, objectType]) => {
        const i = Number(idx);
        if (isRowSkipped(i)) {
          updated[i] = objectType;
        }
      });
      setRowObjectTypes(updated);
      setSavedObjectTypes({});
    }
  };

  const setRowObjectType = (index: number, objectType: string) => {
    setRowObjectTypes(prev => ({ ...prev, [index]: objectType }));
    // Clear the current mapping since the property list changed or row is skipped
    const match = headerMatches[index];
    if (match.isMatched) {
      updateHeaderMatch(index, {
        ...match,
        matchedField: null,
        confidence: 0,
        isMatched: false,
      });
    }
  };

  // Save mappings to the database for future auto-matching
  const saveMappingsToDatabase = useCallback(async () => {
    const mappingsToSave = headerMatches
      .filter((match) => match.isMatched && match.matchedField)
      .map((match) => ({
        originalHeader: match.originalHeader,
        hubspotField: match.matchedField!.hubspotField,
      }));

    if (mappingsToSave.length === 0) return;

    try {
      await fetch('/api/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: mappingsToSave }),
      });
    } catch (error) {
      console.error('Failed to save mappings:', error);
    }
  }, [headerMatches]);

  if (!parsedFile) {
    return <div className="text-center text-gray-500">No file uploaded</div>;
  }

  // Track which HubSpot fields are already mapped (excluding current row)
  const getUsedFieldIds = (excludeIndex: number): Set<string> => {
    const used = new Set<string>();
    headerMatches.forEach((match, i) => {
      if (i !== excludeIndex && match.isMatched && match.matchedField) {
        used.add(match.matchedField.id);
      }
    });
    return used;
  };

  const handleMappingChange = (index: number, fieldId: string | null) => {
    const field = fieldId ? fieldMappings.find((f) => f.id === fieldId) : null;

    // If this field is already mapped to another header, clear that mapping first
    if (field) {
      headerMatches.forEach((match, i) => {
        if (i !== index && match.isMatched && match.matchedField?.id === field.id) {
          updateHeaderMatch(i, {
            ...match,
            matchedField: null,
            confidence: 0,
            isMatched: false,
          });
        }
      });
    }

    const updatedMatch: HeaderMatch = {
      ...headerMatches[index],
      matchedField: field || null,
      confidence: field ? 1 : 0,
      isMatched: !!field,
    };
    updateHeaderMatch(index, updatedMatch);
  };

  const handleContinue = async () => {
    setIsSaving(true);
    saveMappingsToDatabase();
    nextStep();
    setIsSaving(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    if (confidence > 0) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-600';
  };

  // Count mapped, skipped, and unmapped headers
  const skippedCount = headerMatches.filter((_, i) => isRowSkipped(i)).length;
  const mappedCount = headerMatches.filter((m) => m.isMatched).length;
  const unmappedCount = headerMatches.length - mappedCount - skippedCount;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Map Headers to HubSpot Fields</h2>
          <p className="text-sm text-gray-500 mt-1">
            {mappedCount} of {headerMatches.length} headers mapped
            {skippedCount > 0 && ` (${skippedCount} skipped)`}
            {unmappedCount > 0 && ` (${unmappedCount} unmapped)`}
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>Auto-Learning:</strong> Your header mappings are automatically saved for future imports.
        Next time you upload a file with similar headers, they&apos;ll be matched automatically.
      </div>

      {/* Required properties info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">
              Required Properties
              {requiredFields.length > 0 && (
                <span className="ml-2 text-xs text-red-600 font-normal">
                  ({requiredFields.length} required)
                </span>
              )}
            </h3>
            {requiredFields.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {requiredFields.map((field) => (
                  <span
                    key={field}
                    className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 border border-red-200"
                  >
                    {fieldMappings.find((f) => f.hubspotField === field)?.hubspotLabel || field} *
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">No required properties configured.</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 text-sm shrink-0 ml-4">
            <Link
              href="/admin/required-properties"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              Edit Required Properties
            </Link>
            <Link
              href="/admin/required-properties"
              className="text-gray-500 hover:text-gray-700 hover:underline"
            >
              View Required Properties
            </Link>
          </div>
        </div>
      </div>

      {/* Header mapping table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Spreadsheet Header
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700" style={{ minWidth: '150px' }}>
                Object Type
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                HubSpot Property
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Confidence
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                Sample Data
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {headerMatches.map((match, index) => {
              const usedFieldIds = getUsedFieldIds(index);
              const objectType = getRowObjectType(index);
              const skipped = isRowSkipped(index);
              const filteredFields = skipped ? [] : fieldMappings.filter(f => f.objectType === objectType);

              return (
                <tr key={index} className={`hover:bg-gray-50 ${skipped ? 'opacity-50' : ''}`}>
                  <td className="px-4 py-3">
                    <span className="font-medium">{match.originalHeader}</span>
                  </td>
                  <td className="px-4 py-3" style={{ minWidth: '150px' }}>
                    <select
                      value={objectType}
                      onChange={(e) => setRowObjectType(index, e.target.value)}
                      className={`w-full px-2 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 text-sm ${
                        skipped ? 'border-red-300 bg-red-50 text-red-600' : 'border-gray-300'
                      }`}
                    >
                      {(Object.keys(OBJECT_TYPE_LABELS) as HubSpotObjectType[]).map(type => (
                        <option key={type} value={type}>{OBJECT_TYPE_LABELS[type]}</option>
                      ))}
                      <option value={SKIP_IMPORT_VALUE}>Don&apos;t Import</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={skipped ? '' : (match.matchedField?.id || '')}
                      onChange={(e) => handleMappingChange(index, e.target.value || null)}
                      disabled={skipped}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 ${
                        skipped ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Choose a property</option>
                      {filteredFields
                        .sort((a, b) => a.hubspotLabel.localeCompare(b.hubspotLabel))
                        .map((field) => {
                          const isUsed = usedFieldIds.has(field.id);
                          return (
                            <option
                              key={field.id}
                              value={field.id}
                              disabled={isUsed}
                            >
                              {field.hubspotLabel}
                              {requiredFields.includes(field.hubspotField) ? ' *' : ''}
                              {isUsed ? ' (already mapped)' : ''}
                            </option>
                          );
                        })}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {skipped ? (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">
                        Skipped
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(
                          match.confidence
                        )}`}
                      >
                        {Math.round(match.confidence * 100)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {parsedFile.rows[0]?.[match.originalHeader]?.toString().substring(0, 30) || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Ignore unmapped checkbox */}
      {(unmappedCount > 0 || ignoreUnmapped) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreUnmapped}
              onChange={(e) => handleIgnoreUnmapped(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-yellow-800">
                {ignoreUnmapped
                  ? `Ignoring ${Object.keys(savedObjectTypes).length} unmapped propert${Object.keys(savedObjectTypes).length === 1 ? 'y' : 'ies'}`
                  : `Ignore ${unmappedCount} unmapped propert${unmappedCount === 1 ? 'y' : 'ies'}`
                }
              </span>
              <p className="text-xs text-yellow-600 mt-0.5">
                {ignoreUnmapped
                  ? 'Unmapped columns are set to Don\u2019t Import and will be skipped'
                  : 'Columns set to \u201CChoose a property\u201D will not be imported'
                }
              </p>
            </div>
          </label>
        </div>
      )}

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
          disabled={isSaving || (unmappedCount > 0 && !ignoreUnmapped)}
          className={`px-6 py-2 rounded-lg ${
            isSaving || (unmappedCount > 0 && !ignoreUnmapped)
              ? 'bg-primary-600 text-white opacity-40 cursor-not-allowed'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {isSaving ? 'Saving...' : 'Continue to Validation'}
        </button>
      </div>
    </div>
  );
}
