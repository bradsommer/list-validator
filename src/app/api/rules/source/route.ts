import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getServerSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// Map built-in rule IDs to their source file names
const RULE_FILES: Record<string, string> = {
  'mojibake-cleanup': 'mojibake-cleanup.ts',
  'state-normalization': 'state-normalization.ts',
  'whitespace-validation': 'whitespace-validation.ts',
  'new-business-validation': 'new-business-validation.ts',
  'role-normalization': 'role-normalization.ts',
  'program-type-normalization': 'program-type-normalization.ts',
  'solution-normalization': 'solution-normalization.ts',
  'email-validation': 'email-validation.ts',
  'phone-normalization': 'phone-normalization.ts',
  'date-normalization': 'date-normalization.ts',
  'name-capitalization': 'name-capitalization.ts',
  'company-normalization': 'company-normalization.ts',
  'duplicate-detection': 'duplicate-detection.ts',
};

/**
 * GET /api/rules/source?id=rule-id&accountId=account-id
 * Returns source code for a rule. Checks DB first, falls back to file for built-in rules.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ruleId = searchParams.get('id');
  const accountId = searchParams.get('accountId');

  if (!ruleId) {
    return NextResponse.json({ error: 'Missing rule ID' }, { status: 400 });
  }

  // Try DB first (if accountId provided)
  if (accountId) {
    try {
      const { data } = await getServerSupabase()
        .from('account_rules')
        .select('source_code')
        .eq('account_id', accountId)
        .eq('rule_id', ruleId)
        .single();

      if (data?.source_code) {
        return NextResponse.json({ ruleId, source: data.source_code });
      }
    } catch {
      // Fall through to file-based lookup
    }
  }

  // Fall back to file for built-in rules
  const fileName = RULE_FILES[ruleId];
  if (!fileName) {
    return NextResponse.json({ ruleId, source: '' });
  }

  try {
    const scriptsDir = path.join(process.cwd(), 'src', 'lib', 'scripts');
    const filePath = path.join(scriptsDir, fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ ruleId, source: '' });
    }

    const source = fs.readFileSync(filePath, 'utf-8');
    return NextResponse.json({ ruleId, fileName, source });
  } catch (error) {
    console.error('[rules/source] Error reading source file:', error);
    return NextResponse.json({ error: 'Failed to read source file' }, { status: 500 });
  }
}

/**
 * PUT /api/rules/source
 * Saves source code to the database (account_rules.source_code column).
 * Body: { id: string, source: string, accountId: string }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id: ruleId, source, accountId } = body;

    if (!ruleId || typeof source !== 'string') {
      return NextResponse.json({ error: 'Missing rule ID or source' }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Missing account ID' }, { status: 400 });
    }

    // Save to database
    const { error } = await getServerSupabase()
      .from('account_rules')
      .update({ source_code: source })
      .eq('account_id', accountId)
      .eq('rule_id', ruleId);

    if (error) {
      console.error('[rules/source] DB save error:', error);
      return NextResponse.json({ error: 'Failed to save source code' }, { status: 500 });
    }

    return NextResponse.json({ ruleId, success: true });
  } catch (error) {
    console.error('[rules/source] Error saving source code:', error);
    return NextResponse.json({ error: 'Failed to save source code' }, { status: 500 });
  }
}

/**
 * POST /api/rules/source
 * Backfill: copies built-in script file contents into the source_code column
 * for all existing account_rules rows that have NULL source_code.
 * Safe to run multiple times — only touches rows with NULL source_code.
 * Uses service role client to bypass RLS policies.
 */
export async function POST() {
  const adminClient = getServerSupabase();
  const scriptsDir = path.join(process.cwd(), 'src', 'lib', 'scripts');
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  // First check total rows in account_rules for diagnostics
  const { count: totalRows } = await adminClient
    .from('account_rules')
    .select('*', { count: 'exact', head: true });

  // Fetch all rules with NULL source_code that have a built-in file
  const { data: rules, error: fetchError } = await adminClient
    .from('account_rules')
    .select('id, rule_id, account_id')
    .is('source_code', null);

  if (fetchError) {
    console.error('[rules/source] Backfill fetch error:', fetchError);
    return NextResponse.json({
      error: 'Failed to fetch rules',
      details: fetchError.message,
      hint: fetchError.hint,
      totalRowsInTable: totalRows,
    }, { status: 500 });
  }

  for (const rule of rules || []) {
    const fileName = RULE_FILES[rule.rule_id];
    if (!fileName) {
      skipped++;
      continue;
    }

    const filePath = path.join(scriptsDir, fileName);
    if (!fs.existsSync(filePath)) {
      errors.push(`${rule.rule_id}: file not found at ${filePath}`);
      skipped++;
      continue;
    }

    try {
      const source = fs.readFileSync(filePath, 'utf-8');
      const { error: updateError } = await adminClient
        .from('account_rules')
        .update({ source_code: source })
        .eq('id', rule.id);

      if (updateError) {
        errors.push(`${rule.rule_id}: ${updateError.message}`);
      } else {
        updated++;
      }
    } catch (err) {
      errors.push(`${rule.rule_id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return NextResponse.json({
    success: true,
    updated,
    skipped,
    errors: errors.length > 0 ? errors : undefined,
    totalRowsInTable: totalRows ?? 0,
    rowsWithNullSource: (rules || []).length,
  });
}
