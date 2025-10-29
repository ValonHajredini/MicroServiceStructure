import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

/**
 * Email Service
 *
 * Integrated with SendGrid for production email delivery.
 * Falls back to console logging in development if SendGrid API key is not configured.
 *
 * Configuration:
 * - SENDGRID_API_KEY: SendGrid API key (required for production)
 * - EMAIL_FROM: Sender email address (must be verified in SendGrid)
 * - FRONTEND_URL: Frontend application URL for reset links
 * - PASSWORD_RESET_EXPIRATION_HOURS: Token expiration time (default: 1 hour)
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly isProduction: boolean;
  private readonly sendGridConfigured: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.sendGridConfigured = !!process.env.SENDGRID_API_KEY;

    if (this.sendGridConfigured && process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.logger.log('SendGrid email service initialized');
    } else {
      this.logger.warn(
        'SendGrid API key not configured. Emails will be logged to console.',
      );
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const expirationHours =
      process.env.PASSWORD_RESET_EXPIRATION_HOURS || '1';

    const emailContent = {
      to: email,
      from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9fafb; padding: 30px; }
            .button {
              display: inline-block;
              background-color: #4F46E5;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer { color: #6b7280; font-size: 12px; text-align: center; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>We received a request to reset the password for your account.</p>
              <p>Click the button below to reset your password:</p>
              <p style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </p>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4F46E5;">${resetLink}</p>
              <p><strong>This link expires in ${expirationHours} hour(s).</strong></p>
              <p>If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class="footer">
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Password Reset Request

You requested a password reset for your account.

Click the link below to reset your password:
${resetLink}

This link expires in ${expirationHours} hour(s).

If you didn't request this, please ignore this email.
      `,
    };

    try {
      if (this.sendGridConfigured) {
        // Send via SendGrid in production
        await sgMail.send(emailContent);
        this.logger.log(`Password reset email sent to: ${email}`);
      } else {
        // Log to console in development
        this.logEmailToConsole(email, resetLink, expirationHours);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}:`,
        error,
      );

      // In production, log the error but don't expose it to the user
      if (this.isProduction) {
        throw new Error('Failed to send password reset email');
      } else {
        // In development, fall back to console logging
        this.logger.warn('Falling back to console logging');
        this.logEmailToConsole(email, resetLink, expirationHours);
      }
    }
  }

  private logEmailToConsole(
    email: string,
    resetLink: string,
    expirationHours: string,
  ): void {
    console.log('\n===============================================');
    console.log('🔐 PASSWORD RESET EMAIL (DEVELOPMENT MODE)');
    console.log('===============================================');
    console.log('To:', email);
    console.log('Subject: Password Reset Request');
    console.log('Reset Link:', resetLink);
    console.log(`Expires in: ${expirationHours} hour(s)`);
    console.log('===============================================\n');
  }
}
