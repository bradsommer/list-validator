import { NextRequest, NextResponse } from 'next/server';
import { initializeAccountRules } from '@/lib/accountRules';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const success = await initializeAccountRules(accountId);
    return NextResponse.json({ success });
  } catch (err) {
    console.error('Error initializing account rules:', err);
    return NextResponse.json({ error: 'Failed to initialize account rules' }, { status: 500 });
  }
}
