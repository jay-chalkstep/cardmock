import { Resend } from 'resend';
import { logger } from '@/lib/utils/logger';

// Initialize Resend with API key
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@cardmock.com';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'CardMock';

let resend: Resend | null = null;

if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
  logger.info('Resend initialized with API key', { hasKey: true, fromEmail: FROM_EMAIL });
} else {
  logger.warn('Resend API key not found in environment variables');
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
 * Send an email using Resend
 */
export async function sendEmail({ to, subject, html, text, attachments }: EmailOptions) {
  if (!RESEND_API_KEY) {
    const error = new Error('Resend API key is not configured. Please set RESEND_API_KEY environment variable.');
    logger.error('Resend API key not configured', error);
    throw error;
  }

  if (!resend) {
    const error = new Error('Resend client not initialized');
    logger.error('Resend client not initialized', error);
    throw error;
  }

  try {
    logger.info('Sending email via Resend', { 
      to: Array.isArray(to) ? to.join(', ') : to, 
      subject,
      hasAttachments: attachments && attachments.length > 0 
    });

    // Resend expects an array of recipients
    const recipients = Array.isArray(to) ? to : [to];

    // Convert attachments to Resend format
    // Resend expects: { filename: string, content: Buffer | string }
    const resendAttachments = attachments?.map(att => ({
      filename: att.filename,
      content: Buffer.from(att.content, 'base64')
    }));

    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: recipients,
      subject,
      html,
      text: text || stripHtml(html),
      attachments: resendAttachments
    });

    if (error) {
      logger.error('Failed to send email via Resend', {
        error: error.message,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        resendError: error
      });
      throw new Error(`Failed to send email: ${error.message}`);
    }

    logger.info('Email sent successfully', { 
      to: Array.isArray(to) ? to.join(', ') : to, 
      subject,
      emailId: data?.id
    });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to send email via Resend', {
      error: errorMessage,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject
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

