/**
 * Client-safe wrapper for account rules operations.
 * Uses fetch() to API routes instead of direct Supabase access.
 */

export type { AccountRule } from '../accountRules';

interface DbAccountRule {
  id: string;
  account_id: string;
  rule_id: string;
  enabled: boolean;
  name: string;
  description: string | null;
  rule_type: 'transform' | 'validate';
  target_fields: string[];
  config: Record<string, unknown>;
  display_order: number;
  source_code: string | null;
  created_at: string;
  updated_at: string;
}

interface AccountRule {
  id: string;
  accountId: string;
  ruleId: string;
  enabled: boolean;
  name: string;
  description: string | null;
  ruleType: 'transform' | 'validate';
  targetFields: string[];
  config: Record<string, unknown>;
  displayOrder: number;
  sourceCode: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapDbToAccountRule(row: DbAccountRule): AccountRule {
  return {
    id: row.id,
    accountId: row.account_id,
    ruleId: row.rule_id,
    enabled: row.enabled,
    name: row.name,
    description: row.description,
    ruleType: row.rule_type,
    targetFields: row.target_fields || [],
    config: row.config || {},
    displayOrder: row.display_order,
    sourceCode: row.source_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchAccountRules(accountId: string): Promise<AccountRule[]> {
  try {
    const res = await fetch(`/api/account-rules?accountId=${encodeURIComponent(accountId)}`);
    const json = await res.json();
    if (json.error) {
      console.error('[accountRules] API error:', json.error);
      return [];
    }
    return (json.data || []).map(mapDbToAccountRule);
  } catch (err) {
    console.error('[accountRules] Fetch error:', err);
    return [];
  }
}

export async function fetchEnabledRules(accountId: string): Promise<AccountRule[]> {
  try {
    const res = await fetch(`/api/account-rules?accountId=${encodeURIComponent(accountId)}&enabledOnly=true`);
    const json = await res.json();
    if (json.error) return [];
    return (json.data || []).map(mapDbToAccountRule);
  } catch (err) {
    console.error('[accountRules] Fetch error:', err);
    return [];
  }
}

export async function toggleRuleEnabled(accountId: string, ruleId: string, enabled: boolean): Promise<boolean> {
  try {
    const res = await fetch('/api/account-rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, ruleId, enabled }),
    });
    const json = await res.json();
    return json.success || false;
  } catch (err) {
    console.error('[accountRules] Toggle error:', err);
    return false;
  }
}

export async function updateRuleConfig(
  accountId: string,
  ruleId: string,
  updates: Partial<Pick<AccountRule, 'name' | 'description' | 'targetFields' | 'config' | 'displayOrder' | 'sourceCode'>>
): Promise<boolean> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.targetFields !== undefined) dbUpdates.target_fields = updates.targetFields;
    if (updates.config !== undefined) dbUpdates.config = updates.config;
    if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
    if (updates.sourceCode !== undefined) dbUpdates.source_code = updates.sourceCode;

    const res = await fetch('/api/account-rules', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, ruleId, ...dbUpdates }),
    });
    const json = await res.json();
    return json.success || false;
  } catch (err) {
    console.error('[accountRules] Update error:', err);
    return false;
  }
}

export async function deleteAccountRule(accountId: string, ruleId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/account-rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId, ruleId }),
    });
    const json = await res.json();
    return json.success || false;
  } catch (err) {
    console.error('[accountRules] Delete error:', err);
    return false;
  }
}

export async function createAccountRule(
  accountId: string,
  rule: {
    ruleId: string;
    name: string;
    description?: string;
    ruleType: 'transform' | 'validate';
    targetFields: string[];
    config?: Record<string, unknown>;
    displayOrder?: number;
    enabled?: boolean;
    sourceCode?: string;
  }
): Promise<AccountRule | null> {
  try {
    const res = await fetch('/api/account-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        rule_id: rule.ruleId,
        name: rule.name,
        description: rule.description || null,
        rule_type: rule.ruleType,
        target_fields: rule.targetFields,
        config: rule.config || {},
        display_order: rule.displayOrder ?? 100,
        enabled: rule.enabled ?? true,
        source_code: rule.sourceCode || null,
      }),
    });
    const json = await res.json();
    if (json.error) return null;
    return mapDbToAccountRule(json.data);
  } catch (err) {
    console.error('[accountRules] Create error:', err);
    return null;
  }
}

export async function getEnabledRuleIds(accountId: string): Promise<string[]> {
  const rules = await fetchEnabledRules(accountId);
  return rules.map((r) => r.ruleId);
}

export async function initializeAccountRules(accountId: string): Promise<boolean> {
  try {
    const res = await fetch('/api/account-rules/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId }),
    });
    const json = await res.json();
    return json.success || false;
  } catch (err) {
    console.error('[accountRules] Initialize error:', err);
    return false;
  }
}
