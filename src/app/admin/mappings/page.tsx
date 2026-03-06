'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchMappingHistory,
  getMappingHistory,
  deleteMappingHistoryEntry,
  deleteMappingHistoryEntryAsync,
  clearMappingHistory,
  clearMappingHistoryAsync,
  updateMappingHistoryEntry,
  updateMappingHistoryEntryAsync,
} from '@/lib/columnHeadings';

type ObjectType = 'contacts' | 'companies' | 'deals';

interface HubSpotProperty {
  field_name: string;
  field_label: string;
  field_type: string;
  group_name: string;
  object_type: ObjectType;
}

interface HeaderMapping {
  id: string;
  original_header: string;
  object_type: ObjectType;
  hubspot_field_name: string;
  hubspot_field_label: string;
  priority: number;
  created_at: string;
}

const OBJECT_TYPE_LABELS: Record<ObjectType, string> = {
  contacts: 'Contacts',
  companies: 'Companies',
  deals: 'Deals',
};

const OBJECT_TYPE_COLORS: Record<ObjectType, string> = {
  contacts: 'bg-primary-100 text-primary-700',
  companies: 'bg-purple-100 text-purple-700',
  deals: 'bg-green-100 text-green-700',
};

export default function MappingsPage() {
  const { user } = useAuth();
  const accountId = user?.accountId || '';

  const [allProperties, setAllProperties] = useState<HubSpotProperty[]>([]);
  const [mappings, setMappings] = useState<HeaderMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterObjectType, setFilterObjectType] = useState<ObjectType | 'all'>('all');

  // New mapping form state
  const [newHeader, setNewHeader] = useState('');
  const [newObjectType, setNewObjectType] = useState<ObjectType>('contacts');
  const [newFieldName, setNewFieldName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hubspotConnected, setHubspotConnected] = useState<boolean | null>(null);

  // Saved mapping history state
  const [savedHistory, setSavedHistory] = useState<Record<string, string>>({});
  const [historySearch, setHistorySearch] = useState('');
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadSavedHistory = async () => {
    if (accountId) {
      const history = await fetchMappingHistory(accountId);
      setSavedHistory(history);
    } else {
      setSavedHistory(getMappingHistory());
    }
  };

  const handleDeleteHistoryEntry = async (header: string) => {
    if (accountId) {
      await deleteMappingHistoryEntryAsync(header, accountId);
    } else {
      deleteMappingHistoryEntry(header);
    }
    setSavedHistory((prev) => {
      const next = { ...prev };
      delete next[header];
      return next;
    });
  };

  const handleClearAllHistory = async () => {
    if (!confirm('Clear all saved mapping history? Future imports will no longer auto-fill based on past choices.')) return;
    if (accountId) {
      await clearMappingHistoryAsync(accountId);
    } else {
      clearMappingHistory();
    }
    setSavedHistory({});
  };

  const handleUpdateHistoryEntry = async (header: string, newValue: string) => {
    if (accountId) {
      await updateMappingHistoryEntryAsync(header, newValue, accountId);
    } else {
      updateMappingHistoryEntry(header, newValue);
    }
    setSavedHistory((prev) => ({ ...prev, [header]: newValue }));
    setEditingEntry(null);
    setEditValue('');
  };

  useEffect(() => {
    fetchProperties();
    loadMappings();
    checkHubSpotConnection();
    loadSavedHistory();
  }, []);

  const fetchProperties = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/hubspot/properties');
      const data = await response.json();
      if (data.success && data.properties) {
        setAllProperties(data.properties);
      }
    } catch {
      console.error('Failed to fetch properties');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMappings = () => {
    // Load saved mappings from localStorage
    try {
      const saved = localStorage.getItem('admin_header_mappings');
      if (saved) {
        setMappings(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  };

  const saveMappings = (updated: HeaderMapping[]) => {
    setMappings(updated);
    localStorage.setItem('admin_header_mappings', JSON.stringify(updated));
  };

  const checkHubSpotConnection = async () => {
    try {
      const response = await fetch('/api/hubspot/oauth');
      const data = await response.json();
      setHubspotConnected(data.connected);
    } catch {
      setHubspotConnected(false);
    }
  };

  const handleSyncHubSpotProperties = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const response = await fetch('/api/hubspot/properties', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSyncMessage({ type: 'success', text: data.message });
        fetchProperties();
      } else {
        setSyncMessage({ type: 'error', text: data.error || 'Failed to sync properties' });
      }
    } catch {
      setSyncMessage({ type: 'error', text: 'Failed to sync HubSpot properties' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddMapping = () => {
    if (!newHeader.trim() || !newFieldName) {
      setError('Please enter a header and select a field');
      return;
    }

    const field = filteredProperties.find(p => p.field_name === newFieldName);
    if (!field) {
      setError('Selected field not found');
      return;
    }

    setIsAdding(true);
    setError('');

    // Auto-assign priority: count existing mappings for this field, new one gets next priority
    const existingCount = mappings.filter(
      m => m.hubspot_field_name === field.field_name && m.object_type === newObjectType
    ).length;

    const newMapping: HeaderMapping = {
      id: `mapping_${Date.now()}`,
      original_header: newHeader.trim(),
      object_type: newObjectType,
      hubspot_field_name: field.field_name,
      hubspot_field_label: field.field_label,
      priority: existingCount + 1,
      created_at: new Date().toISOString(),
    };

    saveMappings([...mappings, newMapping]);
    setNewHeader('');
    setNewFieldName('');
    setIsAdding(false);
  };

  const handleDeleteMapping = (id: string) => {
    if (!confirm('Delete this mapping?')) return;
    saveMappings(mappings.filter(m => m.id !== id));
  };

  const handlePriorityChange = (id: string, newPriority: number) => {
    saveMappings(mappings.map(m => m.id === id ? { ...m, priority: newPriority } : m));
  };

  // Properties filtered by the selected object type in the "Add" form
  const filteredProperties = allProperties.filter(p => p.object_type === newObjectType);

  // Mappings filtered by the view filter
  const filteredMappings = filterObjectType === 'all'
    ? mappings
    : mappings.filter(m => m.object_type === filterObjectType);

  // Counts per object type
  const propertyCounts = {
    contacts: allProperties.filter(p => p.object_type === 'contacts').length,
    companies: allProperties.filter(p => p.object_type === 'companies').length,
    deals: allProperties.filter(p => p.object_type === 'deals').length,
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
              Map spreadsheet headers to HubSpot properties. These mappings are used during import to auto-match columns.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            {mappings.length} mappings / {allProperties.length} properties
          </div>
        </div>

        {/* HubSpot Connection Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${hubspotConnected ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="font-medium text-gray-900">
                {hubspotConnected ? 'Connected to HubSpot' : 'Not connected to HubSpot'}
              </span>
              {!hubspotConnected && (
                <Link href="/admin/integrations" className="text-sm text-primary-600 hover:text-primary-700 underline">
                  Set up in Integrations
                </Link>
              )}
              {hubspotConnected && allProperties.length > 0 && (
                <span className="text-sm text-gray-500">
                  ({propertyCounts.contacts} contact, {propertyCounts.companies} company, {propertyCounts.deals} deal properties)
                </span>
              )}
            </div>
            {hubspotConnected && (
              <button
                onClick={handleSyncHubSpotProperties}
                disabled={isSyncing}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-orange-400 flex items-center gap-2 text-sm"
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
                  'Fetch HubSpot Properties'
                )}
              </button>
            )}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="w-40">
              <label className="block text-sm text-gray-600 mb-1">Object Type</label>
              <select
                value={newObjectType}
                onChange={(e) => {
                  setNewObjectType(e.target.value as ObjectType);
                  setNewFieldName('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="contacts">Contacts</option>
                <option value="companies">Companies</option>
                <option value="deals">Deals</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm text-gray-600 mb-1">HubSpot Property</label>
              <select
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">Select a property...</option>
                {filteredProperties
                  .sort((a, b) => a.field_label.localeCompare(b.field_label))
                  .map((prop) => (
                    <option key={prop.field_name} value={prop.field_name}>
                      {prop.field_label}
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
          <label className="text-sm text-gray-600">Filter by type:</label>
          <select
            value={filterObjectType}
            onChange={(e) => setFilterObjectType(e.target.value as ObjectType | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
          >
            <option value="all">All Types ({mappings.length})</option>
            <option value="contacts">Contacts ({mappings.filter(m => m.object_type === 'contacts').length})</option>
            <option value="companies">Companies ({mappings.filter(m => m.object_type === 'companies').length})</option>
            <option value="deals">Deals ({mappings.filter(m => m.object_type === 'deals').length})</option>
          </select>
        </div>

        {/* Mappings table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Header Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Object Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">HubSpot Property</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Priority</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                      {mapping.original_header}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${OBJECT_TYPE_COLORS[mapping.object_type]}`}>
                      {OBJECT_TYPE_LABELS[mapping.object_type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {mapping.hubspot_field_label}
                    <span className="ml-2 text-xs text-gray-400">({mapping.hubspot_field_name})</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      min={1}
                      value={mapping.priority || 1}
                      onChange={(e) => handlePriorityChange(mapping.id, parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDeleteMapping(mapping.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredMappings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {allProperties.length === 0
                ? 'No HubSpot properties loaded. Connect to HubSpot and click "Fetch HubSpot Properties" to get started.'
                : 'No mappings found. Add mappings above to teach the system how to match spreadsheet headers to HubSpot properties.'}
            </div>
          )}
        </div>

        {/* Saved Mapping History */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Saved Mapping History</h2>
              <p className="text-gray-500 text-sm mt-1">
                These are auto-learned from past imports. When a spreadsheet header matches an entry here, it will be pre-filled automatically.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">
                {Object.keys(savedHistory).length} saved
              </span>
              {Object.keys(savedHistory).length > 0 && (
                <button
                  onClick={handleClearAllHistory}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {Object.keys(savedHistory).length > 0 && (
            <div className="mb-3">
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder="Search saved mappings..."
                className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Spreadsheet Header</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-400 w-10">&rarr;</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Maps To</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600 w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(savedHistory)
                  .filter(([header, value]) => {
                    if (!historySearch) return true;
                    const q = historySearch.toLowerCase();
                    return header.toLowerCase().includes(q) || value.toLowerCase().includes(q);
                  })
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([header, value]) => (
                    <tr key={header} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {header}
                        </code>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-400">&rarr;</td>
                      <td className="px-4 py-3">
                        {editingEntry === header ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateHistoryEntry(header, editValue);
                                if (e.key === 'Escape') { setEditingEntry(null); setEditValue(''); }
                              }}
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateHistoryEntry(header, editValue)}
                              disabled={!editValue.trim()}
                              className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => { setEditingEntry(null); setEditValue(''); }}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className={value === '__do_not_use__' ? 'text-red-500 text-sm' : 'text-gray-700 text-sm'}>
                            {value === '__do_not_use__' ? 'Do not use' : value}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditingEntry(header); setEditValue(value === '__do_not_use__' ? '' : value); }}
                            className="text-primary-600 hover:text-primary-700 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteHistoryEntry(header)}
                            className="text-red-600 hover:text-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {Object.keys(savedHistory).length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No saved mapping history yet. Mappings are automatically saved when you complete an import.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
