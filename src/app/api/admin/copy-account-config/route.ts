import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/admin/copy-account-config
 *
 * Copies rules and import questions from a source account to a target account.
 * Requires company_admin or admin role.
 *
 * Body: { sourceAccountId: string, targetAccountId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('session_token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user || (user.role !== 'company_admin' && user.role !== 'admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { sourceAccountId, targetAccountId } = await request.json();
    if (!sourceAccountId || !targetAccountId) {
      return NextResponse.json(
        { success: false, error: 'sourceAccountId and targetAccountId are required' },
        { status: 400 }
      );
    }

    // --- Copy Rules ---
    const { data: sourceRules, error: rulesError } = await supabase
      .from('account_rules')
      .select('*')
      .eq('account_id', sourceAccountId);

    if (rulesError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch source rules' }, { status: 500 });
    }

    // Delete existing rules on target first
    await supabase.from('account_rules').delete().eq('account_id', targetAccountId);

    let rulesCopied = 0;
    if (sourceRules && sourceRules.length > 0) {
      const newRules = sourceRules.map((r) => ({
        account_id: targetAccountId,
        rule_id: r.rule_id,
        enabled: r.enabled,
        name: r.name,
        description: r.description,
        rule_type: r.rule_type,
        target_fields: r.target_fields,
        config: r.config,
        display_order: r.display_order,
      }));

      const { error: insertError } = await supabase.from('account_rules').insert(newRules);
      if (insertError) {
        return NextResponse.json({ success: false, error: 'Failed to copy rules: ' + insertError.message }, { status: 500 });
      }
      rulesCopied = newRules.length;
    }

    // --- Copy Import Questions ---
    const { data: sourceQuestions, error: questionsError } = await supabase
      .from('import_questions')
      .select('*')
      .eq('account_id', sourceAccountId);

    if (questionsError) {
      return NextResponse.json({ success: false, error: 'Failed to fetch source questions' }, { status: 500 });
    }

    // Delete existing questions on target first
    await supabase.from('import_questions').delete().eq('account_id', targetAccountId);

    let questionsCopied = 0;
    if (sourceQuestions && sourceQuestions.length > 0) {
      const newQuestions = sourceQuestions.map((q) => ({
        account_id: targetAccountId,
        question_text: q.question_text,
        column_header: q.column_header,
        question_type: q.question_type,
        options: q.options,
        option_values: q.option_values || {},
        default_value: q.default_value,
        is_required: q.is_required,
        display_order: q.display_order,
        enabled: q.enabled,
      }));

      const { error: insertError } = await supabase.from('import_questions').insert(newQuestions);
      if (insertError) {
        return NextResponse.json({ success: false, error: 'Failed to copy questions: ' + insertError.message }, { status: 500 });
      }
      questionsCopied = newQuestions.length;
    }

    return NextResponse.json({
      success: true,
      rulesCopied,
      questionsCopied,
    });
  } catch (err) {
    console.error('[copy-account-config] Error:', err);
    return NextResponse.json({ success: false, error: 'An error occurred' }, { status: 500 });
  }
}
