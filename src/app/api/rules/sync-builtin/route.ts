/**
 * API endpoint to sync built-in rules to the default account.
 * This ensures all rules defined in defaultRuleCode.ts exist in the database.
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { DEFAULT_RULE_CODE, DEFAULT_RULE_METADATA } from '@/lib/defaultRuleCode';

// Rule display names and descriptions
const RULE_INFO: Record<string, { name: string; description: string; displayOrder: number }> = {
  'encoding-detection': {
    name: 'Encoding Detection',
    description: 'Detects and fixes mojibake (garbled text from character encoding issues)',
    displayOrder: 5,
  },
  'state-normalization': {
    name: 'State Normalization',
    description: 'Converts US state abbreviations to full names',
    displayOrder: 10,
  },
  'whitespace-validation': {
    name: 'Whitespace Validation',
    description: 'Ensures Whitespace column contains only Yes, No, or blank',
    displayOrder: 12,
  },
  'new-business-validation': {
    name: 'New Business Validation',
    description: 'Ensures New Business column contains only Yes, No, or blank',
    displayOrder: 13,
  },
  'role-normalization': {
    name: 'Role Normalization',
    description: 'Normalizes role values to standard options',
    displayOrder: 15,
  },
  'program-type-normalization': {
    name: 'Program Type Normalization',
    description: 'Normalizes program type values (ADN, BSN, etc.)',
    displayOrder: 16,
  },
  'solution-normalization': {
    name: 'Solution Normalization',
    description: 'Normalizes solution values (OPTIMAL, SUPREME, etc.)',
    displayOrder: 17,
  },
  'email-validation': {
    name: 'Email Validation',
    description: 'Validates email format and detects disposable domains',
    displayOrder: 20,
  },
  'phone-normalization': {
    name: 'Phone Normalization',
    description: 'Formats phone numbers to standard format',
    displayOrder: 30,
  },
  'date-normalization': {
    name: 'Date Normalization',
    description: 'Converts dates to YYYY-MM-DD format',
    displayOrder: 35,
  },
  'name-capitalization': {
    name: 'Name Capitalization',
    description: 'Properly capitalizes names (handles Mc, Mac, O\' prefixes)',
    displayOrder: 50,
  },
  'company-normalization': {
    name: 'Company Normalization',
    description: 'Normalizes company name suffixes (Inc., LLC, etc.)',
    displayOrder: 60,
  },
  'duplicate-detection': {
    name: 'Duplicate Detection',
    description: 'Detects duplicate emails, names, and phone numbers',
    displayOrder: 100,
  },
};

export async function POST() {
  try {
    const accountId = 'default';
    let added = 0;
    let updated = 0;
    const errors: string[] = [];

    // Fetch existing rules for the default account
    const { data: existingRules, error: fetchError } = await supabase
      .from('account_rules')
      .select('rule_id')
      .eq('account_id', accountId);

    if (fetchError) {
      return NextResponse.json(
        { error: 'Failed to fetch existing rules', details: fetchError.message },
        { status: 500 }
      );
    }

    const existingRuleIds = new Set((existingRules || []).map(r => r.rule_id));

    // Add any rules that exist in DEFAULT_RULE_CODE but not in the database
    for (const ruleId of Object.keys(DEFAULT_RULE_CODE)) {
      const metadata = DEFAULT_RULE_METADATA[ruleId];
      const info = RULE_INFO[ruleId];
      const code = DEFAULT_RULE_CODE[ruleId];

      if (!metadata || !info) {
        console.warn(`[sync-builtin] Missing metadata or info for rule: ${ruleId}`);
        continue;
      }

      if (!existingRuleIds.has(ruleId)) {
        // Insert new rule
        const { error: insertError } = await supabase
          .from('account_rules')
          .insert({
            account_id: accountId,
            rule_id: ruleId,
            name: info.name,
            description: info.description,
            rule_type: metadata.ruleType,
            target_fields: metadata.targetFields,
            enabled: true,
            display_order: info.displayOrder,
            config: { code },
          });

        if (insertError) {
          errors.push(`Failed to add ${ruleId}: ${insertError.message}`);
        } else {
          added++;
          console.log(`[sync-builtin] Added rule: ${ruleId}`);
        }
      } else {
        // Update existing rule with latest code and metadata
        const { error: updateError } = await supabase
          .from('account_rules')
          .update({
            rule_type: metadata.ruleType,
            target_fields: metadata.targetFields,
            config: { code },
          })
          .eq('account_id', accountId)
          .eq('rule_id', ruleId);

        if (updateError) {
          errors.push(`Failed to update ${ruleId}: ${updateError.message}`);
        } else {
          updated++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      added,
      updated,
      errors,
      message: `Added ${added} new rules, updated ${updated} existing rules`,
    });
  } catch (err) {
    console.error('[sync-builtin] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return info about what rules would be synced
  const ruleIds = Object.keys(DEFAULT_RULE_CODE);
  return NextResponse.json({
    availableRules: ruleIds,
    count: ruleIds.length,
    message: 'POST to this endpoint to sync built-in rules to the default account',
  });
}
