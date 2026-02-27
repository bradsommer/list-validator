'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAccountRules,
  toggleRuleEnabled,
  updateRuleConfig,
  initializeAccountRules,
  type AccountRule,
} from '@/lib/accountRules';
import type { HubSpotObjectType } from '@/types';

const OBJECT_TYPES: { value: HubSpotObjectType; label: string }[] = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'companies', label: 'Companies' },
  { value: 'deals', label: 'Deals' },
];

function getObjectTypes(rule: AccountRule): HubSpotObjectType[] {
  return (rule.config?.objectTypes as HubSpotObjectType[]) || [];
}

export default function RulesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [rules, setRules] = useState<AccountRule[]>([]);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState<Record<string, string>>({});
  const [loadingSource, setLoadingSource] = useState<string | null>(null);
  const [copiedRule, setCopiedRule] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

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

  // Load rules from database, auto-initialize if empty
  const loadRules = useCallback(async () => {
    setIsLoading(true);
    let accountRules = await fetchAccountRules(accountId);

    // If no rules for this account, try to initialize from 'default'
    if (accountRules.length === 0 && accountId !== 'default') {
      setIsInitializing(true);
      const initialized = await initializeAccountRules(accountId, 'default');
      if (initialized) {
        accountRules = await fetchAccountRules(accountId);
      }
      setIsInitializing(false);
    }

    // If still no rules (e.g., 'default' has no rules either), try fetching from 'default' directly
    if (accountRules.length === 0) {
      accountRules = await fetchAccountRules('default');
    }

    setRules(accountRules);
    setIsLoading(false);
  }, [accountId]);

  useEffect(() => {
    // Wait for auth to finish loading before fetching rules,
    // otherwise accountId defaults to 'default' and shows empty state
    if (!isAuthLoading) {
      loadRules();
    }
  }, [loadRules, isAuthLoading]);

  // Fetch source code for a rule
  const fetchSourceCode = async (ruleId: string) => {
    if (sourceCode[ruleId]) return;

    setLoadingSource(ruleId);
    try {
      const response = await fetch(`/api/rules/source?id=${encodeURIComponent(ruleId)}`);
      if (response.ok) {
        const data = await response.json();
        setSourceCode((prev) => ({ ...prev, [ruleId]: data.source }));
      } else {
        setSourceCode((prev) => ({ ...prev, [ruleId]: '// Source code not available' }));
      }
    } catch {
      setSourceCode((prev) => ({ ...prev, [ruleId]: '// Failed to load source code' }));
    }
    setLoadingSource(null);
  };

  // Replace hardcoded targetFields in source with DB values
  const getDisplaySource = (ruleId: string, rule: AccountRule): string => {
    const raw = sourceCode[ruleId];
    if (!raw) return '';
    const dbFields = rule.targetFields;
    if (dbFields.length === 0) return raw;
    const formatted = `[${dbFields.map((f) => `'${f}'`).join(', ')}]`;
    return raw.replace(/targetFields\s*=\s*\[.*?\];/, `targetFields = ${formatted};`);
  };

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

  const handleExpandRule = (ruleId: string) => {
    if (expandedRule === ruleId) {
      setExpandedRule(null);
    } else {
      setExpandedRule(ruleId);
      fetchSourceCode(ruleId);
    }
  };

  const handleCopyCode = async (ruleId: string) => {
    const code = sourceCode[ruleId];
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedRule(ruleId);
      setTimeout(() => setCopiedRule(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedRule(ruleId);
      setTimeout(() => setCopiedRule(null), 2000);
    }
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

    // Load source code for editing
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
    // Clean up undefined keys
    if (!updatedConfig.objectTypes) delete updatedConfig.objectTypes;

    const success = await updateRuleConfig(accountId, rule.ruleId, {
      name: editName.trim() || rule.name,
      description: editDescription.trim() || null,
      targetFields,
      config: updatedConfig,
    });

    // Save source code if it was modified
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

  const enableAll = async () => {
    const updates = rules.filter((r) => !r.enabled).map((r) => r.ruleId);
    setRules((prev) => prev.map((r) => ({ ...r, enabled: true })));

    for (const ruleId of updates) {
      await toggleRuleEnabled(accountId, ruleId, true);
    }
  };

  const disableAll = async () => {
    const updates = rules.filter((r) => r.enabled).map((r) => r.ruleId);
    setRules((prev) => prev.map((r) => ({ ...r, enabled: false })));

    for (const ruleId of updates) {
      await toggleRuleEnabled(accountId, ruleId, false);
    }
  };

  const enabledCount = rules.filter((r) => r.enabled).length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
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
          <div className="flex gap-2">
            <button
              onClick={enableAll}
              className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100"
            >
              Enable All
            </button>
            <button
              onClick={disableAll}
              className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100"
            >
              Disable All
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {enabledCount} of {rules.length} rules enabled
        </div>

        <div className="space-y-3">
          {/* Column header */}
          {!isLoading && rules.length > 0 && (
            <div className="flex items-center px-4 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">
              <div className="w-10 shrink-0 text-center mr-3">Enabled</div>
              <div className="flex-1"></div>
              <div className="shrink-0 ml-2">Actions</div>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
              {isInitializing ? 'Initializing rules for your account...' : 'Loading...'}
            </div>
          ) : (
            rules.map((rule) => {
              const isExpanded = expandedRule === rule.ruleId;
              const isEditing = editingRule === rule.ruleId;
              const source = isExpanded ? getDisplaySource(rule.ruleId, rule) : '';
              const isLoadingThisSource = loadingSource === rule.ruleId;
              const isSaving = saving === rule.ruleId;
              const objectTypes = getObjectTypes(rule);

              return (
                <div
                  key={rule.id}
                  className={`border rounded-lg overflow-hidden ${
                    rule.enabled ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* Rule header */}
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Toggle */}
                      <div className="flex flex-col items-center shrink-0">
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
                        <span className={`text-[10px] mt-0.5 ${rule.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                          {rule.enabled ? 'On' : 'Off'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-gray-900">{rule.name}</span>
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              rule.ruleType === 'transform'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {rule.ruleType === 'transform' ? 'Transform' : 'Validate'}
                          </span>
                          {objectTypes.length > 0 && objectTypes.map((ot) => (
                            <span key={ot} className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                              {ot}
                            </span>
                          ))}
                        </div>
                        {rule.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            Target fields: {rule.targetFields.join(', ') || 'all'}
                          </span>
                          <span className="text-xs text-gray-400">
                            Order: {rule.displayOrder}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => isEditing ? cancelEditing() : startEditing(rule)}
                        className={`px-3 py-1.5 text-sm rounded ${
                          isEditing
                            ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {isEditing ? 'Cancel' : 'Edit'}
                      </button>
                      <button
                        onClick={() => handleExpandRule(rule.ruleId)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                      >
                        {isExpanded ? 'Hide Code' : 'View Code'}
                      </button>
                    </div>
                  </div>

                  {/* Edit panel */}
                  {isEditing && (
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 space-y-4">
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
                        <p className="text-xs text-gray-400 mt-1">
                          Leave all unchecked to apply to all object types.
                        </p>
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
                        <p className="text-xs text-gray-400 mt-1">
                          Comma-separated list of field names this rule targets.
                        </p>
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
                            <div className="flex" style={{ height: '480px' }}>
                              {/* Line numbers */}
                              <div
                                ref={lineNumbersRef}
                                className="select-none overflow-hidden shrink-0 py-3 pl-3 pr-2 text-right text-sm font-mono text-gray-600 bg-gray-950 border-r border-gray-700"
                                style={{ lineHeight: '1.5rem' }}
                              >
                                {editCode.split('\n').map((_, i) => (
                                  <div key={i}>{i + 1}</div>
                                ))}
                              </div>
                              {/* Code textarea */}
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
                          Changes to source code require a server restart to take effect in the validation pipeline.
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
                  )}

                  {/* Code view */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-900 relative">
                      {/* Copy button */}
                      {source && !isLoadingThisSource && (
                        <button
                          onClick={() => handleCopyCode(rule.ruleId)}
                          className="absolute top-3 right-3 p-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors z-10"
                          title="Copy code"
                        >
                          {copiedRule === rule.ruleId ? (
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      )}
                      <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto">
                        {isLoadingThisSource ? (
                          <div className="text-gray-400 text-sm">Loading source code...</div>
                        ) : (
                          <pre className="text-sm text-green-400 font-mono whitespace-pre">
                            {source || '// Loading...'}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {!isLoading && rules.length === 0 && (
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
