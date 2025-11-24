import { sendEmail } from './sendgrid';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface UserApprovalNotificationOptions {
  to_email: string;
  to_name: string;
  mockup_name: string;
  mockup_id: string;
  project_name: string;
  stage_name: string;
  stage_order: number;
  approved_by_name: string;
  approvals_received: number;
  approvals_required: number;
}

/**
 * Notify other reviewers when someone approves
 */
export async function sendUserApprovalNotification({
  to_email,
  to_name,
  mockup_name,
  mockup_id,
  project_name,
  stage_name,
  stage_order,
  approved_by_name,
  approvals_received,
  approvals_required
}: UserApprovalNotificationOptions) {
  const mockupUrl = `${APP_URL}/mockups/${mockup_id}`;
  const subject = `✓ Progress Update: ${mockup_name}`;
  const percentage = Math.round((approvals_received / approvals_required) * 100);

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
        .progress-box {
          background: #dbeafe;
          border-left: 4px solid #3b82f6;
          padding: 20px;
          margin: 20px 0;
        }
        .progress-bar {
          background: #e5e7eb;
          height: 24px;
          border-radius: 12px;
          overflow: hidden;
          margin: 10px 0;
        }
        .progress-fill {
          background: linear-gradient(90deg, #3b82f6, #1d4ed8);
          height: 100%;
          width: ${percentage}%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 600;
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
        <h1>✓ Approval Progress Update</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <p><strong>${approved_by_name}</strong> has approved the mockup at the <strong>${stage_name}</strong> stage.</p>

        <div class="info-box">
          <strong>Mockup:</strong> ${mockup_name}<br>
          <strong>Project:</strong> ${project_name}<br>
          <strong>Stage:</strong> ${stage_order} - ${stage_name}
        </div>

        <div class="progress-box">
          <strong>Stage Progress: ${approvals_received} of ${approvals_required} approvals</strong>
          <div class="progress-bar">
            <div class="progress-fill">${percentage}%</div>
          </div>
          <p style="margin: 10px 0 0 0; font-size: 14px;">
            ${approvals_required - approvals_received} more approval${approvals_required - approvals_received === 1 ? '' : 's'} needed to advance to next stage
          </p>
        </div>

        <p>Your review is still pending. Please review when you have a chance.</p>

        <div style="text-align: center;">
          <a href="${mockupUrl}" class="button">Review Now</a>
        </div>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          All assigned reviewers must approve before the mockup can advance to the next stage.
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} CardMock. All rights reserved.</p>
        <p>Powered by Choice Digital</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Approval Progress Update

Hi ${to_name},

${approved_by_name} has approved the mockup at the ${stage_name} stage.

Mockup: ${mockup_name}
Project: ${project_name}
Stage: ${stage_order} - ${stage_name}

Stage Progress: ${approvals_received} of ${approvals_required} approvals (${percentage}%)
${approvals_required - approvals_received} more approval(s) needed to advance to next stage

Your review is still pending. Please review when you have a chance.

Review mockup here: ${mockupUrl}

---
© ${new Date().getFullYear()} CardMock
Powered by Choice Digital
  `;

  return sendEmail({
    to: to_email,
    subject,
    html,
    text
  });
}

interface StageCompleteNotificationOptions {
  to_email: string;
  to_name: string;
  mockup_name: string;
  mockup_id: string;
  project_name: string;
  completed_stage_name: string;
  completed_stage_order: number;
  next_stage_name: string;
  next_stage_order: number;
}

/**
 * Notify next stage reviewers when previous stage completes
 */
export async function sendStageCompleteNotification({
  to_email,
  to_name,
  mockup_name,
  mockup_id,
  project_name,
  completed_stage_name,
  completed_stage_order,
  next_stage_name,
  next_stage_order
}: StageCompleteNotificationOptions) {
  const mockupUrl = `${APP_URL}/mockups/${mockup_id}`;
  const subject = `[Stage ${next_stage_order}] Review Requested: ${mockup_name}`;

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
        .info-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .info-box strong {
          color: #10b981;
        }
        .stage-progression {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin: 20px 0;
          font-size: 14px;
        }
        .stage-complete {
          background: #d1fae5;
          color: #065f46;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
        }
        .stage-arrow {
          color: #10b981;
          font-size: 20px;
        }
        .stage-current {
          background: #3b82f6;
          color: white;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: 600;
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
        <h1>✓ Stage Completed - Your Review Needed</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <p>A mockup has advanced to your review stage after completing the previous stage.</p>

        <div class="info-box">
          <strong>Mockup:</strong> ${mockup_name}<br>
          <strong>Project:</strong> ${project_name}
        </div>

        <div class="stage-progression">
          <span class="stage-complete">✓ Stage ${completed_stage_order}: ${completed_stage_name}</span>
          <span class="stage-arrow">→</span>
          <span class="stage-current">Stage ${next_stage_order}: ${next_stage_name}</span>
        </div>

        <p>All reviewers from the previous stage have approved. It's now ready for your review at the <strong>${next_stage_name}</strong> stage.</p>

        <div style="text-align: center;">
          <a href="${mockupUrl}" class="button">Review Mockup Now</a>
        </div>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          You're receiving this because you're assigned as a reviewer for this workflow stage.
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} CardMock. All rights reserved.</p>
        <p>Powered by Choice Digital</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Stage Completed - Your Review Needed

Hi ${to_name},

A mockup has advanced to your review stage after completing the previous stage.

Mockup: ${mockup_name}
Project: ${project_name}

✓ Stage ${completed_stage_order}: ${completed_stage_name} → Stage ${next_stage_order}: ${next_stage_name}

All reviewers from the previous stage have approved. It's now ready for your review at the ${next_stage_name} stage.

Review mockup here: ${mockupUrl}

---
© ${new Date().getFullYear()} CardMock
Powered by Choice Digital
  `;

  return sendEmail({
    to: to_email,
    subject,
    html,
    text
  });
}

interface FinalApprovalNeededNotificationOptions {
  to_email: string;
  to_name: string;
  mockup_name: string;
  mockup_id: string;
  project_name: string;
  total_stages: number;
}

/**
 * Notify project owner that final approval is needed
 */
export async function sendFinalApprovalNeededNotification({
  to_email,
  to_name,
  mockup_name,
  mockup_id,
  project_name,
  total_stages
}: FinalApprovalNeededNotificationOptions) {
  const mockupUrl = `${APP_URL}/mockups/${mockup_id}`;
  const subject = `👑 Final Approval Needed: ${mockup_name}`;

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
          background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
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
        .info-box {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .info-box strong {
          color: #a855f7;
        }
        .crown-box {
          background: linear-gradient(135deg, #faf5ff 0%, #dbeafe 100%);
          border: 2px solid #a855f7;
          padding: 25px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
        }
        .crown-box .crown {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .stages-complete {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          margin: 15px 0;
        }
        .stage-dot {
          width: 32px;
          height: 8px;
          background: #10b981;
          border-radius: 4px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
          color: white !important;
          text-decoration: none;
          padding: 14px 35px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
          font-size: 16px;
        }
        .button:hover {
          background: linear-gradient(135deg, #9333ea 0%, #2563eb 100%);
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
        <h1>👑 Final Approval Needed</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <div class="crown-box">
          <div class="crown">👑</div>
          <h2 style="margin: 10px 0; color: #a855f7;">All Workflow Stages Complete!</h2>
          <p style="margin: 10px 0; color: #6b7280;">As the project owner, your final approval is required.</p>
        </div>

        <div class="info-box">
          <strong>Mockup:</strong> ${mockup_name}<br>
          <strong>Project:</strong> ${project_name}<br>
          <strong>Workflow Progress:</strong> ${total_stages}/${total_stages} stages approved ✓
        </div>

        <div class="stages-complete">
          ${Array.from({ length: total_stages }).map(() => '<div class="stage-dot"></div>').join('')}
        </div>

        <p>This mockup has successfully passed through all ${total_stages} workflow stages and received approval from all assigned reviewers.</p>

        <p><strong>As the project owner, you have the final say.</strong> Please review the asset and provide your approval to mark it as complete and ready for use.</p>

        <div style="text-align: center;">
          <a href="${mockupUrl}" class="button">👑 Give Final Approval</a>
        </div>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          Your final approval will mark this asset as fully approved and ready for production/delivery.
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} CardMock. All rights reserved.</p>
        <p>Powered by Choice Digital</p>
      </div>
    </body>
    </html>
  `;

  const text = `
👑 Final Approval Needed

Hi ${to_name},

All Workflow Stages Complete!
As the project owner, your final approval is required.

Mockup: ${mockup_name}
Project: ${project_name}
Workflow Progress: ${total_stages}/${total_stages} stages approved ✓

This mockup has successfully passed through all ${total_stages} workflow stages and received approval from all assigned reviewers.

As the project owner, you have the final say. Please review the asset and provide your approval to mark it as complete and ready for use.

Give final approval here: ${mockupUrl}

---
© ${new Date().getFullYear()} CardMock
Powered by Choice Digital
  `;

  return sendEmail({
    to: to_email,
    subject,
    html,
    text
  });
}

interface FinalApprovalCompleteNotificationOptions {
  to_email: string;
  to_name: string;
  mockup_name: string;
  mockup_id: string;
  project_name: string;
  approved_by_name: string;
  total_stages: number;
}

/**
 * Notify stakeholders when asset receives final approval
 */
export async function sendFinalApprovalCompleteNotification({
  to_email,
  to_name,
  mockup_name,
  mockup_id,
  project_name,
  approved_by_name,
  total_stages
}: FinalApprovalCompleteNotificationOptions) {
  const mockupUrl = `${APP_URL}/mockups/${mockup_id}`;
  const subject = `🎉 Fully Approved: ${mockup_name}`;

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
          background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
          color: white;
          padding: 40px 20px;
          border-radius: 8px 8px 0 0;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .celebration-box {
          background: linear-gradient(135deg, #d1fae5 0%, #dbeafe 100%);
          border: 3px solid #10b981;
          padding: 30px;
          border-radius: 8px;
          text-align: center;
          margin: 20px 0;
        }
        .celebration-box .emoji {
          font-size: 64px;
          margin-bottom: 15px;
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
        .checkmark-list {
          list-style: none;
          padding: 0;
          margin: 20px 0;
        }
        .checkmark-list li {
          padding: 8px 0;
          padding-left: 30px;
          position: relative;
        }
        .checkmark-list li:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #10b981;
          font-weight: bold;
          font-size: 18px;
        }
        .button {
          display: inline-block;
          background: #10b981;
          color: white !important;
          text-decoration: none;
          padding: 14px 35px;
          border-radius: 6px;
          margin: 20px 0;
          font-weight: 600;
          font-size: 16px;
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
        <h1>🎉 Fully Approved!</h1>
      </div>

      <div class="content">
        <p>Hi ${to_name},</p>

        <div class="celebration-box">
          <div class="emoji">🎉</div>
          <h2 style="margin: 10px 0; color: #10b981;">Asset Ready for Production!</h2>
          <p style="margin: 10px 0; color: #1f2937; font-size: 18px;">
            <strong>"${mockup_name}"</strong> has received final approval
          </p>
        </div>

        <div class="info-box">
          <strong>Mockup:</strong> ${mockup_name}<br>
          <strong>Project:</strong> ${project_name}<br>
          <strong>Final Approval By:</strong> ${approved_by_name} (Project Owner)<br>
          <strong>Total Stages Completed:</strong> ${total_stages}
        </div>

        <p>This asset has successfully completed the entire approval workflow:</p>

        <ul class="checkmark-list">
          <li>Passed all ${total_stages} workflow stages</li>
          <li>Approved by all assigned reviewers</li>
          <li>Received final approval from project owner</li>
          <li>Ready for production/delivery</li>
        </ul>

        <div style="text-align: center;">
          <a href="${mockupUrl}" class="button">View Approved Asset</a>
        </div>

        <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 14px;">
          Congratulations on completing the approval process! This asset can now be downloaded and used with confidence.
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} CardMock. All rights reserved.</p>
        <p>Powered by Choice Digital</p>
      </div>
    </body>
    </html>
  `;

  const text = `
🎉 Fully Approved!

Hi ${to_name},

Asset Ready for Production!
"${mockup_name}" has received final approval

Mockup: ${mockup_name}
Project: ${project_name}
Final Approval By: ${approved_by_name} (Project Owner)
Total Stages Completed: ${total_stages}

This asset has successfully completed the entire approval workflow:
✓ Passed all ${total_stages} workflow stages
✓ Approved by all assigned reviewers
✓ Received final approval from project owner
✓ Ready for production/delivery

View approved asset here: ${mockupUrl}

Congratulations on completing the approval process! This asset can now be downloaded and used with confidence.

---
© ${new Date().getFullYear()} CardMock
Powered by Choice Digital
  `;

  return sendEmail({
    to: to_email,
    subject,
    html,
    text
  });
}
