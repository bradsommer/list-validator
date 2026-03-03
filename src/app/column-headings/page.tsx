'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchColumnHeadings,
  addColumnHeadingAsync,
  removeColumnHeadingAsync,
  updateColumnHeadingAsync,
  getColumnHeadings,
  type ColumnHeading,
} from '@/lib/columnHeadings';

type SortKey = 'name' | 'hubspotObjectType' | 'source' | 'createdAt';
type SortDirection = 'asc' | 'desc';

export default function ColumnHeadingsPage() {
  const { user } = useAuth();
  const [headings, setHeadings] = useState<ColumnHeading[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hubspotConnected, setHubspotConnected] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const accountId = user?.accountId || '';

  // Check HubSpot connection status
  useEffect(() => {
    async function checkConnection() {
      try {
        const response = await fetch('/api/hubspot/oauth', {
          headers: {
            'x-account-id': accountId,
          },
        });
        const data = await response.json();
        setHubspotConnected(data.connected === true);
      } catch {
        setHubspotConnected(false);
      }
    }
    checkConnection();
  }, [accountId]);

  // Load headings from Supabase (or localStorage fallback)
  const loadHeadings = useCallback(async () => {
    if (!accountId) {
      // No account - use localStorage only
      setHeadings(getColumnHeadings());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchColumnHeadings(accountId);
      setHeadings(data);
    } catch (err) {
      console.error('Failed to load headings:', err);
      setHeadings(getColumnHeadings());
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadHeadings();
  }, [loadHeadings]);

  const handleAdd = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    // Prevent duplicates
    if (headings.some((h) => h.name.toLowerCase() === trimmed.toLowerCase())) return;

    if (accountId) {
      await addColumnHeadingAsync(trimmed, accountId);
      await loadHeadings();
    } else {
      const { addColumnHeading } = await import('@/lib/columnHeadings');
      addColumnHeading(trimmed);
      setHeadings(getColumnHeadings());
    }
    setNewName('');
  };

  const handleRemove = async (id: string) => {
    if (accountId) {
      await removeColumnHeadingAsync(id, accountId);
      await loadHeadings();
    } else {
      const { removeColumnHeading } = await import('@/lib/columnHeadings');
      removeColumnHeading(id);
      setHeadings(getColumnHeadings());
    }
  };

  const handleStartEdit = (heading: ColumnHeading) => {
    setEditingId(heading.id);
    setEditingName(heading.name);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;

    if (accountId) {
      await updateColumnHeadingAsync(editingId, trimmed, accountId);
      await loadHeadings();
    } else {
      const { updateColumnHeading } = await import('@/lib/columnHeadings');
      updateColumnHeading(editingId, trimmed);
      setHeadings(getColumnHeadings());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  const handleReSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const response = await fetch('/api/hubspot/sync-headings', {
        method: 'POST',
        headers: {
          'x-account-id': accountId,
        },
      });
      const data = await response.json();
      if (data.success) {
        setSyncMessage({ type: 'success', text: data.message });
        await loadHeadings();
      } else {
        setSyncMessage({ type: 'error', text: data.error || 'Failed to sync.' });
      }
    } catch {
      setSyncMessage({ type: 'error', text: 'Failed to sync HubSpot properties.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedHeadings = useMemo(() => {
    const sorted = [...headings].sort((a, b) => {
      let aVal: string;
      let bVal: string;

      switch (sortKey) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'hubspotObjectType':
          aVal = (a.hubspotObjectType || '').toLowerCase();
          bVal = (b.hubspotObjectType || '').toLowerCase();
          break;
        case 'source':
          aVal = a.source || '';
          bVal = b.source || '';
          break;
        case 'createdAt':
          aVal = a.createdAt || '';
          bVal = b.createdAt || '';
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [headings, sortKey, sortDirection]);

  const manualCount = headings.filter((h) => h.source !== 'hubspot').length;
  const hubspotCount = headings.filter((h) => h.source === 'hubspot').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-600">
              Manage the output headings you use when importing lists into HubSpot. During import, you can map your spreadsheet columns to these headings so the exported file matches HubSpot&#39;s expected format.
            </p>
          </div>

          {hubspotConnected && (
            <button
              onClick={handleReSync}
              disabled={isSyncing}
              className="ml-4 flex-shrink-0 px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
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
                  Re-Sync
                </>
              )}
            </button>
          )}
        </div>

        {/* Sync status message */}
        {syncMessage && (
          <div className={`p-4 rounded-lg ${
            syncMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {syncMessage.text}
          </div>
        )}

        {/* Add new heading */}
        <div className="flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleAdd)}
            placeholder="Enter an output heading name..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>

        {/* Headings list */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
              Loading...
            </div>
          ) : headings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No output headings added yet. Add your first one above.
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {([
                    { key: 'name' as SortKey, label: 'Output Heading', align: 'left' },
                    { key: 'hubspotObjectType' as SortKey, label: 'Object', align: 'left' },
                    { key: 'source' as SortKey, label: 'Source', align: 'left' },
                    { key: 'createdAt' as SortKey, label: 'Added', align: 'left' },
                  ]).map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="text-left px-4 py-3 text-sm font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        <svg className={`w-3.5 h-3.5 ${sortKey === col.key ? 'text-gray-900' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {sortKey === col.key && sortDirection === 'desc' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          )}
                        </svg>
                      </span>
                    </th>
                  ))}
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sortedHeadings.map((heading) => {
                  const isHubSpot = heading.source === 'hubspot';

                  return (
                    <tr key={heading.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {editingId === heading.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                            autoFocus
                            className="px-3 py-1 border border-primary-300 rounded focus:ring-2 focus:ring-primary-500 outline-none w-full max-w-sm"
                          />
                        ) : (
                          <span className="font-medium text-gray-900">{heading.name}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {heading.hubspotObjectType ? (
                          <span className="capitalize">{heading.hubspotObjectType}</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isHubSpot ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3">
                              <path d="M17.83 11.14V7.52a2.12 2.12 0 0 0 1.23-1.92 2.14 2.14 0 0 0-2.14-2.14 2.14 2.14 0 0 0-2.14 2.14c0 .84.5 1.57 1.21 1.92v3.62a4.93 4.93 0 0 0-2.31 1.19l-6.1-4.75a2.07 2.07 0 0 0 .06-.48 2.07 2.07 0 1 0-2.07 2.07c.35 0 .68-.09.97-.25l5.99 4.66a4.94 4.94 0 0 0-.49 2.14 5 5 0 0 0 5 5 5 5 0 0 0 5-5 4.99 4.99 0 0 0-4.21-4.94zm-.91 7.44a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                            </svg>
                            HubSpot
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                            Manual
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(heading.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {editingId === heading.id ? (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1 text-sm bg-gray-50 text-gray-700 rounded hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            {!isHubSpot && (
                              <button
                                onClick={() => handleStartEdit(heading)}
                                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                              >
                                Edit
                              </button>
                            )}
                            <button
                              onClick={() => handleRemove(heading.id)}
                              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="text-sm text-gray-500">
          {headings.length} output heading{headings.length !== 1 ? 's' : ''} configured
          {hubspotCount > 0 && (
            <span className="ml-2">
              ({manualCount} manual, {hubspotCount} from HubSpot)
            </span>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
