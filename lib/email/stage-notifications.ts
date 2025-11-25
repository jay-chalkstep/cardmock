import { sendEmail } from './resend';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface StageReviewNotificationOptions {
  to_email: string;
  to_name: string;
  mockup_name: string;
  mockup_id: string;
  project_name: string;
  stage_name: string;
  stage_order: number;
  submitted_by_name: string;
}

/**
 * Send notification to reviewers when mockup reaches their stage
 */
export async function sendStageReviewNotification({
  to_email,
  to_name,
  mockup_name,
  mockup_id,
  project_name,
  stage_name,
  stage_order,
  submitted_by_name
}: StageReviewNotificationOptions) {
  const mockupUrl = `${APP_URL}/mockups/${mockup_id}`;
  const subject = `[Stage ${stage_order}] Review Requested: ${mockup_name}`;

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
          color: #3b82f6;
        }
        .stage-badge {
          display: inline-block;
          background: #3b82f6;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin: 10px 0;
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
        <h1>📋 Stage Review Request</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <p>A mockup has reached your review stage and is ready for your approval.</p>

        <div class="info-box">
          <strong>Mockup:</strong> ${mockup_name}<br>
          <strong>Project:</strong> ${project_name}<br>
          <strong>Submitted by:</strong> ${submitted_by_name}
        </div>

        <div class="stage-badge">
          Stage ${stage_order}: ${stage_name}
        </div>

        <p>Please review the mockup and either approve it to move forward or request changes.</p>

        <div style="text-align: center;">
          <a href="${mockupUrl}" class="button">Review Mockup Now</a>
        </div>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          You're receiving this because you're assigned as a reviewer for this workflow stage.
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} CardMock. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Stage Review Request

Hi ${to_name},

A mockup has reached your review stage and is ready for your approval.

Mockup: ${mockup_name}
Project: ${project_name}
Stage: ${stage_order} - ${stage_name}
Submitted by: ${submitted_by_name}

Please review the mockup and either approve it to move forward or request changes.

Review mockup here: ${mockupUrl}

---
© ${new Date().getFullYear()} CardMock
  `;

  return sendEmail({
    to: to_email,
    subject,
    html,
    text
  });
}

interface ChangesRequestedNotificationOptions {
  to_email: string;
  to_name: string;
  mockup_name: string;
  mockup_id: string;
  project_name: string;
  stage_name: string;
  stage_order: number;
  requested_by_name: string;
  notes?: string;
}

/**
 * Send notification to creator when changes are requested at any stage
 */
export async function sendChangesRequestedNotification({
  to_email,
  to_name,
  mockup_name,
  mockup_id,
  project_name,
  stage_name,
  stage_order,
  requested_by_name,
  notes
}: ChangesRequestedNotificationOptions) {
  const mockupUrl = `${APP_URL}/mockups/${mockup_id}`;
  const subject = `⚠️ Changes Requested: ${mockup_name}`;

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
          background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%);
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
        .warning-box {
          background: #fef3c7;
          border-left: 4px solid #f59e0b;
          padding: 15px;
          margin: 20px 0;
        }
        .info-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .info-box strong {
          color: #dc2626;
        }
        .notes-box {
          background: #fef2f2;
          border-left: 4px solid #dc2626;
          padding: 15px;
          margin: 20px 0;
          font-style: italic;
        }
        .stage-badge {
          display: inline-block;
          background: #dc2626;
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin: 10px 0;
        }
        .button {
          display: inline-block;
          background: #dc2626;
          color: white !important;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
        }
        .button:hover {
          background: #b91c1c;
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
        <h1>⚠️ Changes Requested</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <p><strong>${requested_by_name}</strong> has requested changes to your mockup at the <strong>${stage_name}</strong> stage.</p>

        <div class="info-box">
          <strong>Mockup:</strong> ${mockup_name}<br>
          <strong>Project:</strong> ${project_name}<br>
          <strong>Reviewer:</strong> ${requested_by_name}
        </div>

        <div class="stage-badge">
          Stage ${stage_order}: ${stage_name}
        </div>

        ${notes ? `
        <div class="notes-box">
          <strong>Feedback:</strong><br>
          "${notes}"
        </div>
        ` : ''}

        <div class="warning-box">
          <strong>⚠️ Note:</strong> The mockup has been sent back to Stage 1 for revision. Once you've made the requested changes, it will go through the approval workflow again.
        </div>

        <div style="text-align: center;">
          <a href="${mockupUrl}" class="button">View Mockup & Feedback</a>
        </div>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          Review the feedback, make the necessary changes, and the mockup will automatically be submitted for re-review.
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} CardMock. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Changes Requested

Hi ${to_name},

${requested_by_name} has requested changes to your mockup at the ${stage_name} stage.

Mockup: ${mockup_name}
Project: ${project_name}
Stage: ${stage_order} - ${stage_name}
Reviewer: ${requested_by_name}

${notes ? `Feedback: "${notes}"` : ''}

⚠️ Note: The mockup has been sent back to Stage 1 for revision. Once you've made the requested changes, it will go through the approval workflow again.

View mockup and feedback here: ${mockupUrl}

---
© ${new Date().getFullYear()} CardMock
  `;

  return sendEmail({
    to: to_email,
    subject,
    html,
    text
  });
}

interface AllStagesApprovedNotificationOptions {
  to_email: string;
  to_name: string;
  mockup_name: string;
  mockup_id: string;
  project_name: string;
  total_stages: number;
}

/**
 * Send celebration notification when all workflow stages are approved
 */
export async function sendAllStagesApprovedNotification({
  to_email,
  to_name,
  mockup_name,
  mockup_id,
  project_name,
  total_stages
}: AllStagesApprovedNotificationOptions) {
  const mockupUrl = `${APP_URL}/mockups/${mockup_id}`;
  const subject = `🎉 Approved: ${mockup_name}`;

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
          font-size: 28px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .success-box {
          background: #d1fae5;
          border-left: 4px solid #10b981;
          padding: 20px;
          margin: 20px 0;
          text-align: center;
        }
        .success-box .big-text {
          font-size: 48px;
          margin: 10px 0;
        }
        .info-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .info-box strong {
          color: #10b981;
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
        <h1>🎉 All Stages Approved!</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <div class="success-box">
          <div class="big-text">✓</div>
          <h2 style="margin: 10px 0; color: #10b981;">Congratulations!</h2>
          <p style="margin: 5px 0;">Your mockup has been approved through all ${total_stages} workflow stages.</p>
        </div>

        <div class="info-box">
          <strong>Mockup:</strong> ${mockup_name}<br>
          <strong>Project:</strong> ${project_name}<br>
          <strong>Stages Completed:</strong> ${total_stages}/${total_stages} ✓
        </div>

        <p>Great work! Your mockup has successfully passed through the entire approval workflow and is now ready for use.</p>

        <div style="text-align: center;">
          <a href="${mockupUrl}" class="button">View Approved Mockup</a>
        </div>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          You can now download and use this mockup with confidence, knowing it has been approved by all stakeholders.
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} CardMock. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
🎉 All Stages Approved!

Hi ${to_name},

Congratulations! Your mockup has been approved through all ${total_stages} workflow stages.

Mockup: ${mockup_name}
Project: ${project_name}
Stages Completed: ${total_stages}/${total_stages} ✓

Great work! Your mockup has successfully passed through the entire approval workflow and is now ready for use.

View approved mockup here: ${mockupUrl}

---
© ${new Date().getFullYear()} CardMock
  `;

  return sendEmail({
    to: to_email,
    subject,
    html,
    text
  });
}
