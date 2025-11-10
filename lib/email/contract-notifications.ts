import { sendEmail } from './sendgrid';
import { createNotification, createNotificationsForUsers } from '@/lib/utils/notifications';
import { logger } from '@/lib/utils/logger';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface ContractCreatedNotificationOptions {
  to_email: string;
  to_name: string;
  contract_number: string;
  contract_id: string;
  client_name: string;
  created_by_name: string;
}

/**
 * Send notification when a contract is created
 */
export async function sendContractCreatedNotification({
  to_email,
  to_name,
  contract_number,
  contract_id,
  client_name,
  created_by_name,
}: ContractCreatedNotificationOptions) {
  const contractUrl = `${APP_URL}/contracts/${contract_id}`;
  const subject = `New Contract Created: ${contract_number}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 30px 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .info-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .info-box strong {
          color: #1d4ed8;
        }
        .button {
          display: inline-block;
          background: #3b82f6;
          color: white !important;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
        .button:hover {
          background: #2563eb;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📄 New Contract Created</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <p><strong>${created_by_name}</strong> has created a new contract for <strong>${client_name}</strong>.</p>

        <div class="info-box">
          <strong>Contract Number:</strong> ${contract_number}<br>
          <strong>Client:</strong> ${client_name}
        </div>

        <p>You can view and manage the contract details by clicking the button below:</p>

        <div style="text-align: center;">
          <a href="${contractUrl}" class="button">View Contract</a>
        </div>
      </div>

      <div class="footer">
        <p>This is an automated notification from your contract management system.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: to_email,
    subject,
    html,
  });
}

interface ContractStatusChangedNotificationOptions {
  to_email: string;
  to_name: string;
  contract_number: string;
  contract_id: string;
  old_status: string;
  new_status: string;
  changed_by_name: string;
}

/**
 * Send notification when contract status changes
 */
export async function sendContractStatusChangedNotification({
  to_email,
  to_name,
  contract_number,
  contract_id,
  old_status,
  new_status,
  changed_by_name,
}: ContractStatusChangedNotificationOptions) {
  const contractUrl = `${APP_URL}/contracts/${contract_id}`;
  const statusEmoji = new_status === 'signed' ? '✅' : new_status === 'pending_signature' ? '⏳' : '📄';
  const subject = `${statusEmoji} Contract Status Updated: ${contract_number}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: white;
          padding: 30px 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .status-box {
          background: #f0fdf4;
          border-left: 4px solid #10b981;
          padding: 15px;
          margin: 20px 0;
        }
        .status-box strong {
          color: #059669;
        }
        .button {
          display: inline-block;
          background: #10b981;
          color: white !important;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
        .button:hover {
          background: #059669;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${statusEmoji} Contract Status Updated</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <p>The status of contract <strong>${contract_number}</strong> has been updated by <strong>${changed_by_name}</strong>.</p>

        <div class="status-box">
          <strong>Status Changed:</strong><br>
          ${old_status.replace('_', ' ')} → ${new_status.replace('_', ' ')}
        </div>

        <p>You can view the updated contract details by clicking the button below:</p>

        <div style="text-align: center;">
          <a href="${contractUrl}" class="button">View Contract</a>
        </div>
      </div>

      <div class="footer">
        <p>This is an automated notification from your contract management system.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: to_email,
    subject,
    html,
  });
}

interface DocumentUploadedNotificationOptions {
  to_email: string;
  to_name: string;
  contract_number: string;
  contract_id: string;
  document_name: string;
  version_number: number;
  uploaded_by_name: string;
}

/**
 * Send notification when a document is uploaded to a contract
 */
export async function sendDocumentUploadedNotification({
  to_email,
  to_name,
  contract_number,
  contract_id,
  document_name,
  version_number,
  uploaded_by_name,
}: DocumentUploadedNotificationOptions) {
  const contractUrl = `${APP_URL}/contracts/${contract_id}`;
  const subject = `📎 New Document Uploaded: ${contract_number}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
          color: white;
          padding: 30px 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .info-box {
          background: #faf5ff;
          border-left: 4px solid #8b5cf6;
          padding: 15px;
          margin: 20px 0;
        }
        .info-box strong {
          color: #7c3aed;
        }
        .button {
          display: inline-block;
          background: #8b5cf6;
          color: white !important;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
        .button:hover {
          background: #7c3aed;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📎 New Document Uploaded</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <p><strong>${uploaded_by_name}</strong> has uploaded a new document to contract <strong>${contract_number}</strong>.</p>

        <div class="info-box">
          <strong>Document:</strong> ${document_name}<br>
          <strong>Version:</strong> ${version_number}
        </div>

        <p>You can view the document and contract details by clicking the button below:</p>

        <div style="text-align: center;">
          <a href="${contractUrl}" class="button">View Contract</a>
        </div>
      </div>

      <div class="footer">
        <p>This is an automated notification from your contract management system.</p>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: to_email,
    subject,
    html,
  });
}

/**
 * Create in-app notification for contract events
 */
export async function createContractNotification(
  userIds: string[],
  organizationId: string,
  type: 'contract_created' | 'contract_status_changed' | 'document_uploaded' | 'payment_method_added' | 'email_mockup_created',
  title: string,
  message: string,
  contractId: string,
  metadata?: Record<string, any>
) {
  await createNotificationsForUsers(
    userIds,
    organizationId,
    'stage_progress', // Reuse existing notification type for now
    title,
    message,
    `/contracts/${contractId}`,
    undefined, // relatedAssetId
    undefined, // relatedProjectId
    contractId, // relatedContractId
    {
      ...metadata,
      contract_id: contractId,
      notification_subtype: type,
    }
  );
}

interface ContractRoutedForCommentOptions {
  to_email: string;
  to_name: string;
  contract_number: string;
  contract_id: string;
  contract_title?: string;
  client_name: string;
  document_id: string;
  document_name: string;
  document_url: string;
  version_owner: 'cdco' | 'client';
  version_number: number;
  ai_summary?: string | null;
  message?: string | null;
  routed_by_name: string;
}

/**
 * Send email when contract is routed for comment
 */
export async function sendContractRoutedForComment({
  to_email,
  to_name,
  contract_number,
  contract_id,
  contract_title,
  client_name,
  document_id,
  document_name,
  document_url,
  version_owner,
  version_number,
  ai_summary,
  message,
  routed_by_name,
}: ContractRoutedForCommentOptions) {
  logger.info('Preparing contract routing email', {
    to_email,
    contract_number,
    document_name,
    version_number,
    has_ai_summary: !!ai_summary,
    has_message: !!message,
  });

  const contractUrl = `${APP_URL}/contracts/${contract_id}`;
  const versionOwnerLabel = version_owner === 'client' ? "Client's Version" : "CDCO's Version";
  const subject = `📄 Contract Routed for Comment: ${contract_number}`;

  // Download document from Supabase Storage for attachment
  let attachment: { content: string; filename: string; type: string } | null = null;
  try {
    logger.debug('Downloading document for email attachment', { document_url, document_name });
    const response = await fetch(document_url);
    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const base64Content = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = response.headers.get('content-type') || 'application/octet-stream';
      
      attachment = {
        content: base64Content,
        filename: document_name,
        type: mimeType,
      };
      logger.info('Document downloaded successfully for attachment', { 
        filename: document_name,
        size: base64Content.length,
        mimeType 
      });
    } else {
      logger.warn('Failed to download document for attachment', { 
        status: response.status,
        statusText: response.statusText,
        document_url 
      });
    }
  } catch (error) {
    logger.error('Error downloading document for attachment', {
      error: error instanceof Error ? error.message : String(error),
      document_url,
      document_name,
    });
    // Continue without attachment if download fails
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 30px 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .info-box {
          background: #f0f9ff;
          border-left: 4px solid #3b82f6;
          padding: 15px;
          margin: 20px 0;
        }
        .info-box strong {
          color: #1d4ed8;
        }
        .version-badge {
          display: inline-block;
          background: ${version_owner === 'client' ? '#fef3c7' : '#dbeafe'};
          color: ${version_owner === 'client' ? '#92400e' : '#1e40af'};
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          margin-left: 8px;
        }
        .summary-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
        }
        .summary-box h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .summary-box p {
          margin: 0;
          color: #374151;
          white-space: pre-wrap;
        }
        .message-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
        }
        .message-box strong {
          color: #92400e;
        }
        .button {
          display: inline-block;
          background: #3b82f6;
          color: white !important;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
        .button:hover {
          background: #2563eb;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📄 Contract Routed for Comment</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <p><strong>${routed_by_name}</strong> has routed a contract version for your review and comment.</p>

        <div class="info-box">
          <strong>Contract Number:</strong> ${contract_number}<br>
          ${contract_title ? `<strong>Title:</strong> ${contract_title}<br>` : ''}
          <strong>Client:</strong> ${client_name}<br>
          <strong>Document:</strong> ${document_name}<br>
          <strong>Version:</strong> v${version_number} <span class="version-badge">${versionOwnerLabel}</span>
        </div>

        ${ai_summary ? `
        <div class="summary-box">
          <h3>AI Summary of Changes</h3>
          <p>${ai_summary}</p>
        </div>
        ` : ''}

        ${message ? `
        <div class="message-box">
          <strong>Message from ${routed_by_name}:</strong><br>
          ${message}
        </div>
        ` : ''}

        <p>The contract document is attached to this email. You can also view the contract in the system by clicking the button below:</p>

        <div style="text-align: center;">
          <a href="${contractUrl}" class="button">View Contract</a>
        </div>

        ${attachment ? `
        <p style="font-size: 12px; color: #666; margin-top: 20px;">
          <strong>Note:</strong> The contract document "${document_name}" is attached to this email.
        </p>
        ` : `
        <p style="font-size: 12px; color: #666; margin-top: 20px;">
          <strong>Note:</strong> You can download the document from the contract page linked above.
        </p>
        `}
      </div>

      <div class="footer">
        <p>This is an automated notification from your contract management system.</p>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({
      to: to_email,
      subject,
      html,
      attachments: attachment ? [attachment] : undefined,
    });
    logger.info('Contract routing email sent successfully', {
      to_email,
      contract_number,
      document_name,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send contract routing email', {
      error: errorMessage,
      to_email,
      contract_number,
      document_name,
    });
    throw new Error(`Failed to send contract routing email to ${to_email}: ${errorMessage}`);
  }
}


