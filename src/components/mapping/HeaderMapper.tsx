'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import type { HeaderMatch } from '@/types';

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
      // Don't block the user - mappings are saved for convenience, not required
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

    // Save mappings in background (don't wait for completion)
    saveMappingsToDatabase();

    // Proceed immediately
    nextStep();
    setIsSaving(false);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    if (confidence > 0) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-600';
  };

  // Count mapped and unmapped headers
  const mappedCount = headerMatches.filter((m) => m.isMatched).length;
  const unmappedCount = headerMatches.length - mappedCount;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Map Headers to HubSpot Fields</h2>
          <p className="text-sm text-gray-500 mt-1">
            {mappedCount} of {headerMatches.length} headers mapped
            {unmappedCount > 0 && ` (${unmappedCount} will not be imported)`}
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
          {fieldMappings.map((field) => (
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
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                HubSpot Field
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
              return (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-medium">{match.originalHeader}</span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={match.matchedField?.id || ''}
                    onChange={(e) => handleMappingChange(index, e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Choose a property</option>
                    {fieldMappings.map((field) => {
                      const isUsed = usedFieldIds.has(field.id);
                      return (
                        <option
                          key={field.id}
                          value={field.id}
                          disabled={isUsed}
                          className={isUsed ? 'text-gray-400' : ''}
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
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${getConfidenceColor(
                      match.confidence
                    )}`}
                  >
                    {Math.round(match.confidence * 100)}%
                  </span>
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
          disabled={isSaving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400"
        >
          {isSaving ? 'Saving...' : 'Continue to Validation'}
        </button>
      </div>
    </div>
  );
}
