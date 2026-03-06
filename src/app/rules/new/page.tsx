'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { createAccountRule } from '@/lib/accountRules';
import type { HubSpotObjectType } from '@/types';

const OBJECT_TYPES: { value: HubSpotObjectType; label: string }[] = [
  { value: 'contacts', label: 'Contacts' },
  { value: 'companies', label: 'Companies' },
  { value: 'deals', label: 'Deals' },
];

export default function NewRulePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [editCode, setEditCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    ruleId: '',
    name: '',
    description: '',
    ruleType: 'validate' as 'transform' | 'validate',
    targetFields: '',
    objectTypes: [] as HubSpotObjectType[],
    displayOrder: 100,
  });

  const accountId = user?.accountId || 'default';

  const handleSave = async () => {
    if (!formData.ruleId.trim() || !formData.name.trim()) {
      alert('Please fill in the Rule ID and Display Name');
      return;
    }

    setIsSaving(true);

    try {
      const created = await createAccountRule(accountId, {
        ruleId: formData.ruleId.trim(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        ruleType: formData.ruleType,
        targetFields: formData.targetFields.split(',').map((f) => f.trim()).filter(Boolean),
        config: { objectTypes: formData.objectTypes },
        displayOrder: formData.displayOrder,
        enabled: true,
        sourceCode: editCode.trim() || undefined,
      });

      if (created) {
        router.push('/rules?saved=1');
        return;
      }
    } catch (error) {
      console.error('Failed to create rule:', error);
    }

    setIsSaving(false);
  };

  const toggleObjectType = (type: HubSpotObjectType) => {
    setFormData((prev) => ({
      ...prev,
      objectTypes: prev.objectTypes.includes(type)
        ? prev.objectTypes.filter((t) => t !== type)
        : [...prev.objectTypes, type],
    }));
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

  const handleCodeScroll = () => {
    if (editTextareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = editTextareaRef.current.scrollTop;
    }
  };

  return (
    <AdminLayout hideChrome>
      <div className="space-y-6" style={{ paddingTop: '40px' }}>
        {/* Fixed top save bar */}
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-3 shadow-md" style={{ backgroundColor: '#0B8377' }}>
          <div className="flex items-center gap-3">
            <Link
              href="/rules"
              className="p-2 text-green-200 rounded transition-colors [&:hover]:!bg-[rgb(238,229,191)] [&:hover]:!text-[#000000]"
              title="Back to Rules"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h2 className="text-lg font-semibold text-white">New Rule</h2>
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
              {isSaving ? 'Creating...' : 'Create Rule'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* Rule ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule ID *</label>
              <input
                type="text"
                value={formData.ruleId}
                onChange={(e) => setFormData((prev) => ({ ...prev, ruleId: e.target.value }))}
                placeholder="e.g. my-custom-validation"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
              />
              <p className="text-xs text-gray-400 mt-1">Unique identifier (lowercase, hyphens). Must match a script file name.</p>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. My Custom Validation"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={2}
              placeholder="What does this rule do?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.ruleType}
                onChange={(e) => setFormData((prev) => ({ ...prev, ruleType: e.target.value as 'transform' | 'validate' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
              >
                <option value="validate">Validate</option>
                <option value="transform">Transform</option>
              </select>
            </div>

            {/* Target Fields */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Fields</label>
              <input
                type="text"
                value={formData.targetFields}
                onChange={(e) => setFormData((prev) => ({ ...prev, targetFields: e.target.value }))}
                placeholder="e.g. email, phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
              />
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData((prev) => ({ ...prev, displayOrder: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500 outline-none"
              />
            </div>
          </div>

          {/* Object Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Applies to Object Types</label>
            <div className="flex gap-3">
              {OBJECT_TYPES.map((ot) => (
                <label key={ot.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.objectTypes.includes(ot.value)}
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
              {editCode && (
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
            <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-900">
              <div className="flex" style={{ height: '320px' }}>
                <div
                  ref={lineNumbersRef}
                  className="select-none overflow-hidden shrink-0 py-3 pl-3 pr-2 text-right text-sm font-mono text-gray-600 bg-gray-950 border-r border-gray-700"
                  style={{ lineHeight: '1.5rem' }}
                >
                  {(editCode || '\n').split('\n').map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={editTextareaRef}
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  onScroll={handleCodeScroll}
                  spellCheck={false}
                  placeholder="// Write your rule code here..."
                  className="flex-1 px-3 py-3 text-sm font-mono bg-gray-900 text-green-400 outline-none resize-none placeholder-gray-600"
                  style={{ lineHeight: '1.5rem' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
