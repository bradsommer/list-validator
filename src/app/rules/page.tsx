'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchAccountRules,
  toggleRuleEnabled,
  initializeAccountRules,
  type AccountRule,
} from '@/lib/accountRules';
import type { HubSpotObjectType } from '@/types';

function getObjectTypes(rule: AccountRule): HubSpotObjectType[] {
  return (rule.config?.objectTypes as HubSpotObjectType[]) || [];
}

export default function RulesPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [rules, setRules] = useState<AccountRule[]>([]);
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
    // Wait for auth to finish loading before fetching rules,
    // otherwise accountId defaults to 'default' and shows empty state
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

        <div className="text-sm text-gray-500">
          {enabledCount} of {rules.length} rules enabled
        </div>

        <div className="space-y-3">
          {/* Column header with Enable/Disable All */}
          {!isLoading && rules.length > 0 && (
            <div className="flex items-center px-4 py-1 text-xs font-medium uppercase tracking-wider">
              <div className="shrink-0 mr-3 text-gray-500">Enabled</div>
              <div className="flex-1"></div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  onClick={enableAll}
                  className="px-2 py-0.5 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 normal-case tracking-normal"
                >
                  Enable All
                </button>
                <button
                  onClick={disableAll}
                  className="px-2 py-0.5 text-xs font-medium bg-gray-50 text-gray-700 rounded hover:bg-gray-100 normal-case tracking-normal"
                >
                  Disable All
                </button>
              </div>
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-2" />
              {isInitializing ? 'Initializing rules for your account...' : 'Loading...'}
            </div>
          ) : (
            rules.map((rule) => {
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
                          <Link href={`/rules/${rule.ruleId}`} className="font-medium text-gray-900 hover:text-primary-600">{rule.name}</Link>
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
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <Link
                        href={`/rules/${rule.ruleId}`}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
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
