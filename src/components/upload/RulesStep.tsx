'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/contexts/AuthContext';
import { fetchAccountRules, type AccountRule } from '@/lib/accountRules';

export function RulesStep({ onCancel }: { onCancel?: () => void }) {
  const { user } = useAuth();
  const {
    importRuleOverrides,
    setImportRuleOverrides,
    toggleImportRuleOverride,
    nextStep,
    prevStep,
  } = useAppStore();

  const [rules, setRules] = useState<AccountRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const accountId = user?.accountId || 'default';

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const accountRules = await fetchAccountRules(accountId);
      setRules(accountRules);

      // Initialize overrides from DB defaults only if not already set
      if (Object.keys(importRuleOverrides).length === 0) {
        const overrides: Record<string, boolean> = {};
        for (const rule of accountRules) {
          overrides[rule.ruleId] = rule.enabled;
        }
        setImportRuleOverrides(overrides);
      }
    } catch (error) {
      console.error('Failed to load rules:', error);
    }
    setIsLoading(false);
  }, [accountId, importRuleOverrides, setImportRuleOverrides]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const enabledCount = rules.filter((r) => importRuleOverrides[r.ruleId]).length;

  const handleEnableAll = () => {
    const overrides: Record<string, boolean> = {};
    for (const rule of rules) {
      overrides[rule.ruleId] = true;
    }
    setImportRuleOverrides(overrides);
  };

  const handleDisableAll = () => {
    const overrides: Record<string, boolean> = {};
    for (const rule of rules) {
      overrides[rule.ruleId] = false;
    }
    setImportRuleOverrides(overrides);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading rules...</p>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rules</h2>
          <p className="text-gray-600 mt-1">
            No rules are configured. Click continue to proceed.
          </p>
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            {onCancel && (
              <button onClick={onCancel} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">
                Cancel
              </button>
            )}
            <button
              onClick={prevStep}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
          <button
            onClick={nextStep}
            className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
          >
            Continue
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Rules</h2>
          <p className="text-gray-600 mt-1">
            Toggle rules on or off for this import. {enabledCount} of {rules.length} rules enabled.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEnableAll}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Enable All
          </button>
          <button
            onClick={handleDisableAll}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Disable All
          </button>
        </div>
      </div>

      {/* Rules table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rule
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Target Fields
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Enabled
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rules.map((rule) => {
              const isEnabled = importRuleOverrides[rule.ruleId] ?? rule.enabled;
              return (
                <tr
                  key={rule.ruleId}
                  className={`hover:bg-gray-50 transition-colors ${
                    !isEnabled ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{rule.name}</div>
                    {rule.description && (
                      <div className="text-sm text-gray-500 mt-0.5">{rule.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        rule.ruleType === 'transform'
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {rule.ruleType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {rule.targetFields.length > 0
                      ? rule.targetFields.join(', ')
                      : 'All fields'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleImportRuleOverride(rule.ruleId)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        isEnabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                          isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={prevStep}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <button
          onClick={nextStep}
          className="px-6 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
        >
          Continue
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
