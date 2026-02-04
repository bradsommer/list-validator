import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Download the original uploaded file for a session
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sessionId = params.id;

    const { data: session, error } = await supabase
      .from('upload_sessions')
      .select('file_name, file_content, file_type, status, expires_at')
      .eq('id', sessionId)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.status === 'expired') {
      return NextResponse.json(
        { error: 'This file has expired and been deleted' },
        { status: 410 }
      );
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This file has expired' },
        { status: 410 }
      );
    }

    if (!session.file_content) {
      return NextResponse.json(
        { error: 'No file content stored for this session' },
        { status: 404 }
      );
    }

    // Decode base64 back to binary
    const fileBuffer = Buffer.from(session.file_content, 'base64');

    // Determine content type
    const contentType = session.file_type || 'application/octet-stream';
    const fileName = session.file_name || 'download';

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
