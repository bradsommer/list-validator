'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const ruleId = decodeURIComponent(params.ruleId as string);

  const [rule, setRule] = useState<AccountRule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetFields, setEditTargetFields] = useState('');
  const [editObjectTypes, setEditObjectTypes] = useState<HubSpotObjectType[]>([]);
  const [editCode, setEditCode] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const accountId = user?.accountId || 'default';

  const loadRule = useCallback(async () => {
    setIsLoading(true);
    const accountRules = await fetchAccountRules(accountId);
    const found = accountRules.find((r) => r.ruleId === ruleId);
    if (found) {
      setRule(found);
      setEditName(found.name);
      setEditDescription(found.description || '');
      setEditTargetFields(found.targetFields.join(', '));
      setEditObjectTypes(getObjectTypes(found));

      // Load source code — prefer DB, fall back to file-based API
      setLoadingCode(true);
      if (found.sourceCode) {
        setEditCode(found.sourceCode);
      } else {
        try {
          const response = await fetch(`/api/rules/source?id=${encodeURIComponent(found.ruleId)}&accountId=${encodeURIComponent(accountId)}`);
          if (response.ok) {
            const data = await response.json();
            setEditCode(data.source || '');
          } else {
            setEditCode('');
          }
        } catch {
          setEditCode('');
        }
      }
      setLoadingCode(false);
    }
    setIsLoading(false);
  }, [accountId, ruleId]);

  useEffect(() => {
    if (!isAuthLoading) {
      loadRule();
    }
  }, [loadRule, isAuthLoading]);

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

  const handleCodeScroll = () => {
    if (editTextareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editTextareaRef.current.scrollTop;
    }
  };

  const toggleObjectType = (type: HubSpotObjectType) => {
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
      objectTypes: editObjectTypes,
    };

    const success = await updateRuleConfig(accountId, rule.ruleId, {
      name: editName.trim() || rule.name,
      description: editDescription.trim() || null,
      targetFields,
      config: updatedConfig,
      sourceCode: editCode || null,
    });

    setIsSaving(false);

    if (success) {
      router.push('/rules?saved=1');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-center py-12 text-gray-500">
          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
          Loading rule...
        </div>
      </AdminLayout>
    );
  }

  if (!rule) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-gray-600 font-medium">Rule not found</p>
          <Link href="/rules" className="text-primary-600 hover:underline mt-2 inline-block">
            Back to Rules
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout hideChrome>
      <div className="space-y-6" style={{ paddingTop: '40px' }}>
        {/* Fixed top save bar */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 shadow-md" style={{ backgroundColor: '#0d9487' }}>
          <div className="flex items-center gap-3">
            <Link
              href="/rules"
              className="p-2 text-green-200 hover:text-white rounded transition-colors [&:hover]:!bg-[rgb(238,229,191)]"
              title="Back to Rules"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h2 className="text-lg font-semibold text-white">Edit Rule</h2>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/rules"
              className="px-4 py-2 text-sm text-white hover:text-green-200"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-50 shadow-sm"
              style={{ backgroundColor: '#EEE5BF', color: '#000000' }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
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
                    onChange={() => toggleObjectType(ot.value)}
                    className="w-4 h-4 text-primary-500 focus:ring-primary-500 rounded"
                  />
                  <span className="text-sm text-gray-700">{ot.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">Select which object types this rule applies to.</p>
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
                    onScroll={handleCodeScroll}
                    spellCheck={false}
                    className="flex-1 px-3 py-3 text-sm font-mono bg-gray-900 text-green-400 outline-none resize-none"
                    style={{ lineHeight: '1.5rem' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
