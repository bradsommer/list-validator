'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAccountRules,
  toggleRuleEnabled,
  updateRuleConfig,
  deleteAccountRule,
  createAccountRule,
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
  const { user, isLoading: isAuthLoading } = useAuth();
  const [rules, setRules] = useState<AccountRule[]>([]);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [deletingRule, setDeletingRule] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('displayOrder');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetFields, setEditTargetFields] = useState('');
  const [editObjectTypes, setEditObjectTypes] = useState<HubSpotObjectType[]>([]);
  const [editCode, setEditCode] = useState('');
  const [loadingEditCode, setLoadingEditCode] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [copiedEditCode, setCopiedEditCode] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

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

  const handleCopyEditCode = async () => {
    if (!editCode) return;
    try {
      await navigator.clipboard.writeText(editCode);
      setCopiedEditCode(true);
      setTimeout(() => setCopiedEditCode(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = editCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedEditCode(true);
      setTimeout(() => setCopiedEditCode(false), 2000);
    }
  };

  const handleEditCodeScroll = () => {
    if (editTextareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editTextareaRef.current.scrollTop;
    }
  };

  const startEditing = async (rule: AccountRule) => {
    setEditingRule(rule.ruleId);
    setEditName(rule.name);
    setEditDescription(rule.description || '');
    setEditTargetFields(rule.targetFields.join(', '));
    setEditObjectTypes(getObjectTypes(rule));

    if (sourceCode[rule.ruleId]) {
      setEditCode(sourceCode[rule.ruleId]);
    } else {
      setLoadingEditCode(true);
      try {
        const response = await fetch(`/api/rules/source?id=${encodeURIComponent(rule.ruleId)}`);
        if (response.ok) {
          const data = await response.json();
          setSourceCode((prev) => ({ ...prev, [rule.ruleId]: data.source }));
          setEditCode(data.source);
        } else {
          setEditCode('// Source code not available');
        }
      } catch {
        setEditCode('// Failed to load source code');
      }
      setLoadingEditCode(false);
    }
  };

  const cancelEditing = () => {
    setEditingRule(null);
  };

  const toggleEditObjectType = (type: HubSpotObjectType) => {
    setEditObjectTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSave = async (rule: AccountRule) => {
    setSaving(rule.ruleId);

    const targetFields = editTargetFields
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    const updatedConfig = {
      ...rule.config,
      objectTypes: editObjectTypes.length > 0 ? editObjectTypes : undefined,
    };
    if (!updatedConfig.objectTypes) delete updatedConfig.objectTypes;

    const success = await updateRuleConfig(accountId, rule.ruleId, {
      name: editName.trim() || rule.name,
      description: editDescription.trim() || null,
      targetFields,
      config: updatedConfig,
    });

    const originalCode = sourceCode[rule.ruleId] || '';
    if (editCode && editCode !== originalCode) {
      setSavingCode(true);
      try {
        const res = await fetch('/api/rules/source', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: rule.ruleId, source: editCode }),
        });
        if (res.ok) {
          setSourceCode((prev) => ({ ...prev, [rule.ruleId]: editCode }));
        }
      } catch {
        console.error('Failed to save source code');
      }
      setSavingCode(false);
    }

    if (success) {
      setRules((prev) =>
        prev.map((r) =>
          r.ruleId === rule.ruleId
            ? {
                ...r,
                name: editName.trim() || r.name,
                description: editDescription.trim() || null,
                targetFields,
                config: updatedConfig,
              }
            : r
        )
      );
      setEditingRule(null);
    }

    setSaving(null);
  };

  // --- Add new rule ---
  const [isAdding, setIsAdding] = useState(false);
  const [newRuleId, setNewRuleId] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newRuleType, setNewRuleType] = useState<'transform' | 'validate'>('validate');
  const [newTargetFields, setNewTargetFields] = useState('');
  const [newDisplayOrder, setNewDisplayOrder] = useState(100);
  const [isCreating, setIsCreating] = useState(false);

  const resetAddForm = () => {
    setNewRuleId('');
    setNewName('');
    setNewDescription('');
    setNewRuleType('validate');
    setNewTargetFields('');
    setNewDisplayOrder(100);
    setIsAdding(false);
  };

  const handleCreateRule = async () => {
    if (!newRuleId.trim() || !newName.trim()) return;
    setIsCreating(true);

    const created = await createAccountRule(accountId, {
      ruleId: newRuleId.trim(),
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      ruleType: newRuleType,
      targetFields: newTargetFields.split(',').map((f) => f.trim()).filter(Boolean),
      displayOrder: newDisplayOrder,
      enabled: true,
    });

    if (created) {
      setRules((prev) => [...prev, created]);
      resetAddForm();
    }
    setIsCreating(false);
  };

  const enabledCount = rules.filter((r) => r.enabled).length;

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
      <div className="space-y-6">
        <div>
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
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {enabledCount} of {rules.length} rules enabled
          </div>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Rule
            </button>
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
                    <SortHeader field="enabled">Enabled</SortHeader>
                    <SortHeader field="name">Name</SortHeader>
                    <SortHeader field="ruleType">Type</SortHeader>
                    <SortHeader field="targetFields">Target Fields</SortHeader>
                    <SortHeader field="objectTypes">Object Types</SortHeader>
                    <SortHeader field="displayOrder">Order</SortHeader>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedRules.map((rule) => {
                    const objectTypes = getObjectTypes(rule);
                    const isDeleting = deletingRule === rule.ruleId;
                    const isEditing = editingRule === rule.ruleId;
                    const isSaving = saving === rule.ruleId;

                    return (
                      <React.Fragment key={rule.id}>
                        <tr className={`hover:bg-gray-50 ${isEditing ? 'bg-primary-50' : ''}`}>
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
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}
                            >
                              {rule.ruleType === 'transform' ? 'Transform' : 'Validate'}
                            </span>
                          </td>

                          {/* Target Fields */}
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {rule.targetFields.length > 0 ? rule.targetFields.join(', ') : <span className="text-gray-400">all</span>}
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

                          {/* Display Order */}
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {rule.displayOrder}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => isEditing ? cancelEditing() : startEditing(rule)}
                                className="text-sm text-primary-600 hover:text-primary-700 hover:underline whitespace-nowrap"
                              >
                                {isEditing ? 'Close' : 'Edit'}
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule)}
                                disabled={isDeleting}
                                className="text-sm text-red-500 hover:text-red-700 hover:underline whitespace-nowrap disabled:opacity-50"
                              >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Inline edit panel — renders directly under the rule row */}
                        {isEditing && (
                          <tr>
                            <td colSpan={7} className="px-0 py-0">
                              <div className="bg-gray-50 border-t border-b border-primary-200 px-5 py-4 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  {/* Name */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                                    <input
                                      type="text"
                                      value={editName}
                                      onChange={(e) => setEditName(e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                                    />
                                  </div>

                                  {/* Target Fields */}
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Fields</label>
                                    <input
                                      type="text"
                                      value={editTargetFields}
                                      onChange={(e) => setEditTargetFields(e.target.value)}
                                      placeholder="e.g. email, phone, firstname"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Comma-separated field names.</p>
                                  </div>
                                </div>

                                {/* Description */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                  <textarea
                                    value={editDescription}
                                    onChange={(e) => setEditDescription(e.target.value)}
                                    rows={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none resize-none"
                                  />
                                </div>

                                {/* Object Types */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Applies to Object Types</label>
                                  <div className="flex gap-3">
                                    {OBJECT_TYPES.map((ot) => (
                                      <label key={ot.value} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={editObjectTypes.includes(ot.value)}
                                          onChange={() => toggleEditObjectType(ot.value)}
                                          className="w-4 h-4 text-primary-500 focus:ring-primary-500 rounded"
                                        />
                                        <span className="text-sm text-gray-700">{ot.label}</span>
                                      </label>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-400 mt-1">Leave all unchecked to apply to all object types.</p>
                                </div>

                                {/* Source Code */}
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-medium text-gray-700">Source Code</label>
                                    {!loadingEditCode && editCode && (
                                      <button
                                        type="button"
                                        onClick={handleCopyEditCode}
                                        className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                                        title="Copy code"
                                      >
                                        {copiedEditCode ? (
                                          <>
                                            <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Copied
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                            Copy
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                  {loadingEditCode ? (
                                    <div className="flex items-center gap-2 py-4 text-sm text-gray-500">
                                      <div className="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full" />
                                      Loading source code...
                                    </div>
                                  ) : (
                                    <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-900">
                                      <div className="flex" style={{ height: '320px' }}>
                                        <div
                                          ref={lineNumbersRef}
                                          className="select-none overflow-hidden shrink-0 py-3 pl-3 pr-2 text-right text-sm font-mono text-gray-600 bg-gray-950 border-r border-gray-700"
                                          style={{ lineHeight: '1.5rem' }}
                                        >
                                          {editCode.split('\n').map((_, i) => (
                                            <div key={i}>{i + 1}</div>
                                          ))}
                                        </div>
                                        <textarea
                                          ref={editTextareaRef}
                                          value={editCode}
                                          onChange={(e) => setEditCode(e.target.value)}
                                          onScroll={handleEditCodeScroll}
                                          spellCheck={false}
                                          className="flex-1 px-3 py-3 text-sm font-mono bg-gray-900 text-green-400 outline-none resize-none"
                                          style={{ lineHeight: '1.5rem' }}
                                        />
                                      </div>
                                    </div>
                                  )}
                                  <p className="text-xs text-gray-400 mt-1">
                                    Changes to source code require a server restart to take effect.
                                  </p>
                                </div>

                                {/* Save / Cancel */}
                                <div className="flex justify-end gap-2 pt-2">
                                  <button
                                    onClick={cancelEditing}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => handleSave(rule)}
                                    disabled={isSaving || savingCode}
                                    className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                                  >
                                    {isSaving || savingCode ? 'Saving...' : 'Save Changes'}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add new rule form */}
            {isAdding && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Add New Rule</h3>
                  <button onClick={resetAddForm} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rule ID</label>
                      <input
                        type="text"
                        value={newRuleId}
                        onChange={(e) => setNewRuleId(e.target.value)}
                        placeholder="e.g. my-custom-validation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                      />
                      <p className="text-xs text-gray-400 mt-1">Unique identifier (lowercase, hyphens). Must match a script file name.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. My Custom Validation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={2}
                      placeholder="What does this rule do?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={newRuleType}
                        onChange={(e) => setNewRuleType(e.target.value as 'transform' | 'validate')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                      >
                        <option value="validate">Validate</option>
                        <option value="transform">Transform</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Fields</label>
                      <input
                        type="text"
                        value={newTargetFields}
                        onChange={(e) => setNewTargetFields(e.target.value)}
                        placeholder="e.g. email, phone"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                      <input
                        type="number"
                        value={newDisplayOrder}
                        onChange={(e) => setNewDisplayOrder(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={resetAddForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                    <button
                      onClick={handleCreateRule}
                      disabled={isCreating || !newRuleId.trim() || !newName.trim()}
                      className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
                    >
                      {isCreating ? 'Creating...' : 'Create Rule'}
                    </button>
                  </div>
                </div>
              </div>
            )}
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
