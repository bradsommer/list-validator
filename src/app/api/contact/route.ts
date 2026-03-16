import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

const CONTACT_INBOX = 'info@freshsegments.com';
const FROM_ADDRESS = process.env.EMAIL_FROM || 'FreshSegments <noreply@freshsegments.com>';

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message } = await request.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { success: false, error: 'Message must be under 5000 characters' },
        { status: 400 }
      );
    }

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: CONTACT_INBOX,
      replyTo: email,
      subject: `Contact Form: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\n${message}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px;">
          <h2 style="color: #111827; margin-bottom: 16px;">New Contact Form Submission</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #374151; width: 80px; vertical-align: top;">Name</td>
              <td style="padding: 8px 12px; color: #374151;">${name.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #374151; vertical-align: top;">Email</td>
              <td style="padding: 8px 12px; color: #374151;"><a href="mailto:${email.replace(/"/g, '&quot;')}">${email.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; font-weight: 600; color: #374151; vertical-align: top;">Subject</td>
              <td style="padding: 8px 12px; color: #374151;">${subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
            </tr>
          </table>
          <div style="padding: 16px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #374151; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send message. Please try again.' },
      { status: 500 }
    );
  }
}
