import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Use require for SendGrid to avoid ES module issues
const sgMail = require('@sendgrid/mail');

interface InvitationEmailData {
  to: string;
  token: string;
  inviterName: string;
  tenantName: string;
  expirationDate: Date;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private emailEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (sendGridApiKey) {
      sgMail.setApiKey(sendGridApiKey);
      this.emailEnabled = true;
      this.logger.log('SendGrid email service initialized');
    } else {
      this.emailEnabled = false;
      this.logger.warn(
        'SENDGRID_API_KEY not configured. Emails will be logged to console only.',
      );
    }
  }

  /**
   * Enhanced console logging for emails in development mode
   */
  private logEmailToConsole(
    type: string,
    emoji: string,
    to: string,
    subject: string,
    html: string,
    text: string,
    keyData: Record<string, string> = {},
  ): void {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const htmlSize = (html.length / 1024).toFixed(2);
    const textSize = (text.length / 1024).toFixed(2);

    // Save HTML preview to file
    const htmlFilePath = this.saveHtmlPreview(type, html);

    console.log('\n╔════════════════════════════════════════════════════');
    console.log(`║ ${emoji} ${type} (Development Mode)`);
    console.log('╠════════════════════════════════════════════════════');
    console.log(`║ To:        ${to}`);
    console.log(`║ Subject:   ${subject}`);
    console.log(`║ Time:      ${timestamp}`);
    console.log(`║ Size:      ${htmlSize} KB (HTML) + ${textSize} KB (Text)`);

    // Display key data if provided
    if (Object.keys(keyData).length > 0) {
      console.log('╠════════════════════════════════════════════════════');
      console.log('║ KEY DATA:');
      Object.entries(keyData).forEach(([key, value]) => {
        console.log(`║   • ${key}: ${value}`);
      });
    }

    console.log('╠════════════════════════════════════════════════════');
    console.log('║ 📄 HTML Preview:');
    console.log(`║   File saved: ${htmlFilePath}`);
    console.log('║   ');
    console.log('║   Open in browser to see full styled email');
    console.log('╠════════════════════════════════════════════════════');
    console.log('║ 📝 TEXT PREVIEW:');
    // Show first 3 lines of text
    const textLines = text.split('\n').slice(0, 3);
    textLines.forEach((line) => {
      console.log(`║   ${line.trim()}`);
    });
    if (text.split('\n').length > 3) {
      console.log('║   ...(truncated)');
    }
    console.log('╚════════════════════════════════════════════════════\n');
  }

  /**
   * Save HTML email preview to file for browser viewing
   */
  private saveHtmlPreview(type: string, html: string): string {
    try {
      const previewDir = join(process.cwd(), 'tmp', 'email-previews');

      // Create directory if it doesn't exist
      try {
        mkdirSync(previewDir, { recursive: true });
      } catch (err) {
        // Directory might already exist
      }

      const timestamp = Date.now();
      const filename = `${type.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.html`;
      const filePath = join(previewDir, filename);

      writeFileSync(filePath, html, 'utf-8');

      return filePath;
    } catch (error) {
      this.logger.error('Failed to save HTML preview', error);
      return '(failed to save)';
    }
  }

  async sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );
    const invitationLink = `${frontendUrl}/accept-invite?token=${data.token}`;
    const emailFrom = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@example.com',
    );

    const emailHtml = this.generateInvitationEmailHtml(
      data.tenantName,
      data.inviterName,
      invitationLink,
      data.expirationDate,
    );

    const emailText = this.generateInvitationEmailText(
      data.tenantName,
      data.inviterName,
      invitationLink,
      data.expirationDate,
    );

    const msg = {
      to: data.to,
      from: emailFrom,
      subject: `You're invited to join ${data.tenantName}`,
      text: emailText,
      html: emailHtml,
    };

    if (!this.emailEnabled) {
      this.logEmailToConsole(
        'INVITATION EMAIL',
        '📨',
        data.to,
        msg.subject,
        emailHtml,
        emailText,
        {
          'Invitation Link': invitationLink,
          Expires: data.expirationDate.toLocaleString(),
          'Invited By': data.inviterName,
          Tenant: data.tenantName,
        },
      );
      return true;
    }

    try {
      await sgMail.send(msg);
      this.logger.log(`Invitation email sent to ${data.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send invitation email to ${data.to}`, error);
      return false;
    }
  }

  private generateInvitationEmailHtml(
    tenantName: string,
    inviterName: string,
    invitationLink: string,
    expirationDate: Date,
  ): string {
    const expirationStr = expirationDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; background-color: #f9fafb; }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #4F46E5;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>You're Invited!</h1>
    </div>
    <div class="content">
      <h2>Hello!</h2>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${tenantName}</strong> on our platform.</p>
      <p>Click the button below to accept the invitation and create your account:</p>
      <div style="text-align: center;">
        <a href="${invitationLink}" class="button">Accept Invitation</a>
      </div>
      <p><strong>Important:</strong> This invitation expires on <strong>${expirationStr}</strong>.</p>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #4F46E5;">${invitationLink}</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
      <p style="color: #6b7280; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private generateInvitationEmailText(
    tenantName: string,
    inviterName: string,
    invitationLink: string,
    expirationDate: Date,
  ): string {
    const expirationStr = expirationDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return `
You're invited to join ${tenantName}!

${inviterName} has invited you to join ${tenantName} on our platform.

To accept the invitation and create your account, visit:
${invitationLink}

This invitation expires on ${expirationStr}.

If you didn't expect this invitation, you can safely ignore this email.
    `.trim();
  }

  async sendJoinRequestApprovedEmail(
    email: string,
    tenantName: string,
    adminResponse?: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );
    const emailFrom = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@example.com',
    );

    const msg = {
      to: email,
      from: emailFrom,
      subject: `Your request to join ${tenantName} has been approved`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; background-color: #f9fafb; }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #10b981;
      color: white;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
    }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Join Request Approved</h1>
    </div>
    <div class="content">
      <p>Great news!</p>
      <p>Your request to join <strong>${tenantName}</strong> has been approved.</p>
      ${adminResponse ? `<p><em>"${adminResponse}"</em></p>` : ''}
      <p>You now have access to the ${tenantName} workspace. Log in to get started.</p>
      <div style="text-align: center;">
        <a href="${frontendUrl}" class="button">Access Workspace</a>
      </div>
    </div>
    <div class="footer">
      <p>This is an automated email, please do not reply.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
Your request to join ${tenantName} has been approved

You now have access to the ${tenantName} workspace.
${adminResponse ? `\nMessage: ${adminResponse}` : ''}

Visit ${frontendUrl} to log in.
      `.trim(),
    };

    if (!this.emailEnabled) {
      this.logEmailToConsole(
        'JOIN REQUEST APPROVED',
        '✅',
        email,
        msg.subject,
        msg.html,
        msg.text,
        {
          Tenant: tenantName,
          Status: 'APPROVED',
          'Workspace URL': frontendUrl,
          ...(adminResponse && { 'Admin Message': adminResponse }),
        },
      );
      return true;
    }

    try {
      await sgMail.send(msg);
      this.logger.log(`Join request approved email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send join request approved email to ${email}`,
        error,
      );
      return false;
    }
  }

  async sendJoinRequestRejectedEmail(
    email: string,
    tenantName: string,
    adminResponse?: string,
  ): Promise<boolean> {
    const defaultMessage =
      'Unfortunately, your request was not approved at this time.';
    const message = adminResponse || defaultMessage;
    const emailFrom = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@example.com',
    );

    const msg = {
      to: email,
      from: emailFrom,
      subject: `Your request to join ${tenantName}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #6b7280; color: white; padding: 20px; text-align: center; }
    .content { padding: 30px 20px; background-color: #f9fafb; }
    .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Join Request Update</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Your request to join <strong>${tenantName}</strong> has been reviewed.</p>
      <p>${message}</p>
      <p>If you have any questions, please contact the organization administrator.</p>
    </div>
    <div class="footer">
      <p>This is an automated email, please do not reply.</p>
    </div>
  </div>
</body>
</html>
      `,
      text: `
Your request to join ${tenantName}

Your request has been reviewed.

${message}

If you have any questions, please contact the organization administrator.
      `.trim(),
    };

    if (!this.emailEnabled) {
      this.logEmailToConsole(
        'JOIN REQUEST REJECTED',
        '❌',
        email,
        msg.subject,
        msg.html,
        msg.text,
        {
          Tenant: tenantName,
          Status: 'REJECTED',
          'Rejection Reason': message,
        },
      );
      return true;
    }

    try {
      await sgMail.send(msg);
      this.logger.log(`Join request rejected email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send join request rejected email to ${email}`,
        error,
      );
      return false;
    }
  }

  /**
   * Send password reset email with token
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<boolean> {
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:4200',
    );
    const emailFrom = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@example.com',
    );
    const expirationHours =
      this.configService.get<string>('PASSWORD_RESET_EXPIRATION_HOURS') || '1';

    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const emailHtml = `
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
    `.trim();

    const emailText = `
Password Reset Request

You requested a password reset for your account.

Click the link below to reset your password:
${resetLink}

This link expires in ${expirationHours} hour(s).

If you didn't request this, please ignore this email.
    `.trim();

    const msg = {
      to: email,
      from: emailFrom,
      subject: 'Password Reset Request',
      text: emailText,
      html: emailHtml,
    };

    if (!this.emailEnabled) {
      this.logEmailToConsole(
        'PASSWORD RESET EMAIL',
        '🔐',
        email,
        msg.subject,
        emailHtml,
        emailText,
        {
          'Reset Link': resetLink,
          Expires: `${expirationHours} hour(s)`,
          Token: `${resetToken.substring(0, 20)}...`,
        },
      );
      return true;
    }

    try {
      await sgMail.send(msg);
      this.logger.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      return false;
    }
  }
}
