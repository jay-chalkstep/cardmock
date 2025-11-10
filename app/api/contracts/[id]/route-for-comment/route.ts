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
// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;

    // Validate contract ID format
    if (!id || !isValidUUID(id)) {
      logger.error('Invalid contract ID format', { id });
      return badRequestResponse('Invalid contract ID format');
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      logger.error('Failed to parse request body', { error: parseError });
      return badRequestResponse('Invalid JSON in request body');
    }

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
    if (!routing_method || typeof routing_method !== 'string' || !['email', 'slack', 'both'].includes(routing_method)) {
      return badRequestResponse('routing_method is required and must be "email", "slack", or "both"');
    }

    // Validate document_id if provided
    if (document_id !== undefined && document_id !== null) {
      if (typeof document_id !== 'string' || !isValidUUID(document_id)) {
        return badRequestResponse('document_id must be a valid UUID');
      }
    }

    // Validate recipients array if provided
    if (recipients !== undefined && recipients !== null) {
      if (!Array.isArray(recipients)) {
        return badRequestResponse('recipients must be an array of email addresses');
      }
      if (recipients.length > 0) {
        const invalidEmails = recipients.filter(email => typeof email !== 'string' || !isValidEmail(email));
        if (invalidEmails.length > 0) {
          return badRequestResponse(`Invalid email addresses: ${invalidEmails.join(', ')}`);
        }
      }
    }

    // Validate slack_channel_id if routing method includes Slack
    if ((routing_method === 'slack' || routing_method === 'both') && !slack_channel_id) {
      return badRequestResponse('slack_channel_id is required when routing_method includes "slack"');
    }
    if (slack_channel_id && typeof slack_channel_id !== 'string') {
      return badRequestResponse('slack_channel_id must be a string');
    }

    // Validate message if provided
    if (message !== undefined && message !== null) {
      if (typeof message !== 'string') {
        return badRequestResponse('message must be a string');
      }
      if (message.length > 5000) {
        return badRequestResponse('message must be 5000 characters or less');
      }
    }

    // Validate boolean flags
    if (typeof include_ai_summary !== 'boolean') {
      return badRequestResponse('include_ai_summary must be a boolean');
    }
    if (typeof use_saved_recipients !== 'boolean') {
      return badRequestResponse('use_saved_recipients must be a boolean');
    }

    // Check if contract exists and get creator info
    const { data: contract, error: contractError } = await supabaseServer
      .from('contracts')
      .select('id, contract_number, title, created_by, client_id, ai_summary')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (contractError) {
      logger.error('Error fetching contract', { error: contractError, contract_id: id, orgId });
      if (contractError.code === 'PGRST116') {
        return notFoundResponse('Contract not found');
      }
      return errorResponse(contractError, 'Failed to fetch contract');
    }

    if (!contract) {
      logger.warn('Contract not found', { contract_id: id, orgId });
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

      if (docError) {
        logger.error('Error fetching document', { error: docError, document_id, contract_id: id });
        if (docError.code === 'PGRST116') {
          return notFoundResponse('Document not found');
        }
        return errorResponse(docError, 'Failed to fetch document');
      }

      if (!doc) {
        logger.warn('Document not found', { document_id, contract_id: id });
        return notFoundResponse('Document not found');
      }

      // Validate document has required fields
      if (!doc.id) {
        logger.error('Document missing ID', { document_id: document_id, contract_id: id });
        return errorResponse(
          new Error('Document is missing ID'),
          'Document is invalid and cannot be routed'
        );
      }

      if (!doc.file_url || !doc.file_name) {
        logger.error('Document missing required fields', { document_id: doc.id, has_file_url: !!doc.file_url, has_file_name: !!doc.file_name });
        return errorResponse(
          new Error('Document is missing required fields (file_url or file_name)'),
          'Document is incomplete and cannot be routed'
        );
      }

      if (!doc.version_number || typeof doc.version_number !== 'number') {
        logger.error('Document missing version_number', { document_id: doc.id, version_number: doc.version_number });
        return errorResponse(
          new Error('Document is missing version_number'),
          'Document is incomplete and cannot be routed'
        );
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

      if (currentDocError) {
        logger.error('Error fetching current document', { error: currentDocError, contract_id: id });
        if (currentDocError.code === 'PGRST116') {
          return notFoundResponse('No current document found for this contract');
        }
        return errorResponse(currentDocError, 'Failed to fetch current document');
      }

      if (!currentDoc) {
        logger.warn('No current document found', { contract_id: id });
        return notFoundResponse('No current document found for this contract. Please upload a document first.');
      }

      // Validate document has required fields
      if (!currentDoc.id) {
        logger.error('Current document missing ID', { contract_id: id });
        return errorResponse(
          new Error('Current document is missing ID'),
          'Current document is invalid and cannot be routed'
        );
      }

      if (!currentDoc.file_url || !currentDoc.file_name) {
        logger.error('Current document missing required fields', { document_id: currentDoc.id, has_file_url: !!currentDoc.file_url, has_file_name: !!currentDoc.file_name });
        return errorResponse(
          new Error('Current document is missing required fields (file_url or file_name)'),
          'Current document is incomplete and cannot be routed'
        );
      }

      if (!currentDoc.version_number || typeof currentDoc.version_number !== 'number') {
        logger.error('Current document missing version_number', { document_id: currentDoc.id, version_number: currentDoc.version_number });
        return errorResponse(
          new Error('Current document is missing version_number'),
          'Current document is incomplete and cannot be routed'
        );
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
        logger.error('Error fetching saved recipients', { error: recipientsError, contract_id: id, orgId });
        // Don't fail if we can't fetch saved recipients, but log it
      } else if (savedRecipients && savedRecipients.length > 0) {
        // Validate and filter saved recipients
        finalRecipients = savedRecipients
          .filter(r => r.email && isValidEmail(r.email))
          .map(r => ({ 
            email: r.email.trim().toLowerCase(), 
            name: r.name ? r.name.trim() : undefined 
          }));
      }
    }

    // Add any additional recipients from request
    if (recipients && Array.isArray(recipients) && recipients.length > 0) {
      const additionalRecipients = recipients
        .filter(email => typeof email === 'string' && isValidEmail(email))
        .map(email => ({ email: email.trim().toLowerCase() }));
      
      // Merge with saved recipients, avoiding duplicates
      const existingEmails = new Set(finalRecipients.map(r => r.email.toLowerCase()));
      additionalRecipients.forEach(r => {
        if (!existingEmails.has(r.email.toLowerCase())) {
          finalRecipients.push(r);
        }
      });
    }

    // Validate we have recipients for email routing
    if (finalRecipients.length === 0 && (routing_method === 'email' || routing_method === 'both')) {
      logger.warn('No recipients available for email routing', { 
        contract_id: id, 
        use_saved_recipients, 
        provided_recipients: recipients?.length || 0 
      });
      return badRequestResponse('No recipients specified. Please add recipients in the request or configure saved recipients for this contract.');
    }

    // Validate recipient count limit (prevent abuse)
    if (finalRecipients.length > 50) {
      return badRequestResponse('Too many recipients. Maximum 50 recipients allowed per routing.');
    }

    // Get AI summary if available and requested
    let aiSummary: string | null = null;
    if (include_ai_summary) {
      try {
        // Try to get contract AI summary first
        if (contract.ai_summary && typeof contract.ai_summary === 'string' && contract.ai_summary.trim().length > 0) {
          aiSummary = contract.ai_summary.trim();
        } else {
          // Try to get document diff summary
          const { data: version, error: versionError } = await supabaseServer
            .from('contract_document_versions')
            .select('diff_summary')
            .eq('document_id', document.id)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

          if (versionError) {
            logger.debug('Error fetching document version for AI summary', { error: versionError, document_id: document.id });
          } else if (version?.diff_summary && typeof version.diff_summary === 'string' && version.diff_summary.trim().length > 0) {
            aiSummary = version.diff_summary.trim();
          }
        }
      } catch (summaryError) {
        logger.warn('Error fetching AI summary', { error: summaryError, contract_id: id, document_id: document.id });
        // Continue without AI summary if there's an error
      }
    }

    // Get client info for email
    let clientName = 'the client';
    if (contract.client_id) {
      try {
        const { data: client, error: clientError } = await supabaseServer
          .from('clients')
          .select('name')
          .eq('id', contract.client_id)
          .eq('organization_id', orgId)
          .single();
        
        if (clientError) {
          logger.debug('Error fetching client name', { error: clientError, client_id: contract.client_id });
        } else if (client?.name && typeof client.name === 'string') {
          clientName = client.name.trim();
        }
      } catch (clientError) {
        logger.warn('Error fetching client info', { error: clientError, client_id: contract.client_id });
        // Continue with default name if there's an error
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
    let emailErrors: string[] = [];
    if (routing_method === 'email' || routing_method === 'both') {
      logger.info('Starting email routing', {
        contract_id: id,
        contract_number: contract.contract_number,
        recipient_count: finalRecipients.length,
        has_ai_summary: !!aiSummary,
      });

      try {
        for (const recipient of finalRecipients) {
          try {
            logger.debug('Sending email to recipient', {
              email: recipient.email,
              name: recipient.name,
              contract_number: contract.contract_number,
            });

            // Validate document fields before sending
            if (!document.id || !document.file_name || !document.file_url || !document.version_number) {
              throw new Error('Document is missing required fields');
            }

            await sendContractRoutedForComment({
              to_email: recipient.email,
              to_name: recipient.name || recipient.email,
              contract_number: contract.contract_number,
              contract_id: id,
              contract_title: contract.title || undefined,
              client_name: clientName,
              document_id: document.id,
              document_name: document.file_name,
              document_url: document.file_url,
              version_owner: (document.version_owner as 'cdco' | 'client') || 'cdco',
              version_number: document.version_number,
              ai_summary: aiSummary || undefined,
              message: message || undefined,
              routed_by_name: routedByName,
            });

            logger.info('Email sent successfully to recipient', {
              email: recipient.email,
              contract_number: contract.contract_number,
            });
          } catch (recipientError) {
            const errorMessage = recipientError instanceof Error ? recipientError.message : 'Unknown error';
            emailErrors.push(`${recipient.email}: ${errorMessage}`);
            logger.error('Failed to send email to recipient', {
              error: errorMessage,
              email: recipient.email,
              contract_number: contract.contract_number,
            });
            // Continue with other recipients even if one fails
          }
        }

        if (emailErrors.length === 0) {
          emailSuccess = true;
          logger.info('All emails sent successfully', {
            contract_id: id,
            recipient_count: finalRecipients.length,
          });
        } else if (emailErrors.length < finalRecipients.length) {
          // Some succeeded, some failed
          logger.warn('Partial email success', {
            contract_id: id,
            successful: finalRecipients.length - emailErrors.length,
            failed: emailErrors.length,
            errors: emailErrors,
          });
          emailSuccess = true; // Consider it successful if at least one email sent
        } else {
          // All failed
          logger.error('All email sends failed', {
            contract_id: id,
            errors: emailErrors,
          });
          if (routing_method === 'email') {
            return errorResponse(
              new Error(`Failed to send emails to all recipients: ${emailErrors.join('; ')}`),
              `Failed to send emails. Errors: ${emailErrors.join('; ')}`
            );
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error in email routing process', {
          error: errorMessage,
          contract_id: id,
          contract_number: contract.contract_number,
        });
        // Continue with Slack if both methods requested
        if (routing_method === 'email') {
          return errorResponse(
            error,
            `Failed to send email routing: ${errorMessage}`
          );
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

        if (integrationError) {
          logger.error('Error fetching Slack integration', { error: integrationError, orgId });
          if (integrationError.code === 'PGRST116') {
            return errorResponse(new Error('Slack integration not found'), 'Slack integration not connected. Please connect Slack in Settings → Integrations.');
          }
          return errorResponse(integrationError, 'Failed to fetch Slack integration');
        }

        if (!integration) {
          logger.warn('Slack integration not found', { orgId });
          return errorResponse(new Error('Slack integration not found'), 'Slack integration not connected. Please connect Slack in Settings → Integrations.');
        }

        if (!integration.bot_token_encrypted) {
          logger.error('Slack integration missing bot_token_encrypted', { integration_id: integration.id, orgId });
          return errorResponse(
            new Error('Slack integration is incomplete'),
            'Slack integration is incomplete. Please reconnect Slack in Settings → Integrations.'
          );
        }

        // Decrypt bot token
        let botToken: string;
        try {
          const credentials = decryptCredentials(integration.bot_token_encrypted);
          if (!credentials.bot_token || typeof credentials.bot_token !== 'string') {
            logger.error('Decrypted credentials missing bot_token', { integration_id: integration.id });
            return errorResponse(
              new Error('Slack bot token not found in credentials'),
              'Slack integration credentials are invalid. Please reconnect Slack in Settings → Integrations.'
            );
          }
          botToken = credentials.bot_token;
        } catch (decryptError) {
          const errorMessage = decryptError instanceof Error ? decryptError.message : 'Unknown error';
          logger.error('Failed to decrypt Slack bot token', {
            error: errorMessage,
            integration_id: integration.id,
            orgId,
          });
          return errorResponse(
            decryptError instanceof Error ? decryptError : new Error(errorMessage),
            'Failed to decrypt Slack credentials. Please reconnect Slack in Settings → Integrations.'
          );
        }

        // Validate document fields before building Slack message
        if (!document.id || !document.file_name || !document.version_number) {
          throw new Error('Document is missing required fields for Slack routing');
        }

        // Build Slack message
        const versionOwnerLabel = (document.version_owner === 'client' ? "Client's Version" : "CDCO's Version");
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
        let slackResponse: Response;
        try {
          slackResponse = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${botToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(slackMessage),
          });
        } catch (fetchError) {
          const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error';
          logger.error('Failed to send Slack API request', {
            error: errorMessage,
            contract_id: id,
            slack_channel_id,
          });
          if (routing_method === 'slack') {
            return errorResponse(
              fetchError instanceof Error ? fetchError : new Error(errorMessage),
              `Failed to connect to Slack API: ${errorMessage}`
            );
          }
          // Continue if both methods requested
          throw fetchError;
        }

        let slackData: any;
        try {
          slackData = await slackResponse.json();
        } catch (parseError) {
          const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
          logger.error('Failed to parse Slack API response', {
            error: errorMessage,
            status: slackResponse.status,
            statusText: slackResponse.statusText,
          });
          if (routing_method === 'slack') {
            return errorResponse(
              parseError instanceof Error ? parseError : new Error(errorMessage),
              'Failed to parse Slack API response'
            );
          }
          // Continue if both methods requested
          throw parseError;
        }

        if (!slackData.ok) {
          const slackError = slackData.error || 'Unknown Slack error';
          logger.error('Slack API returned error', {
            error: slackError,
            contract_id: id,
            slack_channel_id,
            response: slackData,
          });
          if (routing_method === 'slack') {
            return errorResponse(
              new Error(slackError),
              `Failed to send Slack notification: ${slackError}`
            );
          }
        } else {
          slackSuccess = true;
          slackMessageTs = slackData.ts;
          logger.info('Slack message sent successfully', {
            contract_id: id,
            slack_channel_id,
            message_ts: slackMessageTs,
          });
        }
      } catch (error) {
        logger.error('Error sending Slack routing:', error);
        if (routing_method === 'slack') {
          return errorResponse(error, 'Failed to send Slack routing');
        }
      }
    }

    // Create routing event record
    let routingEvent = null;
    try {
      const { data: event, error: eventError } = await supabaseServer
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
        logger.error('Error creating routing event', {
          error: eventError,
          contract_id: id,
          document_id: document.id,
        });
        // Don't fail the request if event creation fails, but log it
      } else {
        routingEvent = event;
        logger.debug('Routing event created successfully', { event_id: event?.id });
      }
    } catch (eventError) {
      logger.error('Unexpected error creating routing event', {
        error: eventError instanceof Error ? eventError.message : String(eventError),
        contract_id: id,
      });
      // Don't fail the request if event creation fails
    }

    // Record Slack notification event if Slack was used
    if (slackSuccess && slackMessageTs) {
      try {
        const { data: slackIntegration, error: slackIntegrationError } = await supabaseServer
          .from('slack_integrations')
          .select('id')
          .eq('organization_id', orgId)
          .single();

        if (slackIntegrationError) {
          logger.warn('Error fetching Slack integration for notification event', {
            error: slackIntegrationError,
            orgId,
          });
        } else if (slackIntegration) {
          const { error: notificationError } = await supabaseServer
            .from('slack_notification_events')
            .insert({
              integration_id: slackIntegration.id,
              channel_id: slack_channel_id,
              message_ts: slackMessageTs,
              event_type: 'contract_routed',
              status: 'sent',
            });

          if (notificationError) {
            logger.warn('Error recording Slack notification event', {
              error: notificationError,
              integration_id: slackIntegration.id,
            });
          } else {
            logger.debug('Slack notification event recorded', {
              integration_id: slackIntegration.id,
              message_ts: slackMessageTs,
            });
          }
        }
      } catch (notificationError) {
        logger.warn('Unexpected error recording Slack notification event', {
          error: notificationError instanceof Error ? notificationError.message : String(notificationError),
        });
        // Don't fail the request if notification event recording fails
      }
    }

    // Validate that at least one routing method succeeded
    if (!emailSuccess && !slackSuccess) {
      logger.error('All routing methods failed', {
        contract_id: id,
        routing_method,
        email_success: emailSuccess,
        slack_success: slackSuccess,
      });
      return errorResponse(
        new Error('Failed to route contract via any method'),
        'Failed to route contract. Please check your email and Slack configurations.'
      );
    }

    // Return success response with details
    return successResponse({
      routing_event: routingEvent || null,
      email_sent: emailSuccess,
      slack_sent: slackSuccess,
      recipients_count: finalRecipients.length,
      message: emailSuccess && slackSuccess 
        ? 'Contract routed successfully via email and Slack'
        : emailSuccess 
        ? 'Contract routed successfully via email'
        : 'Contract routed successfully via Slack',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Unexpected error in route-for-comment endpoint', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return errorResponse(error, 'Failed to route contract for comment');
  }
}

