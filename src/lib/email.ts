import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_ADDRESS = process.env.EMAIL_FROM || 'List Validator <noreply@listvalidator.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function sendWelcomeEmail(
  to: string,
  displayName: string,
  tempPassword: string
): Promise<boolean> {
  try {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to,
      subject: 'Your List Validator account has been created',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to List Validator${displayName ? `, ${displayName}` : ''}!</h2>
          <p>An account has been created for you. Here are your login credentials:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px;"><strong>Username:</strong> ${to}</p>
            <p style="margin: 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p>Please sign in and change your password as soon as possible.</p>
          <a href="${APP_URL}/login" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px;">
            Sign In
          </a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            If you did not expect this email, please ignore it.
          </p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[email] Failed to send welcome email:', err);
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
      to,
      subject: 'Reset your List Validator password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>We received a request to reset your password. Click the button below to choose a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px;">
            Reset Password
          </a>
          <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
            This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
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
      to,
      subject: 'Your List Validator username',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Username Reminder</h2>
          <p>You requested a reminder of your username. Here it is:</p>
          <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0;"><strong>Username:</strong> ${username}</p>
          </div>
          <a href="${APP_URL}/login" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 8px;">
            Sign In
          </a>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[email] Failed to send username reminder:', err);
    return false;
  }
}
