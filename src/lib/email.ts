import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM || 'FreshSegments <noreply@freshsegments.com>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'support@freshsegments.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/** Wrap email content in a proper HTML document with consistent styling */
function wrapHtml(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FreshSegments</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb;">
          <tr>
            <td style="padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #374151;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #e5e7eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #9ca3af; text-align: center;">
              <p style="margin: 0 0 4px;">FreshSegments &mdash; List validation and enrichment for HubSpot</p>
              <p style="margin: 0;">FreshSegments, Inc. &bull; 519 W 22nd St, Suite 100, PMB 92955, Sioux Falls, SD 57105</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail(
  to: string,
  displayName: string,
  tempPassword: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to,
      subject: 'Your FreshSegments account has been created',
      text: [
        `Welcome to FreshSegments${displayName ? `, ${displayName}` : ''}!`,
        '',
        'An account has been created for you. Here are your login credentials:',
        '',
        `Username: ${to}`,
        `Temporary Password: ${tempPassword}`,
        '',
        'Please sign in and change your password as soon as possible.',
        '',
        `Sign in: ${APP_URL}/login`,
        '',
        'If you did not expect this email, please ignore it.',
        '',
        '---',
        'FreshSegments, Inc. | 519 W 22nd St, Suite 100, PMB 92955, Sioux Falls, SD 57105',
      ].join('\n'),
      html: wrapHtml(`
        <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">Welcome to FreshSegments${displayName ? `, ${displayName}` : ''}!</h2>
        <p>An account has been created for you. Here are your login credentials:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 8px;"><strong>Username:</strong> ${to}</p>
          <p style="margin: 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p>Please sign in and change your password as soon as possible.</p>
        <a href="${APP_URL}/login" style="display: inline-block; background: #0B8377; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 500;">
          Sign In
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          If you did not expect this email, please ignore it.
        </p>
      `),
    });
    return true;
  } catch (err) {
    console.error('[email] Failed to send welcome email:', err);
    return false;
  }
}

export async function sendInviteEmail(
  to: string,
  displayName: string,
  inviteToken: string
): Promise<boolean> {
  const setupUrl = `${APP_URL}/setup-account?token=${inviteToken}`;
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to,
      subject: "You're invited to FreshSegments",
      text: [
        `Welcome to FreshSegments${displayName ? `, ${displayName}` : ''}!`,
        '',
        'An account has been created for you. Visit the link below to set up your password and get started:',
        '',
        setupUrl,
        '',
        'This link expires in 48 hours. If you did not expect this email, please ignore it.',
        '',
        '---',
        'FreshSegments, Inc. | 519 W 22nd St, Suite 100, PMB 92955, Sioux Falls, SD 57105',
      ].join('\n'),
      html: wrapHtml(`
        <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">Welcome to FreshSegments${displayName ? `, ${displayName}` : ''}!</h2>
        <p>An account has been created for you. Click the button below to set up your password and get started:</p>
        <a href="${setupUrl}" style="display: inline-block; background: #0B8377; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 500;">
          Set Up Your Account
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          This link expires in 48 hours. If you did not expect this email, please ignore it.
        </p>
      `),
    });
    return true;
  } catch (err) {
    console.error('[email] Failed to send invite email:', err);
    return false;
  }
}

export async function sendAccountAcceptEmail(
  to: string,
  displayName: string,
  acceptToken: string
): Promise<boolean> {
  const acceptUrl = `${APP_URL}/accept-invite?token=${acceptToken}`;
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to,
      subject: "You've been added to a new account on FreshSegments",
      text: [
        `New Account Invitation${displayName ? `, ${displayName}` : ''}!`,
        '',
        "You've been invited to access a new account on FreshSegments. Since you already have a FreshSegments account, no password setup is needed.",
        '',
        'Visit the link below to accept the invitation:',
        '',
        acceptUrl,
        '',
        'This link expires in 48 hours. If you did not expect this email, please ignore it.',
        '',
        '---',
        'FreshSegments, Inc. | 519 W 22nd St, Suite 100, PMB 92955, Sioux Falls, SD 57105',
      ].join('\n'),
      html: wrapHtml(`
        <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">New Account Invitation${displayName ? `, ${displayName}` : ''}!</h2>
        <p>You've been invited to access a new account on FreshSegments. Since you already have a FreshSegments account, no password setup is needed.</p>
        <p>Click the button below to accept the invitation:</p>
        <a href="${acceptUrl}" style="display: inline-block; background: #0B8377; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 500;">
          Accept Invitation
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          This link expires in 48 hours. If you did not expect this email, please ignore it.
        </p>
      `),
    });
    return true;
  } catch (err) {
    console.error('[email] Failed to send account accept email:', err);
    return false;
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to,
      subject: 'Reset your FreshSegments password',
      text: [
        'Password Reset Request',
        '',
        'We received a request to reset your password. Visit the link below to choose a new password:',
        '',
        resetUrl,
        '',
        'This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.',
        '',
        '---',
        'FreshSegments, Inc. | 519 W 22nd St, Suite 100, PMB 92955, Sioux Falls, SD 57105',
      ].join('\n'),
      html: wrapHtml(`
        <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">Password Reset Request</h2>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #0B8377; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 500;">
          Reset Password
        </a>
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
        </p>
      `),
    });
    return true;
  } catch (err) {
    console.error('[email] Failed to send reset email:', err);
    return false;
  }
}

export async function sendUsernameReminderEmail(
  to: string,
  username: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      replyTo: REPLY_TO,
      to,
      subject: 'Your FreshSegments username',
      text: [
        'Username Reminder',
        '',
        'You requested a reminder of your username. Here it is:',
        '',
        `Username: ${username}`,
        '',
        `Sign in: ${APP_URL}/login`,
        '',
        '---',
        'FreshSegments, Inc. | 519 W 22nd St, Suite 100, PMB 92955, Sioux Falls, SD 57105',
      ].join('\n'),
      html: wrapHtml(`
        <h2 style="margin: 0 0 16px; font-size: 22px; color: #111827;">Username Reminder</h2>
        <p>You requested a reminder of your username. Here it is:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Username:</strong> ${username}</p>
        </div>
        <a href="${APP_URL}/login" style="display: inline-block; background: #0B8377; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px; font-weight: 500;">
          Sign In
        </a>
      `),
    });
    return true;
  } catch (err) {
    console.error('[email] Failed to send username reminder:', err);
    return false;
  }
}
