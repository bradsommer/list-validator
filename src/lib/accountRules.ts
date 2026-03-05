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
 * Full set of default rules matching the SQL migration seed.
 * Embedded in code so initialization works even if DB seeds haven't been applied.
 */
const DEFAULT_RULES = [
  {
    rule_id: 'state-normalization',
    name: 'State Normalization',
    description: 'Converts state abbreviations (AL, CA, NY) to full names (Alabama, California, New York). Also fixes common misspellings and case variations.',
    rule_type: 'transform' as const,
    target_fields: ['state'],
    config: {},
    display_order: 10,
  },
  {
    rule_id: 'whitespace-validation',
    name: 'Whitespace Cleanup',
    description: 'Removes leading/trailing whitespace and normalizes multiple spaces to single spaces in text fields.',
    rule_type: 'transform' as const,
    target_fields: ['*'],
    config: {},
    display_order: 12,
  },
  {
    rule_id: 'new-business-validation',
    name: 'New Business Flag',
    description: 'Validates the New Business field contains only "Yes" or "No" values.',
    rule_type: 'validate' as const,
    target_fields: ['new_business'],
    config: {},
    display_order: 13,
  },
  {
    rule_id: 'role-normalization',
    name: 'Role Normalization',
    description: 'Validates role values against an allowed list (Admin, Educator, Student, etc.). Non-matching values are set to "Other".',
    rule_type: 'transform' as const,
    target_fields: ['role'],
    config: { validValues: ['Admin', 'Administrator', 'Ascend Employee', 'ATI Champion', 'ATI Employee', 'Champion Nominee', 'Coordinator', 'Dean', 'Director', 'Educator', 'Instructor', 'Other', 'Proctor', 'Student', 'TEAS Student', 'LMS Admin'] },
    display_order: 15,
  },
  {
    rule_id: 'program-type-normalization',
    name: 'Program Type Normalization',
    description: 'Normalizes program type values to a standard list (ADN, ASN, BSN, LPN, etc.). Non-matching values are set to "Other".',
    rule_type: 'transform' as const,
    target_fields: ['program_type'],
    config: { validValues: ['ADN', 'ASN', 'BSN', 'LPN', 'LVN', 'MSN', 'PN', 'RN', 'Other'] },
    display_order: 16,
  },
  {
    rule_id: 'solution-normalization',
    name: 'Solution Normalization',
    description: 'Validates solution values against an allowed list (OPTIMAL, SUPREME, STO, CARP, BASIC, MID-MARKET, COMPLETE). Non-matching values are set to "Other".',
    rule_type: 'transform' as const,
    target_fields: ['solution'],
    config: { validValues: ['OPTIMAL', 'SUPREME', 'STO', 'CARP', 'BASIC', 'MID-MARKET', 'COMPLETE'] },
    display_order: 17,
  },
  {
    rule_id: 'email-validation',
    name: 'Email Validation',
    description: 'Validates email format and checks for common issues like missing @ symbol, invalid domains, or typos in common domains (gmail, yahoo, etc.).',
    rule_type: 'validate' as const,
    target_fields: ['email'],
    config: {},
    display_order: 20,
  },
  {
    rule_id: 'phone-normalization',
    name: 'Phone Normalization',
    description: 'Formats phone numbers to a consistent format and validates they contain valid digits.',
    rule_type: 'transform' as const,
    target_fields: ['phone'],
    config: {},
    display_order: 30,
  },
  {
    rule_id: 'date-normalization',
    name: 'Date Normalization',
    description: 'Parses various date formats and normalizes them to ISO format (YYYY-MM-DD). Handles formats like MM/DD/YYYY, DD-MM-YYYY, etc.',
    rule_type: 'transform' as const,
    target_fields: ['date'],
    config: {},
    display_order: 35,
  },
  {
    rule_id: 'name-capitalization',
    name: 'Name Capitalization',
    description: 'Capitalizes first and last names properly, handling edge cases like McDonald, O\'Brien, etc.',
    rule_type: 'transform' as const,
    target_fields: ['firstname', 'lastname'],
    config: {},
    display_order: 50,
  },
  {
    rule_id: 'company-normalization',
    name: 'Company Normalization',
    description: 'Standardizes company name formatting and common abbreviations (Inc., LLC, Corp., etc.).',
    rule_type: 'transform' as const,
    target_fields: ['company'],
    config: {},
    display_order: 60,
  },
  {
    rule_id: 'duplicate-detection',
    name: 'Duplicate Detection',
    description: 'Identifies potential duplicate records based on email address or name + company combination.',
    rule_type: 'validate' as const,
    target_fields: ['email', 'firstname', 'lastname', 'company'],
    config: {},
    display_order: 100,
  },
];

/**
 * Initialize a new account with rules.
 * If sourceAccountId is provided, copies from that account.
 * Otherwise seeds the full default rule set from TypeScript constants.
 */
export async function initializeAccountRules(
  accountId: string,
  sourceAccountId?: string,
): Promise<boolean> {
  try {
    // If a source account is specified, try to copy from it
    if (sourceAccountId) {
      const { data: sourceRules } = await supabase
        .from('account_rules')
        .select('*')
        .eq('account_id', sourceAccountId);

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
        if (!error) return true;
        console.error('[accountRules] Failed to copy rules from', sourceAccountId, error);
      }
    }

    // Seed from TypeScript defaults (all enabled by default)
    const newRules = DEFAULT_RULES.map((rule) => ({
      account_id: accountId,
      rule_id: rule.rule_id,
      enabled: true,
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
      console.error('[accountRules] Failed to insert default rules:', insertError);
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
