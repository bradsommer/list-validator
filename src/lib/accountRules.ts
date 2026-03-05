/**
 * Account Rules — Supabase-backed store for per-account rule configuration.
 * Rules are defined in TypeScript but enabled/configured per-account in the database.
 */

import { supabase } from './supabase';

export interface AccountRule {
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
  createdAt: string;
  updatedAt: string;
}

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
  created_at: string;
  updated_at: string;
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch all rules for an account, ordered by display_order
 */
export async function fetchAccountRules(accountId: string): Promise<AccountRule[]> {
  try {
    const { data, error } = await supabase
      .from('account_rules')
      .select('*')
      .eq('account_id', accountId)
      .order('display_order');

    if (error) {
      console.error('[accountRules] Supabase fetch error:', error);
      return [];
    }

    return (data || []).map(mapDbToAccountRule);
  } catch (err) {
    console.error('[accountRules] Fetch error:', err);
    return [];
  }
}

/**
 * Fetch only enabled rules for an account
 */
export async function fetchEnabledRules(accountId: string): Promise<AccountRule[]> {
  try {
    const { data, error } = await supabase
      .from('account_rules')
      .select('*')
      .eq('account_id', accountId)
      .eq('enabled', true)
      .order('display_order');

    if (error) {
      console.error('[accountRules] Supabase fetch error:', error);
      return [];
    }

    return (data || []).map(mapDbToAccountRule);
  } catch (err) {
    console.error('[accountRules] Fetch error:', err);
    return [];
  }
}

/**
 * Toggle a rule's enabled status
 */
export async function toggleRuleEnabled(
  accountId: string,
  ruleId: string,
  enabled: boolean
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('account_rules')
      .update({ enabled })
      .eq('account_id', accountId)
      .eq('rule_id', ruleId);

    if (error) {
      console.error('[accountRules] Toggle error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[accountRules] Toggle error:', err);
    return false;
  }
}

/**
 * Update a rule's configuration
 */
export async function updateRuleConfig(
  accountId: string,
  ruleId: string,
  updates: Partial<Pick<AccountRule, 'name' | 'description' | 'targetFields' | 'config' | 'displayOrder'>>
): Promise<boolean> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.targetFields !== undefined) dbUpdates.target_fields = updates.targetFields;
    if (updates.config !== undefined) dbUpdates.config = updates.config;
    if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;

    const { error } = await supabase
      .from('account_rules')
      .update(dbUpdates)
      .eq('account_id', accountId)
      .eq('rule_id', ruleId);

    if (error) {
      console.error('[accountRules] Update error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[accountRules] Update error:', err);
    return false;
  }
}

/**
 * Fallback rules used when no 'default' account exists in the DB.
 */
const FALLBACK_RULES = [
  {
    rule_id: 'state-normalization',
    name: 'State Normalization',
    description: 'Normalize US state names to two-letter abbreviations (e.g. California → CA).',
    rule_type: 'transform' as const,
    target_fields: ['state'],
    config: {},
    display_order: 10,
  },
  {
    rule_id: 'email-validation',
    name: 'Email Validation',
    description: 'Validate email format and flag invalid addresses.',
    rule_type: 'validate' as const,
    target_fields: ['email'],
    config: {},
    display_order: 20,
  },
  {
    rule_id: 'duplicate-detection',
    name: 'Email Duplicate Detection',
    description: 'Flag duplicate rows based on email address.',
    rule_type: 'validate' as const,
    target_fields: ['email'],
    config: {},
    display_order: 100,
  },
];

/**
 * Initialize a new account with rules copied from a source account.
 * Tries sourceAccountId first, then 'default', then falls back to hardcoded defaults.
 */
export async function initializeAccountRules(
  accountId: string,
  sourceAccountId?: string,
): Promise<boolean> {
  try {
    // Try to copy from source account or 'default' seed
    const sourceIds = [sourceAccountId, 'default'].filter(Boolean) as string[];

    for (const srcId of sourceIds) {
      const { data: sourceRules } = await supabase
        .from('account_rules')
        .select('*')
        .eq('account_id', srcId);

      if (sourceRules && sourceRules.length > 0) {
        const newRules = sourceRules.map((r: DbAccountRule) => ({
          account_id: accountId,
          rule_id: r.rule_id,
          enabled: r.enabled,
          name: r.name,
          description: r.description,
          rule_type: r.rule_type,
          target_fields: r.target_fields,
          config: r.config,
          display_order: r.display_order,
        }));

        const { error } = await supabase.from('account_rules').insert(newRules);
        if (error) {
          console.error('[accountRules] Failed to copy rules from', srcId, error);
          continue;
        }
        return true;
      }
    }

    // Fallback to hardcoded defaults
    const newRules = FALLBACK_RULES.map((rule) => ({
      account_id: accountId,
      rule_id: rule.rule_id,
      enabled: false,
      name: rule.name,
      description: rule.description,
      rule_type: rule.rule_type,
      target_fields: rule.target_fields,
      config: rule.config,
      display_order: rule.display_order,
    }));

    const { error: insertError } = await supabase
      .from('account_rules')
      .insert(newRules);

    if (insertError) {
      console.error('[accountRules] Failed to insert fallback rules:', insertError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[accountRules] Initialize error:', err);
    return false;
  }
}

/**
 * Delete a rule from an account
 */
export async function deleteAccountRule(
  accountId: string,
  ruleId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('account_rules')
      .delete()
      .eq('account_id', accountId)
      .eq('rule_id', ruleId);

    if (error) {
      console.error('[accountRules] Delete error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[accountRules] Delete error:', err);
    return false;
  }
}

/**
 * Get the list of enabled rule IDs for an account (for use with validation scripts)
 */
export async function getEnabledRuleIds(accountId: string): Promise<string[]> {
  const rules = await fetchEnabledRules(accountId);
  return rules.map((r) => r.ruleId);
}
