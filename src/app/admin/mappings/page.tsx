'use client';

import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/lib/supabase';

interface HubSpotField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  is_custom: boolean;
}

interface HeaderMapping {
  id: string;
  original_header: string;
  normalized_header: string;
  hubspot_field_id: string;
  hubspot_field?: HubSpotField;
  confidence: number;
  usage_count: number;
  last_used_at: string;
  created_at: string;
}

export default function MappingsPage() {
  const [hubspotFields, setHubspotFields] = useState<HubSpotField[]>([]);
  const [mappings, setMappings] = useState<HeaderMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedField, setSelectedField] = useState<string>('all');
  const [newHeader, setNewHeader] = useState('');
  const [newFieldId, setNewFieldId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch HubSpot fields
      const { data: fields } = await supabase
        .from('hubspot_fields')
        .select('*')
        .order('field_label');

      // Fetch mappings with field info
      const { data: mappingsData } = await supabase
        .from('header_mappings')
        .select('*, hubspot_field:hubspot_fields(*)')
        .order('hubspot_field_id');

      setHubspotFields(fields || []);
      setMappings(mappingsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Group mappings by HubSpot field
  const groupedMappings = mappings.reduce(
    (acc, mapping) => {
      const fieldId = mapping.hubspot_field_id;
      if (!acc[fieldId]) {
        acc[fieldId] = {
          field: mapping.hubspot_field,
          mappings: [],
        };
      }
      acc[fieldId].mappings.push(mapping);
      return acc;
    },
    {} as Record<string, { field?: HubSpotField; mappings: HeaderMapping[] }>
  );

  // Filter by selected field
  const filteredGroups =
    selectedField === 'all'
      ? Object.entries(groupedMappings)
      : Object.entries(groupedMappings).filter(([id]) => id === selectedField);

  // Add new mapping
  const handleAddMapping = async () => {
    if (!newHeader.trim() || !newFieldId) {
      setError('Please enter a header and select a field');
      return;
    }

    setIsAdding(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('header_mappings').insert({
        original_header: newHeader.trim(),
        normalized_header: newHeader.trim().toLowerCase(),
        hubspot_field_id: newFieldId,
        confidence: 1.0,
        usage_count: 0,
      });

      if (insertError) {
        if (insertError.code === '23505') {
          setError('This mapping already exists');
        } else {
          setError('Failed to add mapping');
        }
        return;
      }

      setNewHeader('');
      setNewFieldId('');
      fetchData();
    } catch {
      setError('Failed to add mapping');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete mapping
  const handleDeleteMapping = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mapping?')) return;

    try {
      await supabase.from('header_mappings').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error('Error deleting mapping:', err);
    }
  };

  // Sync HubSpot properties
  const handleSyncHubSpotProperties = async () => {
    setIsSyncing(true);
    setSyncMessage(null);

    try {
      const response = await fetch('/api/hubspot/properties', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSyncMessage({
          type: 'success',
          text: data.message,
        });
        fetchData(); // Refresh the fields list
      } else {
        setSyncMessage({
          type: 'error',
          text: data.error || 'Failed to sync properties',
        });
      }
    } catch (err) {
      console.error('Error syncing HubSpot properties:', err);
      setSyncMessage({
        type: 'error',
        text: 'Failed to sync HubSpot properties',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Field Mappings</h2>
            <p className="text-gray-500 text-sm mt-1">
              View and manage header-to-HubSpot field mappings. These are automatically learned when
              you map headers during import.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">{mappings.length} mappings / {hubspotFields.length} fields</div>
            <button
              onClick={handleSyncHubSpotProperties}
              disabled={isSyncing}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Syncing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Fetch HubSpot Properties
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sync message */}
        {syncMessage && (
          <div className={`p-4 rounded-lg ${
            syncMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {syncMessage.text}
          </div>
        )}

        {/* Add new mapping */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-medium text-gray-900 mb-3">Add New Mapping</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Header Name</label>
              <input
                type="text"
                value={newHeader}
                onChange={(e) => setNewHeader(e.target.value)}
                placeholder="e.g., First_Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex items-center text-gray-400 px-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">Maps to HubSpot Field</label>
              <select
                value={newFieldId}
                onChange={(e) => setNewFieldId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">Select a field...</option>
                {hubspotFields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.field_label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddMapping}
              disabled={isAdding}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-primary-400"
            >
              {isAdding ? 'Adding...' : 'Add Mapping'}
            </button>
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-600">Filter by field:</label>
          <select
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="all">All Fields</option>
            {hubspotFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.field_label}
              </option>
            ))}
          </select>
        </div>

        {/* Mappings grouped by field */}
        <div className="space-y-4">
          {filteredGroups.map(([fieldId, group]) => (
            <div key={fieldId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    {group.field?.field_label || 'Unknown Field'}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({group.field?.field_name})
                    </span>
                  </h3>
                  <span className="text-sm text-gray-500">
                    {group.mappings.length} mapping{group.mappings.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {group.mappings.map((mapping) => (
                  <div
                    key={mapping.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                        {mapping.original_header}
                      </code>
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 8l4 4m0 0l-4 4m4-4H3"
                        />
                      </svg>
                      <span className="text-gray-700">{group.field?.field_label}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        Used {mapping.usage_count} time{mapping.usage_count !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => handleDeleteMapping(mapping.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredGroups.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No mappings found. Mappings are created automatically when you import files and map
              headers.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
