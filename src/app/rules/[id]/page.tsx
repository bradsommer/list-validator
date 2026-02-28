'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAccountRules,
  updateRuleConfig,
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

export default function EditRulePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const ruleId = params.id as string;

  const [rule, setRule] = useState<AccountRule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRuleType, setEditRuleType] = useState<'transform' | 'validate'>('transform');
  const [editTargetFields, setEditTargetFields] = useState('');
  const [editObjectTypes, setEditObjectTypes] = useState<HubSpotObjectType[]>([]);
  const [editCode, setEditCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [originalCode, setOriginalCode] = useState('');
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const accountId = user?.accountId || 'default';

  const loadRule = useCallback(async () => {
    setIsLoading(true);
    try {
      const allRules = await fetchAccountRules(accountId);
      const found = allRules.find((r) => r.ruleId === ruleId);
      if (found) {
        setRule(found);
        setEditName(found.name);
        setEditDescription(found.description || '');
        setEditRuleType(found.ruleType);
        setEditTargetFields(found.targetFields.join(', '));
        setEditObjectTypes(getObjectTypes(found));
      } else {
        router.push('/rules');
      }
    } catch (error) {
      console.error('Failed to load rule:', error);
    }
    setIsLoading(false);
  }, [accountId, ruleId, router]);

  useEffect(() => {
    loadRule();
  }, [loadRule]);

  // Load source code
  useEffect(() => {
    const loadSourceCode = async () => {
      setLoadingCode(true);
      try {
        const response = await fetch(`/api/rules/source?id=${encodeURIComponent(ruleId)}`);
        if (response.ok) {
          const data = await response.json();
          setEditCode(data.source);
          setOriginalCode(data.source);
        } else {
          setEditCode('// Source code not available');
          setOriginalCode('');
        }
      } catch {
        setEditCode('// Failed to load source code');
        setOriginalCode('');
      }
      setLoadingCode(false);
    };

    loadSourceCode();
  }, [ruleId]);

  const handleEditCodeScroll = () => {
    if (editTextareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editTextareaRef.current.scrollTop;
    }
  };

  const handleCopyCode = async () => {
    if (!editCode) return;
    try {
      await navigator.clipboard.writeText(editCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = editCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const toggleEditObjectType = (type: HubSpotObjectType) => {
    setEditObjectTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSave = async () => {
    if (!rule) return;
    setIsSaving(true);

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
      ruleType: editRuleType,
      targetFields,
      config: updatedConfig,
    });

    // Save source code if it was modified
    if (editCode && editCode !== originalCode) {
      setSavingCode(true);
      try {
        const res = await fetch('/api/rules/source', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: rule.ruleId, source: editCode }),
        });
        if (res.ok) {
          setOriginalCode(editCode);
        }
      } catch {
        console.error('Failed to save source code');
      }
      setSavingCode(false);
    }

    if (success) {
      router.push('/rules');
    }

    setIsSaving(false);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading...
        </div>
      </AdminLayout>
    );
  }

  if (!rule) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-500">Rule not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/rules')}
              className="flex items-center gap-1 px-2 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back</span>
            </button>
            <h2 className="text-lg font-semibold text-gray-900">Edit Rule</h2>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving || savingCode}
            className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {isSaving || savingCode ? 'Saving...' : 'Save'}
          </button>
        </div>

        {/* Form */}
        <div className="border rounded-lg bg-white p-6 space-y-4">
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

          {/* Rule Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
            <select
              value={editRuleType}
              onChange={(e) => setEditRuleType(e.target.value as 'transform' | 'validate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none bg-white"
            >
              <option value="transform">Transform</option>
              <option value="validate">Validate</option>
            </select>
          </div>

          {/* Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
            <div className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 bg-gray-50">
              {rule.displayOrder}
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
              {!loadingCode && editCode && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title="Copy code"
                >
                  {copiedCode ? (
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
            {loadingCode ? (
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

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <button
              onClick={handleSave}
              disabled={isSaving || savingCode}
              className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50"
            >
              {isSaving || savingCode ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => router.push('/rules')}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
