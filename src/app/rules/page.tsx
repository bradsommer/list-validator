'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAccountRules,
  toggleRuleEnabled,
  updateRuleConfig,
  deleteAccountRule,
  initializeAccountRules,
  type AccountRule,
} from '@/lib/accountRules';
import type { HubSpotObjectType } from '@/types';

const OBJECT_TYPES: { value: HubSpotObjectType; label: string }[] = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'companies', label: 'Companies' },
  { value: 'deals', label: 'Deals' },
];

type SortField = 'name' | 'ruleType' | 'targetFields' | 'objectTypes' | 'displayOrder' | 'enabled';
type SortDirection = 'asc' | 'desc';

function getObjectTypes(rule: AccountRule): HubSpotObjectType[] {
  return (rule.config?.objectTypes as HubSpotObjectType[]) || [];
}

export default function RulesPage() {
  const { user, isLoading: isAuthLoading, isAdmin, canEdit: userCanEdit } = useAuth();
  const searchParams = useSearchParams();
  const [rules, setRules] = useState<AccountRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [deletingRule, setDeletingRule] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('displayOrder');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; position: 'above' | 'below' } | null>(null);

  useEffect(() => {
    if (searchParams.get('saved') === '1') {
      setShowSavedToast(true);
      window.history.replaceState({}, '', '/rules');
    }
  }, [searchParams]);

  useEffect(() => {
    if (showSavedToast) {
      const timer = setTimeout(() => setShowSavedToast(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [showSavedToast]);

  const canEditRules = isAdmin || userCanEdit('rules');
  const accountId = user?.accountId || 'default';

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    let accountRules = await fetchAccountRules(accountId);

    // For accounts with no rules, seed the full default rule set
    if (accountRules.length === 0) {
      setIsInitializing(true);
      const initialized = await initializeAccountRules(accountId);
      if (initialized) {
        accountRules = await fetchAccountRules(accountId);
      }
      setIsInitializing(false);
    }

    setRules(accountRules);
    setIsLoading(false);
  }, [accountId]);

  useEffect(() => {
    if (!isAuthLoading) {
      loadRules();
    }
  }, [loadRules, isAuthLoading]);

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.ruleId === ruleId ? { ...r, enabled: !currentEnabled } : r))
    );

    const success = await toggleRuleEnabled(accountId, ruleId, !currentEnabled);
    if (!success) {
      setRules((prev) =>
        prev.map((r) => (r.ruleId === ruleId ? { ...r, enabled: currentEnabled } : r))
      );
    }
  };

  const handleDeleteRule = async (rule: AccountRule) => {
    if (!confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return;

    setDeletingRule(rule.ruleId);
    const success = await deleteAccountRule(accountId, rule.ruleId);
    if (success) {
      setRules((prev) => prev.filter((r) => r.ruleId !== rule.ruleId));
    }
    setDeletingRule(null);
  };


  // --- Drag and drop ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDragIndex(null);
    setDropTarget(null);
  };

  const handleRowDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragIndex === null || dragIndex === index) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'above' : 'below';
    setDropTarget({ index, position });
  };

  const handleRowDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if leaving the row entirely (not entering a child)
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !(e.currentTarget as HTMLElement).contains(related)) {
      setDropTarget(null);
    }
  };

  const handleRowDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault();

    if (dragIndex === null || !dropTarget) {
      setDragIndex(null);
      setDropTarget(null);
      return;
    }

    // Calculate the actual insertion index
    let toIndex = dropTarget.index;
    if (dropTarget.position === 'below') {
      toIndex += 1;
    }
    // Adjust for the removed item
    if (dragIndex < toIndex) {
      toIndex -= 1;
    }

    if (dragIndex === toIndex) {
      setDragIndex(null);
      setDropTarget(null);
      return;
    }

    const reordered = [...sortedRules];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(toIndex, 0, moved);

    // Assign new display orders
    const updated = reordered.map((r, i) => ({ ...r, displayOrder: i + 1 }));
    setRules(updated);
    setDragIndex(null);
    setDropTarget(null);

    // Persist
    try {
      await Promise.all(
        updated.map((r) =>
          updateRuleConfig(accountId, r.ruleId, { displayOrder: r.displayOrder })
        )
      );
    } catch (error) {
      console.error('Failed to save order:', error);
      await loadRules();
    }
  };


  // Sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedRules = [...rules].sort((a, b) => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    switch (sortField) {
      case 'name':
        return dir * a.name.localeCompare(b.name);
      case 'ruleType':
        return dir * a.ruleType.localeCompare(b.ruleType);
      case 'targetFields':
        return dir * (a.targetFields.join(', ')).localeCompare(b.targetFields.join(', '));
      case 'objectTypes': {
        const aTypes = getObjectTypes(a).join(', ') || 'all';
        const bTypes = getObjectTypes(b).join(', ') || 'all';
        return dir * aTypes.localeCompare(bTypes);
      }
      case 'displayOrder':
        return dir * (a.displayOrder - b.displayOrder);
      case 'enabled':
        return dir * (Number(a.enabled) - Number(b.enabled));
      default:
        return 0;
    }
  });

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="text-gray-400">
          {sortField === field ? (
            sortDirection === 'asc' ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )
          ) : (
            <svg className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          )}
        </span>
      </div>
    </th>
  );

  return (
    <AdminLayout>
      {/* Success toast */}
      {showSavedToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Rule saved successfully
          <button onClick={() => setShowSavedToast(false)} className="ml-2 p-0.5 hover:bg-green-500 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-8 py-3 sm:py-0">
          <p className="text-gray-600">
            Validation rules that clean and format your uploaded data. Toggle rules on or off to control which validations run during import.
            {' '}
            <Link href="/docs/rules" className="text-primary-600 hover:text-primary-700 hover:underline inline-flex items-center gap-1">
              View documentation
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </p>
          {canEditRules && (
            <Link
              href="/rules/new"
              className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-1.5 shrink-0 self-start sm:self-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Rule
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-500">
            <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
            {isInitializing ? 'Initializing rules for your account...' : 'Loading...'}
          </div>
        ) : rules.length > 0 ? (
          <>
            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 py-3 w-8"></th>
                    <SortHeader field="enabled">Enabled</SortHeader>
                    <SortHeader field="name">Name</SortHeader>
                    <SortHeader field="ruleType">Type</SortHeader>
                    <SortHeader field="targetFields">Target Fields</SortHeader>
                    <SortHeader field="objectTypes">Object Types</SortHeader>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedRules.map((rule, index) => {
                    const objectTypes = getObjectTypes(rule);
                    const isDeleting = deletingRule === rule.ruleId;
                    const showDropAbove = dropTarget?.index === index && dropTarget?.position === 'above' && dragIndex !== null;
                    const showDropBelow = dropTarget?.index === index && dropTarget?.position === 'below' && dragIndex !== null;

                    return (
                      <React.Fragment key={rule.id}>
                        <tr
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => handleRowDragOver(e, index)}
                          onDragLeave={handleRowDragLeave}
                          onDrop={(e) => handleRowDrop(e, index)}
                          className={`hover:bg-gray-50 ${dragIndex === index ? 'opacity-50' : ''}`}
                          style={
                            showDropAbove
                              ? { boxShadow: 'inset 0 2px 0 0 var(--color-primary-500, #14b8a6)' }
                              : showDropBelow
                              ? { boxShadow: 'inset 0 -2px 0 0 var(--color-primary-500, #14b8a6)' }
                              : undefined
                          }
                        >
                          {/* Drag handle */}
                          <td className="px-2 py-3 w-8">
                            <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600" title="Drag to reorder">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <circle cx="9" cy="6" r="1.5" />
                                <circle cx="15" cy="6" r="1.5" />
                                <circle cx="9" cy="12" r="1.5" />
                                <circle cx="15" cy="12" r="1.5" />
                                <circle cx="9" cy="18" r="1.5" />
                                <circle cx="15" cy="18" r="1.5" />
                              </svg>
                            </div>
                          </td>
                          {/* Enabled toggle */}
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleRule(rule.ruleId, rule.enabled)}
                              className={`relative w-10 h-5 rounded-full transition-colors ${
                                rule.enabled ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            >
                              <span
                                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                  rule.enabled ? 'left-5' : 'left-0.5'
                                }`}
                              />
                            </button>
                          </td>

                          {/* Name + description */}
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 text-sm">{rule.name}</div>
                            {rule.description && (
                              <p className="text-xs text-gray-500 mt-0.5 max-w-xs truncate" title={rule.description}>
                                {rule.description}
                              </p>
                            )}
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${
                                rule.ruleType === 'transform'
                                  ? 'bg-primary-100 text-primary-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}
                            >
                              {rule.ruleType === 'transform' ? 'Transform' : 'Validate'}
                            </span>
                          </td>

                          {/* Target Fields */}
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {rule.targetFields.length > 0 ? (() => {
                              const text = rule.targetFields.join(', ');
                              return text.length > 26
                                ? <span title={text}>{text.slice(0, 26)}...</span>
                                : text;
                            })() : <span className="text-gray-400">all</span>}
                          </td>

                          {/* Object Types */}
                          <td className="px-4 py-3">
                            {objectTypes.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {objectTypes.map((ot) => (
                                  <span key={ot} className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 whitespace-nowrap">
                                    {ot}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">all</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/rules/${encodeURIComponent(rule.ruleId)}/edit`}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </Link>
                              {canEditRules && (
                                <button
                                  onClick={() => handleDeleteRule(rule)}
                                  disabled={isDeleting}
                                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                                  title="Delete"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-gray-600 font-medium">No validation rules found</p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              The database migration may not have been run yet.
            </p>
            <div className="space-y-2">
              <p className="text-xs text-gray-400">
                Run the migration to seed default rules:
              </p>
              <code className="block text-xs bg-gray-100 px-3 py-2 rounded text-gray-700 font-mono">
                npx supabase db push
              </code>
              <p className="text-xs text-gray-400 mt-4">
                Or manually insert rules for account: <strong>{accountId}</strong>
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
