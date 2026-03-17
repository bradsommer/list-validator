import { NextRequest, NextResponse } from 'next/server';
import {
  fetchImportQuestions,
  createImportQuestion,
  updateImportQuestion,
  deleteImportQuestion,
  initializeAccountQuestions,
  type QuestionType,
} from '@/lib/importQuestions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/import-questions?accountId=xxx
 * Returns all import questions for an account.
 * Auto-initializes from 'default' seed if the account has none.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const accountId = searchParams.get('accountId') || 'default';

  let questions = await fetchImportQuestions(accountId);

  // Auto-initialize if this account has no questions
  if (questions.length === 0) {
    await initializeAccountQuestions(accountId);
    questions = await fetchImportQuestions(accountId);
  }

  return NextResponse.json({ success: true, questions });
}

/**
 * POST /api/import-questions
 * Creates a new import question
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      accountId,
      questionText,
      columnHeader,
      questionType,
      options,
      objectTypes,
      isRequired,
      displayOrder,
      enabled,
    } = body;

    if (!accountId || !questionText || !columnHeader || !questionType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const question = await createImportQuestion(accountId, {
      questionText,
      columnHeader,
      questionType: questionType as QuestionType,
      options,
      objectTypes,
      isRequired,
      displayOrder,
      enabled,
    });

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Failed to create question' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error('[import-questions] POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

/**
 * PUT /api/import-questions
 * Updates an existing import question
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing question ID' },
        { status: 400 }
      );
    }

    const success = await updateImportQuestion(id, updates);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update question' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[import-questions] PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/import-questions?id=xxx
 * Deletes an import question
 */
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing question ID' },
      { status: 400 }
    );
  }

  const success = await deleteImportQuestion(id);

  if (!success) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete question' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
