import sgMail from '@sendgrid/mail';
import { logger } from '@/lib/utils/logger';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@assetstudio.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Asset Studio';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  logger.info('SendGrid initialized with API key', { hasKey: true, fromEmail: FROM_EMAIL });
} else {
  logger.warn('SendGrid API key not found in environment variables');
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
    const error = new Error('SendGrid API key is not configured. Please set SENDGRID_API_KEY environment variable.');
    logger.error('SendGrid API key not configured', error);
    throw error;
  }

  try {
    logger.info('Sending email via SendGrid', { 
      to: Array.isArray(to) ? to.join(', ') : to, 
      subject,
      hasAttachments: attachments && attachments.length > 0 
    });

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
      logger.debug('Email attachments added', { count: attachments.length });
    }

    await sgMail.send(msg);

    logger.info('Email sent successfully', { 
      to: Array.isArray(to) ? to.join(', ') : to, 
      subject 
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const sendGridError = error as any;
    
    logger.error('Failed to send email via SendGrid', {
      error: errorMessage,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      sendGridCode: sendGridError?.code,
      sendGridResponse: sendGridError?.response?.body
    });
    
    throw new Error(`Failed to send email: ${errorMessage}`);
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
