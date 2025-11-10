import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@assetstudio.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Asset Studio';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    content: string; // Base64 encoded
    filename: string;
    type?: string;
    disposition?: string;
  }>;
}

/**
 * Send an email using SendGrid
 */
export async function sendEmail({ to, subject, html, text, attachments }: EmailOptions) {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email send');
    return false;
  }

  try {
    const msg: any = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject,
      html,
      text: text || stripHtml(html)
    };

    if (attachments && attachments.length > 0) {
      msg.attachments = attachments;
    }

    await sgMail.send(msg);

    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Simple HTML tag stripper for plain text fallback
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export default {
  sendEmail
};
