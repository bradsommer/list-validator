/**
 * Account Rules — Supabase-backed store for per-account rule configuration.
 * Rules are defined in TypeScript but enabled/configured per-account in the database.
 */

import { supabase } from './supabase';
import { getDefaultRuleCode, getDefaultRuleMetadata } from './defaultRuleCode';

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
  updates: Partial<Pick<AccountRule, 'description' | 'config' | 'displayOrder'>>
): Promise<boolean> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.description !== undefined) dbUpdates.description = updates.description;
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
 * Copy default rules to a new account
 * Includes built-in code from defaultRuleCode.ts if source rules don't have code
 */
export async function initializeAccountRules(
  accountId: string,
  sourceAccountId: string = 'default'
): Promise<boolean> {
  try {
    // Fetch source account's rules
    const { data: sourceRules, error: fetchError } = await supabase
      .from('account_rules')
      .select('*')
      .eq('account_id', sourceAccountId);

    if (fetchError || !sourceRules?.length) {
      console.error('[accountRules] Failed to fetch source rules:', fetchError);
      return false;
    }

    // Insert copies for the new account, with built-in code if source doesn't have it
    const newRules = sourceRules.map((rule: DbAccountRule) => {
      const sourceHasCode = !!(rule.config as Record<string, unknown>)?.code;
      let config = rule.config;

      // If source doesn't have code, use built-in default
      if (!sourceHasCode) {
        const builtInCode = getDefaultRuleCode(rule.rule_id);
        if (builtInCode) {
          config = { ...(rule.config as Record<string, unknown>), code: builtInCode };
        }
      }

      return {
        account_id: accountId,
        rule_id: rule.rule_id,
        enabled: rule.enabled,
        name: rule.name,
        description: rule.description,
        rule_type: rule.rule_type,
        target_fields: rule.target_fields,
        config,
        display_order: rule.display_order,
      };
    });

    const { error: insertError } = await supabase
      .from('account_rules')
      .insert(newRules);

    if (insertError) {
      console.error('[accountRules] Failed to insert rules:', insertError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[accountRules] Initialize error:', err);
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

/**
 * Create a new rule for an account
 */
export interface CreateRuleInput {
  accountId: string;
  ruleId: string;
  name: string;
  description?: string;
  ruleType: 'transform' | 'validate';
  targetFields: string[];
  enabled?: boolean;
  displayOrder?: number;
  config?: Record<string, unknown>;
}

export async function createRule(input: CreateRuleInput): Promise<AccountRule | null> {
  try {
    const { data, error } = await supabase
      .from('account_rules')
      .insert({
        account_id: input.accountId,
        rule_id: input.ruleId,
        name: input.name,
        description: input.description || null,
        rule_type: input.ruleType,
        target_fields: input.targetFields,
        enabled: input.enabled ?? true,
        display_order: input.displayOrder ?? 0,
        config: input.config || {},
      })
      .select()
      .single();

    if (error) {
      console.error('[accountRules] Create error:', error);
      return null;
    }

    return mapDbToAccountRule(data);
  } catch (err) {
    console.error('[accountRules] Create error:', err);
    return null;
  }
}

/**
 * Update a rule
 */
export interface UpdateRuleInput {
  name?: string;
  description?: string;
  ruleType?: 'transform' | 'validate';
  targetFields?: string[];
  enabled?: boolean;
  displayOrder?: number;
  config?: Record<string, unknown>;
}

export async function updateRule(
  accountId: string,
  ruleId: string,
  updates: UpdateRuleInput
): Promise<boolean> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.ruleType !== undefined) dbUpdates.rule_type = updates.ruleType;
    if (updates.targetFields !== undefined) dbUpdates.target_fields = updates.targetFields;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;
    if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
    if (updates.config !== undefined) dbUpdates.config = updates.config;

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
 * Delete a rule
 */
export async function deleteRule(accountId: string, ruleId: string): Promise<boolean> {
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
 * Sync rules from the default account - copies missing code to existing rules
 * This is useful when rules exist but are missing their custom code.
 *
 * Uses built-in default code from defaultRuleCode.ts when database rules don't have code.
 */
export async function syncRulesFromDefault(accountId: string): Promise<{ synced: number; errors: string[] }> {
  const errors: string[] = [];
  let synced = 0;

  try {
    // Fetch default rules from database (for rule metadata)
    const { data: defaultRules, error: defaultError } = await supabase
      .from('account_rules')
      .select('*')
      .eq('account_id', 'default');

    if (defaultError) {
      console.error('[syncRulesFromDefault] Error fetching default rules:', defaultError);
      return { synced: 0, errors: ['Failed to fetch default rules from database'] };
    }

    // Fetch current account rules
    const { data: accountRules, error: accountError } = await supabase
      .from('account_rules')
      .select('*')
      .eq('account_id', accountId);

    if (accountError) {
      return { synced: 0, errors: ['Failed to fetch account rules'] };
    }

    // Build a map of default rules by rule_id
    const defaultRuleMap = new Map<string, DbAccountRule>();
    for (const rule of defaultRules || []) {
      defaultRuleMap.set(rule.rule_id, rule);
    }

    // Update account rules that are missing code OR have incorrect metadata
    for (const accountRule of accountRules || []) {
      const currentCode = (accountRule.config as Record<string, unknown>)?.code as string | undefined;
      const accountHasCode = !!currentCode;
      const builtInCode = getDefaultRuleCode(accountRule.rule_id);
      const builtInMetadata = getDefaultRuleMetadata(accountRule.rule_id);

      // Check if we need to update this rule
      const needsCodeUpdate = !accountHasCode && builtInCode;
      const needsMetadataUpdate = builtInMetadata && (
        accountRule.rule_type !== builtInMetadata.ruleType ||
        JSON.stringify(accountRule.target_fields) !== JSON.stringify(builtInMetadata.targetFields)
      );

      // Check if existing code has wrong function type (transform vs validate mismatch)
      // This fixes cases where rule_type was updated but code still has old function
      let codeTypeMismatch = false;
      if (accountHasCode && builtInMetadata && builtInCode) {
        const hasTransformFn = currentCode!.includes('function transform');
        const hasValidateFn = currentCode!.includes('function validate');
        const expectedTransform = builtInMetadata.ruleType === 'transform';

        if (expectedTransform && !hasTransformFn && hasValidateFn) {
          codeTypeMismatch = true;
        } else if (!expectedTransform && !hasValidateFn && hasTransformFn) {
          codeTypeMismatch = true;
        }
      }

      // When metadata changes (especially rule_type), also update code to ensure consistency
      const needsCodeRefresh = (needsMetadataUpdate || codeTypeMismatch) && builtInCode;

      if (needsCodeUpdate || needsMetadataUpdate || codeTypeMismatch) {
        // Build update object
        const updateData: Record<string, unknown> = {};

        // Update code if missing OR if metadata is changing (to ensure code matches new type)
        if ((needsCodeUpdate || needsCodeRefresh) && builtInCode) {
          updateData.config = {
            ...(accountRule.config as Record<string, unknown>),
            code: builtInCode,
          };
        }

        if (builtInMetadata) {
          updateData.rule_type = builtInMetadata.ruleType;
          updateData.target_fields = builtInMetadata.targetFields;
        }

        const { error: updateError } = await supabase
          .from('account_rules')
          .update(updateData)
          .eq('account_id', accountId)
          .eq('rule_id', accountRule.rule_id);

        if (updateError) {
          errors.push(`Failed to sync ${accountRule.rule_id}: ${updateError.message}`);
        } else {
          synced++;
          const updates = [];
          if (needsCodeUpdate) updates.push('code (missing)');
          if (codeTypeMismatch) updates.push('code (type mismatch)');
          if (needsMetadataUpdate) updates.push('metadata');
          console.log(`[syncRulesFromDefault] Synced ${updates.join(', ')} for ${accountRule.rule_id}`);
        }
      }
    }

    // Also add any missing rules from default
    const accountRuleIds = new Set((accountRules || []).map(r => r.rule_id));
    const missingRules = (defaultRules || []).filter(r => !accountRuleIds.has(r.rule_id));

    if (missingRules.length > 0) {
      const newRules = missingRules.map(rule => {
        // Get built-in code and metadata for the rule
        const builtInCode = getDefaultRuleCode(rule.rule_id);
        const builtInMetadata = getDefaultRuleMetadata(rule.rule_id);
        const config = builtInCode
          ? { ...(rule.config as Record<string, unknown>), code: builtInCode }
          : rule.config;

        return {
          account_id: accountId,
          rule_id: rule.rule_id,
          enabled: rule.enabled,
          name: rule.name,
          description: rule.description,
          rule_type: builtInMetadata?.ruleType || rule.rule_type,
          target_fields: builtInMetadata?.targetFields || rule.target_fields,
          config,
          display_order: rule.display_order,
        };
      });

      const { error: insertError } = await supabase
        .from('account_rules')
        .insert(newRules);

      if (insertError) {
        errors.push(`Failed to add missing rules: ${insertError.message}`);
      } else {
        synced += missingRules.length;
        console.log(`[syncRulesFromDefault] Added ${missingRules.length} missing rules with built-in code`);
      }
    }

    return { synced, errors };
  } catch (err) {
    console.error('[syncRulesFromDefault] Error:', err);
    return { synced: 0, errors: ['Unexpected error during sync'] };
  }
}
