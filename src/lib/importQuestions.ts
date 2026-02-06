/**
 * Import Questions — Supabase-backed store for per-account import questions.
 * Questions are shown during list import to set column values for all rows.
 */

import { supabase } from './supabase';
import type { ObjectType } from './objectTypes';
import { ALL_OBJECT_TYPES } from './objectTypes';

/**
 * Safely parse object_types from database.
 * Handles both proper arrays and Postgres string representations like "{contacts,companies}".
 */
function parseObjectTypes(value: unknown): ObjectType[] {
  // Default: applies to all types
  if (value === null || value === undefined) {
    return [...ALL_OBJECT_TYPES];
  }

  // Already a proper array
  if (Array.isArray(value)) {
    return value as ObjectType[];
  }

  // Handle Postgres array string format: {contacts,companies,deals}
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim();
      if (inner === '') {
        return []; // Empty array explicitly means "none"
      }
      return inner.split(',').map(s => s.trim() as ObjectType);
    }
    // Single value without braces
    if (trimmed && ['contacts', 'companies', 'deals'].includes(trimmed)) {
      return [trimmed as ObjectType];
    }
  }

  console.warn('[parseObjectTypes] Unexpected value, defaulting to all types:', value);
  return [...ALL_OBJECT_TYPES];
}

/**
 * Question input types:
 * - text: Free form text input
 * - dropdown: Single selection dropdown
 * - checkbox: Single checkbox (yes/no style)
 * - radio: Radio button group (single selection)
 * - multiselect: Multiple selection checkboxes
 */
export type QuestionType = 'text' | 'dropdown' | 'checkbox' | 'radio' | 'multiselect';

export interface ImportQuestion {
  id: string;
  accountId: string;
  questionText: string;
  columnHeader: string;
  questionType: QuestionType;
  options: string[];
  optionValues: Record<string, string>;
  objectTypes: ObjectType[];
  defaultValue: string | null;
  isRequired: boolean;
  displayOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DbImportQuestion {
  id: string;
  account_id: string;
  question_text: string;
  column_header: string;
  question_type: QuestionType;
  options: string[];
  option_values: Record<string, string>;
  object_types: ObjectType[];
  default_value: string | null;
  is_required: boolean;
  display_order: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

function mapDbToImportQuestion(row: DbImportQuestion): ImportQuestion {
  return {
    id: row.id,
    accountId: row.account_id,
    questionText: row.question_text,
    columnHeader: row.column_header,
    questionType: row.question_type,
    options: row.options || [],
    optionValues: row.option_values || {},
    objectTypes: parseObjectTypes(row.object_types),
    defaultValue: row.default_value,
    isRequired: row.is_required,
    displayOrder: row.display_order,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Fetch all import questions for an account, ordered by display_order
 */
export async function fetchImportQuestions(accountId: string): Promise<ImportQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('import_questions')
      .select('*')
      .eq('account_id', accountId)
      .order('display_order');

    if (error) {
      console.error('[importQuestions] Supabase fetch error:', error);
      return [];
    }

    return (data || []).map(mapDbToImportQuestion);
  } catch (err) {
    console.error('[importQuestions] Fetch error:', err);
    return [];
  }
}

/**
 * Fetch only enabled import questions for an account
 */
export async function fetchEnabledImportQuestions(accountId: string): Promise<ImportQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('import_questions')
      .select('*')
      .eq('account_id', accountId)
      .eq('enabled', true)
      .order('display_order');

    if (error) {
      console.error('[importQuestions] Supabase fetch error:', error);
      return [];
    }

    return (data || []).map(mapDbToImportQuestion);
  } catch (err) {
    console.error('[importQuestions] Fetch error:', err);
    return [];
  }
}

/**
 * Create a new import question
 */
export async function createImportQuestion(
  accountId: string,
  question: {
    questionText: string;
    columnHeader: string;
    questionType: QuestionType;
    options?: string[];
    optionValues?: Record<string, string>;
    objectTypes?: ObjectType[];
    defaultValue?: string | null;
    isRequired?: boolean;
    displayOrder?: number;
    enabled?: boolean;
  }
): Promise<ImportQuestion | null> {
  try {
    const { data, error } = await supabase
      .from('import_questions')
      .insert({
        account_id: accountId,
        question_text: question.questionText,
        column_header: question.columnHeader,
        question_type: question.questionType,
        options: question.options || [],
        option_values: question.optionValues || {},
        object_types: question.objectTypes || ['contacts', 'companies', 'deals'],
        default_value: question.defaultValue ?? null,
        is_required: question.isRequired ?? false,
        display_order: question.displayOrder ?? 100,
        enabled: question.enabled ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('[importQuestions] Create error:', error);
      return null;
    }

    return mapDbToImportQuestion(data);
  } catch (err) {
    console.error('[importQuestions] Create error:', err);
    return null;
  }
}

/**
 * Update an existing import question
 */
export async function updateImportQuestion(
  questionId: string,
  updates: Partial<{
    questionText: string;
    columnHeader: string;
    questionType: QuestionType;
    options: string[];
    optionValues: Record<string, string>;
    objectTypes: ObjectType[];
    defaultValue: string | null;
    isRequired: boolean;
    displayOrder: number;
    enabled: boolean;
  }>
): Promise<boolean> {
  try {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.questionText !== undefined) dbUpdates.question_text = updates.questionText;
    if (updates.columnHeader !== undefined) dbUpdates.column_header = updates.columnHeader;
    if (updates.questionType !== undefined) dbUpdates.question_type = updates.questionType;
    if (updates.options !== undefined) dbUpdates.options = updates.options;
    if (updates.optionValues !== undefined) dbUpdates.option_values = updates.optionValues;
    // Handle objectTypes explicitly - ensure array is spread to avoid reference issues
    // and handle the case where it's passed as a value that needs to be stored
    if (updates.objectTypes !== undefined) {
      // Ensure we're saving an array, even if empty
      dbUpdates.object_types = Array.isArray(updates.objectTypes)
        ? [...updates.objectTypes]
        : updates.objectTypes;
    }
    if (updates.defaultValue !== undefined) dbUpdates.default_value = updates.defaultValue;
    if (updates.isRequired !== undefined) dbUpdates.is_required = updates.isRequired;
    if (updates.displayOrder !== undefined) dbUpdates.display_order = updates.displayOrder;
    if (updates.enabled !== undefined) dbUpdates.enabled = updates.enabled;

    console.log('[importQuestions] Updating question:', questionId, 'with object_types:', dbUpdates.object_types);

    const { data, error } = await supabase
      .from('import_questions')
      .update(dbUpdates)
      .eq('id', questionId)
      .select('id, object_types')
      .single();

    if (error) {
      console.error('[importQuestions] Update error:', error);
      return false;
    }

    console.log('[importQuestions] Update result - object_types saved as:', data?.object_types);

    return true;
  } catch (err) {
    console.error('[importQuestions] Update error:', err);
    return false;
  }
}

/**
 * Delete an import question
 */
export async function deleteImportQuestion(questionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('import_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      console.error('[importQuestions] Delete error:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[importQuestions] Delete error:', err);
    return false;
  }
}

/**
 * Toggle a question's enabled status
 */
export async function toggleQuestionEnabled(
  questionId: string,
  enabled: boolean
): Promise<boolean> {
  return updateImportQuestion(questionId, { enabled });
}

/**
 * Copy default questions to a new account
 */
export async function initializeAccountQuestions(
  accountId: string,
  sourceAccountId: string = 'default'
): Promise<boolean> {
  try {
    // Fetch source account's questions
    const { data: sourceQuestions, error: fetchError } = await supabase
      .from('import_questions')
      .select('*')
      .eq('account_id', sourceAccountId);

    if (fetchError || !sourceQuestions?.length) {
      console.error('[importQuestions] Failed to fetch source questions:', fetchError);
      return false;
    }

    // Insert copies for the new account
    const newQuestions = sourceQuestions.map((q: DbImportQuestion) => ({
      account_id: accountId,
      question_text: q.question_text,
      column_header: q.column_header,
      question_type: q.question_type,
      options: q.options,
      option_values: q.option_values || {},
      object_types: parseObjectTypes(q.object_types),
      default_value: q.default_value,
      is_required: q.is_required,
      display_order: q.display_order,
      enabled: q.enabled,
    }));

    const { error: insertError } = await supabase
      .from('import_questions')
      .insert(newQuestions);

    if (insertError) {
      console.error('[importQuestions] Failed to insert questions:', insertError);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[importQuestions] Initialize error:', err);
    return false;
  }
}
