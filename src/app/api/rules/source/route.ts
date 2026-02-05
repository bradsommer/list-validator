import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Map rule IDs to their source file names
const RULE_FILES: Record<string, string> = {
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
 * GET /api/rules/source?id=rule-id
 * Returns the actual TypeScript source code for a validation rule
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ruleId = searchParams.get('id');

  if (!ruleId) {
    return NextResponse.json({ error: 'Missing rule ID' }, { status: 400 });
  }

  const fileName = RULE_FILES[ruleId];
  if (!fileName) {
    return NextResponse.json({ error: 'Unknown rule ID' }, { status: 404 });
  }

  try {
    // Read the source file
    const scriptsDir = path.join(process.cwd(), 'src', 'lib', 'scripts');
    const filePath = path.join(scriptsDir, fileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Source file not found' }, { status: 404 });
    }

    const source = fs.readFileSync(filePath, 'utf-8');

    return NextResponse.json({
      ruleId,
      fileName,
      source,
    });
  } catch (error) {
    console.error('[rules/source] Error reading source file:', error);
    return NextResponse.json({ error: 'Failed to read source file' }, { status: 500 });
  }
}
