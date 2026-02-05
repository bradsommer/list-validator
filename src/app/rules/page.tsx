'use client';

import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAccountRules,
  toggleRuleEnabled,
  initializeAccountRules,
  type AccountRule,
} from '@/lib/accountRules';

export default function RulesPage() {
  const { user, isAdmin } = useAuth();
  const [rules, setRules] = useState<AccountRule[]>([]);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [sourceCode, setSourceCode] = useState<Record<string, string>>({});
  const [loadingSource, setLoadingSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);

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
    loadRules();
  }, [loadRules]);

  // Fetch source code for a rule
  const fetchSourceCode = async (ruleId: string) => {
    if (sourceCode[ruleId]) return; // Already loaded

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

  const handleToggleRule = async (ruleId: string, currentEnabled: boolean) => {
    // Optimistic update
    setRules((prev) =>
      prev.map((r) => (r.ruleId === ruleId ? { ...r, enabled: !currentEnabled } : r))
    );

    const success = await toggleRuleEnabled(accountId, ruleId, !currentEnabled);
    if (!success) {
      // Revert on failure
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
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
              {isInitializing ? 'Initializing rules for your account...' : 'Loading...'}
            </div>
          ) : (
            rules.map((rule) => {
              const isExpanded = expandedRule === rule.ruleId;
              const source = sourceCode[rule.ruleId];
              const isLoadingThisSource = loadingSource === rule.ruleId;

              return (
                <div
                  key={rule.id}
                  className={`border rounded-lg overflow-hidden ${
                    rule.enabled ? 'border-green-200 bg-white' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 flex-1">
                      {/* Toggle */}
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

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
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
                        </div>
                        {rule.description && (
                          <p className="text-sm text-gray-500 mt-0.5">{rule.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            Target fields: {rule.targetFields.join(', ')}
                          </span>
                          <span className="text-xs text-gray-400">
                            Order: {rule.displayOrder}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleExpandRule(rule.ruleId)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                    >
                      {isExpanded ? 'Hide Code' : 'View Code'}
                    </button>
                  </div>

                  {/* Code view */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 bg-gray-900 p-4 overflow-x-auto max-h-[500px] overflow-y-auto">
                      {isLoadingThisSource ? (
                        <div className="text-gray-400 text-sm">Loading source code...</div>
                      ) : (
                        <pre className="text-sm text-green-400 font-mono whitespace-pre">
                          {source || '// Loading...'}
                        </pre>
                      )}
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
