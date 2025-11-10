import { NextRequest } from 'next/server';
import { getAuthContext, isAdmin } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { sendContractRoutedForComment } from '@/lib/email/contract-notifications';
import { decryptCredentials } from '@/lib/integrations/encryption';
import { clerkClient } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/contracts/[id]/route-for-comment
 *
 * Route a contract document for comment/feedback to stakeholders
 *
 * Body:
 * {
 *   document_id?: string, // Optional, defaults to current document
 *   routing_method: 'email' | 'slack' | 'both',
 *   recipients?: string[], // Email addresses (if not using saved list)
 *   slack_channel_id?: string, // Required if routing_method includes 'slack'
 *   message?: string, // Optional custom message
 *   include_ai_summary?: boolean, // Default true
 *   use_saved_recipients?: boolean // Default true
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;
    const body = await request.json();
    const { 
      document_id, 
      routing_method, 
      recipients, 
      slack_channel_id, 
      message, 
      include_ai_summary = true,
      use_saved_recipients = true
    } = body;

    logger.api(`/api/contracts/${id}/route-for-comment`, 'POST', { orgId, userId, routing_method });

    // Validate routing method
    if (!routing_method || !['email', 'slack', 'both'].includes(routing_method)) {
      return badRequestResponse('routing_method must be "email", "slack", or "both"');
    }

    // Check if contract exists and get creator info
    const { data: contract, error: contractError } = await supabaseServer
      .from('contracts')
      .select('id, contract_number, title, created_by, client_id, ai_summary')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (contractError || !contract) {
      return notFoundResponse('Contract not found');
    }

    // Check permissions - only creator or admin can route
    const userIsAdmin = await isAdmin();
    const canRoute = contract.created_by === userId || userIsAdmin;

    if (!canRoute) {
      return forbiddenResponse('You do not have permission to route this contract. Only the creator or an admin can route contracts.');
    }

    // Get document (current or specified)
    let document;
    if (document_id) {
      const { data: doc, error: docError } = await supabaseServer
        .from('contract_documents')
        .select('*')
        .eq('id', document_id)
        .eq('contract_id', id)
        .single();

      if (docError || !doc) {
        return notFoundResponse('Document not found');
      }
      document = doc;
    } else {
      // Get current document
      const { data: currentDoc, error: currentDocError } = await supabaseServer
        .from('contract_documents')
        .select('*')
        .eq('contract_id', id)
        .eq('is_current', true)
        .single();

      if (currentDocError || !currentDoc) {
        return notFoundResponse('No current document found for this contract');
      }
      document = currentDoc;
    }

    // Get recipients list
    let finalRecipients: Array<{ email: string; name?: string }> = [];

    if (use_saved_recipients) {
      // Get saved recipients
      const { data: savedRecipients, error: recipientsError } = await supabaseServer
        .from('contract_routing_recipients')
        .select('email, name')
        .eq('contract_id', id)
        .eq('organization_id', orgId);

      if (recipientsError) {
        logger.error('Error fetching saved recipients:', recipientsError);
      } else if (savedRecipients && savedRecipients.length > 0) {
        finalRecipients = savedRecipients.map(r => ({ email: r.email, name: r.name || undefined }));
      }
    }

    // Add any additional recipients from request
    if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      const additionalRecipients = recipients
        .filter(email => typeof email === 'string' && email.includes('@'))
        .map(email => ({ email: email.trim() }));
      
      // Merge with saved recipients, avoiding duplicates
      const existingEmails = new Set(finalRecipients.map(r => r.email.toLowerCase()));
      additionalRecipients.forEach(r => {
        if (!existingEmails.has(r.email.toLowerCase())) {
          finalRecipients.push(r);
        }
      });
    }

    if (finalRecipients.length === 0 && (routing_method === 'email' || routing_method === 'both')) {
      return badRequestResponse('No recipients specified. Please add recipients or use saved recipients.');
    }

    // Get AI summary if available and requested
    let aiSummary: string | null = null;
    if (include_ai_summary) {
      // Try to get contract AI summary first
      if (contract.ai_summary) {
        aiSummary = contract.ai_summary;
      } else {
        // Try to get document diff summary
        const { data: version } = await supabaseServer
          .from('contract_document_versions')
          .select('diff_summary')
          .eq('document_id', document.id)
          .order('version_number', { ascending: false })
          .limit(1)
          .single();

        if (version?.diff_summary) {
          aiSummary = version.diff_summary;
        }
      }
    }

    // Get client info for email
    let clientName = 'the client';
    if (contract.client_id) {
      const { data: client } = await supabaseServer
        .from('clients')
        .select('name')
        .eq('id', contract.client_id)
        .single();
      if (client) {
        clientName = client.name;
      }
    }

    // Get routed_by user info from Clerk
    let routedByName = 'Unknown User';
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      routedByName = user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Unknown User';
    } catch (error) {
      logger.error('Error fetching user from Clerk:', error);
    }

    // Route via email if requested
    let emailSuccess = false;
    if (routing_method === 'email' || routing_method === 'both') {
      try {
        for (const recipient of finalRecipients) {
          await sendContractRoutedForComment({
            to_email: recipient.email,
            to_name: recipient.name || recipient.email,
            contract_number: contract.contract_number,
            contract_id: id,
            contract_title: contract.title,
            client_name: clientName,
            document_id: document.id,
            document_name: document.file_name,
            document_url: document.file_url,
            version_owner: document.version_owner || 'cdco',
            version_number: document.version_number,
            ai_summary: aiSummary,
            message: message,
            routed_by_name: routedByName,
          });
        }
        emailSuccess = true;
      } catch (error) {
        logger.error('Error sending email routing:', error);
        // Continue with Slack if both methods requested
        if (routing_method === 'email') {
          return errorResponse(error, 'Failed to send email routing');
        }
      }
    }

    // Route via Slack if requested
    let slackSuccess = false;
    let slackMessageTs: string | null = null;
    if (routing_method === 'slack' || routing_method === 'both') {
      if (!slack_channel_id) {
        return badRequestResponse('slack_channel_id is required when routing_method includes "slack"');
      }

      try {
        // Get Slack integration
        const { data: integration, error: integrationError } = await supabaseServer
          .from('slack_integrations')
          .select('*')
          .eq('organization_id', orgId)
          .single();

        if (integrationError || !integration) {
          return errorResponse(new Error('Slack integration not found'), 'Slack integration not connected');
        }

        // Decrypt bot token
        const credentials = decryptCredentials(integration.bot_token_encrypted);
        const botToken = credentials.bot_token as string;

        // Build Slack message
        const versionOwnerLabel = document.version_owner === 'client' ? "Client's Version" : "CDCO's Version";
        const slackMessage: any = {
          channel: slack_channel_id,
          text: `Contract ${contract.contract_number} routed for comment`,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '📄 Contract Routed for Comment',
                emoji: true
              }
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Contract:*\n${contract.contract_number}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Version:*\nv${document.version_number}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Version Owner:*\n${versionOwnerLabel}`
                },
                {
                  type: 'mrkdwn',
                  text: `*Client:*\n${clientName}`
                }
              ]
            }
          ]
        };

        // Add AI summary if available
        if (aiSummary) {
          slackMessage.blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*AI Summary:*\n${aiSummary.substring(0, 1000)}${aiSummary.length > 1000 ? '...' : ''}`
            }
          });
        }

        // Add custom message if provided
        if (message) {
          slackMessage.blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Message from ${routedByName}:*\n${message}`
            }
          });
        }

        // Add document link button
        const documentUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/contracts/${id}`;
        slackMessage.blocks.push({
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Contract'
              },
              url: documentUrl,
              style: 'primary'
            }
          ]
        });

        // Send message to Slack
        const slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${botToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(slackMessage),
        });

        const slackData = await slackResponse.json();

        if (!slackData.ok) {
          logger.error('Failed to send Slack message', { error: slackData.error });
          if (routing_method === 'slack') {
            return errorResponse(new Error(slackData.error), 'Failed to send Slack notification');
          }
        } else {
          slackSuccess = true;
          slackMessageTs = slackData.ts;
        }
      } catch (error) {
        logger.error('Error sending Slack routing:', error);
        if (routing_method === 'slack') {
          return errorResponse(error, 'Failed to send Slack routing');
        }
      }
    }

    // Create routing event record
    const { data: routingEvent, error: eventError } = await supabaseServer
      .from('contract_routing_events')
      .insert({
        contract_id: id,
        document_id: document.id,
        routed_by: userId,
        routing_method: routing_method,
        recipients: finalRecipients,
        slack_channel_id: routing_method === 'slack' || routing_method === 'both' ? slack_channel_id : null,
        message: message || null,
        ai_summary_included: include_ai_summary,
        organization_id: orgId,
      })
      .select()
      .single();

    if (eventError) {
      logger.error('Error creating routing event:', eventError);
      // Don't fail the request if event creation fails, but log it
    }

    // Record Slack notification event if Slack was used
    if (slackSuccess && slackMessageTs) {
      const { data: slackIntegration } = await supabaseServer
        .from('slack_integrations')
        .select('id')
        .eq('organization_id', orgId)
        .single();

      if (slackIntegration) {
        await supabaseServer
          .from('slack_notification_events')
          .insert({
            integration_id: slackIntegration.id,
            channel_id: slack_channel_id,
            message_ts: slackMessageTs,
            event_type: 'contract_routed',
            status: 'sent',
          });
      }
    }

    return successResponse({
      routing_event: routingEvent,
      email_sent: emailSuccess,
      slack_sent: slackSuccess,
      recipients_count: finalRecipients.length,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to route contract for comment');
  }
}

