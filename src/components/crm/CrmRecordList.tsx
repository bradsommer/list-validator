'use client';

import { useEffect, useState, useCallback } from 'react';
import type { CrmObjectType } from '@/types';

interface CrmProperty {
  id: string;
  name: string;
  label: string;
  field_type: string;
  is_system: boolean;
  is_required: boolean;
  sort_order: number;
  options: { value: string; label: string }[];
}

interface CrmRecord {
  id: string;
  object_type: string;
  properties: Record<string, string | number | boolean | null>;
  dedup_key: string | null;
  hubspot_record_id: string | null;
  expires_at: string;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  objectType: CrmObjectType;
  title: string;
  dedupLabel: string;
}

export function CrmRecordList({ objectType, title, dedupLabel }: Props) {
  const [records, setRecords] = useState<CrmRecord[]>([]);
  const [properties, setProperties] = useState<CrmProperty[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<CrmRecord | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createFormData, setCreateFormData] = useState<Record<string, string>>({});
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchProperties = useCallback(async () => {
    const res = await fetch(`/api/crm/properties?objectType=${objectType}`);
    const data = await res.json();
    if (data.success) setProperties(data.properties || []);
  }, [objectType]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      objectType,
      page: String(page),
      ...(search ? { search } : {}),
    });
    const res = await fetch(`/api/crm/records?${params}`);
    const data = await res.json();
    if (data.success) {
      setRecords(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    }
    setLoading(false);
  }, [objectType, page, search]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const handleOpenCreate = () => {
    setCreateFormData({});
    setCreateError('');
    setShowCreateForm(true);
  };

  const handleCreateFieldChange = (fieldName: string, value: string) => {
    setCreateFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    // Filter out empty values
    const props: Record<string, string> = {};
    for (const [key, val] of Object.entries(createFormData)) {
      if (val.trim()) props[key] = val.trim();
    }

    if (Object.keys(props).length === 0) {
      setCreateError('Please fill in at least one field.');
      return;
    }

    // Check required dedup field
    if (objectType === 'contacts' && !props.email) {
      setCreateError('Email is required for contacts.');
      return;
    }
    if (objectType === 'companies' && !props.name && !props.domain) {
      setCreateError('Company name or domain is required for companies.');
      return;
    }
    if (objectType === 'deals' && !props.dealname) {
      setCreateError('Deal name is required for deals.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/crm/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectType, properties: props }),
      });
      const data = await res.json();
      if (!data.success) {
        setCreateError(data.error || 'Failed to create record.');
        return;
      }
      setShowCreateForm(false);
      setCreateFormData({});
      fetchRecords();
    } catch {
      setCreateError('Network error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const displayProps = properties.slice(0, 6);

  const getPropertyValue = (record: CrmRecord, propName: string): string => {
    const val = record.properties[propName];
    if (val === null || val === undefined) return '';
    return String(val);
  };

  const daysUntilExpiry = (expiresAt: string): number => {
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  };

  const renderFieldInput = (prop: CrmProperty) => {
    const value = createFormData[prop.name] || '';

    if (prop.field_type === 'select' && prop.options?.length > 0) {
      return (
        <select
          value={value}
          onChange={(e) => handleCreateFieldChange(prop.name, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Select...</option>
          {prop.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (prop.field_type === 'boolean') {
      return (
        <select
          value={value}
          onChange={(e) => handleCreateFieldChange(prop.name, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">Select...</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    return (
      <input
        type={prop.field_type === 'number' ? 'number' : prop.field_type === 'date' ? 'date' : 'text'}
        value={value}
        onChange={(e) => handleCreateFieldChange(prop.name, e.target.value)}
        placeholder={prop.label}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {total} record{total !== 1 ? 's' : ''} — records expire after 15 days unless refreshed by a new upload
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create {objectType === 'contacts' ? 'Contact' : objectType === 'companies' ? 'Company' : 'Deal'}
        </button>
      </div>

      {/* Create record form */}
      {showCreateForm && (
        <form onSubmit={handleCreateSubmit} className="bg-gray-50 border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">
              New {objectType === 'contacts' ? 'Contact' : objectType === 'companies' ? 'Company' : 'Deal'}
            </h3>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {createError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{createError}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {properties.map((prop) => (
              <div key={prop.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {prop.label}
                  {prop.is_required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderFieldInput(prop)}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Record'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-gray-600 text-sm hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={`Search by ${dedupLabel.toLowerCase()}, name...`}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"
        >
          Search
        </button>
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}
            className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </form>

      {/* Records table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading records...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-500">No {objectType} found</p>
          <p className="text-gray-400 text-sm mt-1">Create a record or import data to get started</p>
        </div>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {displayProps.map((prop) => (
                      <th key={prop.name} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {prop.label}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      HubSpot
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {records.map((record) => {
                    const days = daysUntilExpiry(record.expires_at);
                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedRecord(record)}
                      >
                        {displayProps.map((prop) => (
                          <td key={prop.name} className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                            {getPropertyValue(record, prop.name) || <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-sm">
                          {record.hubspot_record_id ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Synced
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                              Not synced
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`${days <= 3 ? 'text-red-600 font-medium' : days <= 7 ? 'text-yellow-600' : 'text-gray-500'}`}>
                            {days}d
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} records)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Record detail modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedRecord(null)}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Record Details</h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-2 font-medium capitalize">{selectedRecord.object_type}</span>
                </div>
                <div>
                  <span className="text-gray-500">{dedupLabel}:</span>
                  <span className="ml-2 font-medium">{selectedRecord.dedup_key || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">HubSpot ID:</span>
                  <span className="ml-2 font-medium">{selectedRecord.hubspot_record_id || 'Not synced'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Expires:</span>
                  <span className="ml-2 font-medium">{new Date(selectedRecord.expires_at).toLocaleDateString()}</span>
                </div>
                {selectedRecord.synced_at && (
                  <div>
                    <span className="text-gray-500">Last synced:</span>
                    <span className="ml-2 font-medium">{new Date(selectedRecord.synced_at).toLocaleString()}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Updated:</span>
                  <span className="ml-2 font-medium">{new Date(selectedRecord.updated_at).toLocaleString()}</span>
                </div>
              </div>

              {/* All properties */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Properties</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <tbody className="divide-y divide-gray-100">
                      {properties.map((prop) => {
                        const val = selectedRecord.properties[prop.name];
                        return (
                          <tr key={prop.name} className={val ? '' : 'opacity-50'}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-600 w-1/3 bg-gray-50">
                              {prop.label}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-800">
                              {val !== null && val !== undefined ? String(val) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Show any extra properties not in the defined schema */}
                      {Object.entries(selectedRecord.properties)
                        .filter(([key]) => !properties.some((p) => p.name === key))
                        .map(([key, val]) => (
                          <tr key={key}>
                            <td className="px-4 py-2 text-sm font-medium text-gray-600 w-1/3 bg-gray-50">
                              {key}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-800">
                              {val !== null && val !== undefined ? String(val) : '—'}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
