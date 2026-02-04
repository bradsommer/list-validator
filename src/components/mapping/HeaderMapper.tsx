'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
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
    updateHeaderMatch,
    toggleRequiredField,
    addFieldMapping,
    nextStep,
    prevStep,
  } = useAppStore();

  const [showAddMapping, setShowAddMapping] = useState(false);
  const [newMapping, setNewMapping] = useState({
    hubspotField: '',
    hubspotLabel: '',
    variants: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [ignoreUnmapped, setIgnoreUnmapped] = useState(false);

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

  const handleAddMapping = () => {
    if (!newMapping.hubspotField || !newMapping.hubspotLabel) return;

    const variants = newMapping.variants
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter((v) => v);

    addFieldMapping({
      id: `custom_${Date.now()}`,
      hubspotField: newMapping.hubspotField.toLowerCase().replace(/\s+/g, '_'),
      hubspotLabel: newMapping.hubspotLabel,
      objectType: 'contacts',
      variants: [newMapping.hubspotField.toLowerCase(), ...variants],
      isRequired: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setNewMapping({ hubspotField: '', hubspotLabel: '', variants: '' });
    setShowAddMapping(false);
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
        <button
          onClick={() => setShowAddMapping(true)}
          className="px-4 py-2 text-sm bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200"
        >
          + Add Custom Field
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-700">
        <strong>Auto-Learning:</strong> Your header mappings are automatically saved for future imports.
        Next time you upload a file with similar headers, they&apos;ll be matched automatically.
      </div>

      {/* Add new mapping modal */}
      {showAddMapping && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Custom Field Mapping</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HubSpot Field Name
                </label>
                <input
                  type="text"
                  value={newMapping.hubspotField}
                  onChange={(e) => setNewMapping({ ...newMapping, hubspotField: e.target.value })}
                  placeholder="e.g., custom_field"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Label
                </label>
                <input
                  type="text"
                  value={newMapping.hubspotLabel}
                  onChange={(e) => setNewMapping({ ...newMapping, hubspotLabel: e.target.value })}
                  placeholder="e.g., Custom Field"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Variants (comma-separated)
                </label>
                <input
                  type="text"
                  value={newMapping.variants}
                  onChange={(e) => setNewMapping({ ...newMapping, variants: e.target.value })}
                  placeholder="e.g., custom, custom_field, customfield"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddMapping(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMapping}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add Mapping
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Required fields section */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Required Fields</h3>
        <div className="flex flex-wrap gap-2">
          {fieldMappings
            .filter(f => f.objectType === 'contacts')
            .slice(0, 20)
            .map((field) => (
              <button
                key={field.id}
                onClick={() => toggleRequiredField(field.hubspotField)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  requiredFields.includes(field.hubspotField)
                    ? 'bg-red-100 text-red-700 border border-red-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }`}
              >
                {field.hubspotLabel}
                {requiredFields.includes(field.hubspotField) && ' *'}
              </button>
            ))}
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
      {unmappedCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={ignoreUnmapped}
              onChange={(e) => setIgnoreUnmapped(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <div>
              <span className="text-sm font-medium text-yellow-800">
                Ignore {unmappedCount} unmapped propert{unmappedCount === 1 ? 'y' : 'ies'}
              </span>
              <p className="text-xs text-yellow-600 mt-0.5">
                Columns set to &quot;Choose a property&quot; will not be imported
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
