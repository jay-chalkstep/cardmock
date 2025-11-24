import { NextRequest } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/clerk
 *
 * Handle Clerk webhook events for user creation and organization membership changes
 * Automatically assigns clients to Client-role users if possible
 *
 * Events handled:
 * - user.created
 * - organizationMembership.created
 * - organizationMembership.updated
 */
export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error('CLERK_WEBHOOK_SECRET not configured');
      return errorResponse(
        new Error('Webhook secret not configured'),
        'Webhook secret not configured'
      );
    }

    // Get headers
    const headerPayload = await headers();
    const svixId = headerPayload.get('svix-id');
    const svixTimestamp = headerPayload.get('svix-timestamp');
    const svixSignature = headerPayload.get('svix-signature');

    if (!svixId || !svixTimestamp || !svixSignature) {
      return badRequestResponse('Missing svix headers');
    }

    // Get request body
    const payload = await request.json();

    // Verify webhook signature
    const wh = new Webhook(webhookSecret);
    let evt: any;

    try {
      evt = wh.verify(JSON.stringify(payload), {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      });
    } catch (err) {
      logger.error('Webhook signature verification failed', err);
      return badRequestResponse('Invalid webhook signature');
    }

    const eventType = evt.type;
    logger.info('Clerk webhook received', { eventType, data: evt.data });

    // Handle different event types
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;

      case 'organizationMembership.created':
        await handleMembershipCreated(evt.data);
        break;

      case 'organizationMembership.updated':
        await handleMembershipUpdated(evt.data);
        break;

      default:
        logger.info('Unhandled webhook event type', { eventType });
    }

    return successResponse({ received: true });
  } catch (error) {
    logger.error('Error processing Clerk webhook', error);
    return errorResponse(error, 'Failed to process webhook');
  }
}

/**
 * Handle user.created event
 * Check if user has Client role and needs client assignment
 */
async function handleUserCreated(data: any) {
  try {
    const userId = data.id;
    const emailAddresses = data.email_addresses || [];
    const primaryEmail = emailAddresses.find((e: any) => e.id === data.primary_email_address_id)?.email_address;

    logger.info('User created', { userId, primaryEmail });

    // Note: At this point, user might not have organization membership yet
    // We'll handle client assignment in organizationMembership.created/updated events
  } catch (error) {
    logger.error('Error handling user.created event', error);
  }
}

/**
 * Handle organizationMembership.created event
 * Check if user has Client role and assign client if possible
 */
async function handleMembershipCreated(data: any) {
  try {
    const userId = data.public_user_data?.user_id;
    const organizationId = data.organization?.id;
    const role = data.role;

    if (!userId || !organizationId) {
      logger.warn('Missing user or organization ID in membership.created event', { data });
      return;
    }

    logger.info('Organization membership created', { userId, organizationId, role });

    // Check if user has Client role
    if (role === 'org:client') {
      await checkAndAssignClient(userId, organizationId);
    }
  } catch (error) {
    logger.error('Error handling organizationMembership.created event', error);
  }
}

/**
 * Handle organizationMembership.updated event
 * Check if role changed to Client and assign client if possible
 */
async function handleMembershipUpdated(data: any) {
  try {
    const userId = data.public_user_data?.user_id;
    const organizationId = data.organization?.id;
    const role = data.role;

    if (!userId || !organizationId) {
      logger.warn('Missing user or organization ID in membership.updated event', { data });
      return;
    }

    logger.info('Organization membership updated', { userId, organizationId, role });

    // Check if user has Client role
    if (role === 'org:client') {
      await checkAndAssignClient(userId, organizationId);
    }
  } catch (error) {
    logger.error('Error handling organizationMembership.updated event', error);
  }
}

/**
 * Check if user needs client assignment and assign if possible
 * Tries to auto-assign based on email domain matching
 */
async function checkAndAssignClient(userId: string, organizationId: string) {
  try {
    // Check if user already has a client assigned
    const { data: existingAssignment } = await supabaseServer
      .from('client_users')
      .select('id, client_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (existingAssignment) {
      logger.info('User already has client assigned', { userId, clientId: existingAssignment.client_id });
      return;
    }

    // Get user email from Clerk (dynamic import to avoid Edge Runtime issues)
    const { clerkClient } = await import('@clerk/nextjs/server');
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress;

    if (!primaryEmail) {
      logger.warn('User has Client role but no email address', { userId });
      // Create notification for admin to assign client
      await createClientAssignmentNotification(userId, organizationId);
      return;
    }

    // Extract domain from email
    const emailDomain = primaryEmail.split('@')[1]?.toLowerCase();

    if (!emailDomain) {
      logger.warn('Could not extract domain from email', { userId, primaryEmail });
      await createClientAssignmentNotification(userId, organizationId);
      return;
    }

    // Try to find client with matching email domain
    const { data: matchingClients } = await supabaseServer
      .from('clients')
      .select('id, name, email')
      .eq('organization_id', organizationId)
      .ilike('email', `%@${emailDomain}`)
      .limit(1);

    if (matchingClients && matchingClients.length > 0) {
      const client = matchingClients[0];
      // Auto-assign client
      const { error: assignError } = await supabaseServer
        .from('client_users')
        .insert({
          client_id: client.id,
          user_id: userId,
          organization_id: organizationId,
          assigned_by: 'system', // System assignment
        });

      if (assignError) {
        logger.error('Failed to auto-assign client', assignError, { userId, clientId: client.id });
        await createClientAssignmentNotification(userId, organizationId);
      } else {
        logger.info('Auto-assigned client to user', { userId, clientId: client.id, clientName: client.name });
      }
    } else {
      // No matching client found - create notification for admin
      logger.info('No matching client found for user', { userId, emailDomain });
      await createClientAssignmentNotification(userId, organizationId);
    }
  } catch (error) {
    logger.error('Error checking and assigning client', error, { userId, organizationId });
  }
}

/**
 * Create a notification for admin to assign client to user
 * This would typically create a notification in the notifications table
 */
async function createClientAssignmentNotification(userId: string, organizationId: string) {
  try {
    // Get user details from Clerk (dynamic import to avoid Edge Runtime issues)
    const { clerkClient } = await import('@clerk/nextjs/server');
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const userName = user.fullName || user.firstName || user.emailAddresses[0]?.emailAddress || 'Unknown User';

    // Create notification for admins
    // Note: This assumes notifications table exists and has appropriate structure
    // You may need to adjust this based on your notification system
    const { error: notifError } = await supabaseServer
      .from('notifications')
      .insert({
        user_id: userId, // Notify the user themselves
        organization_id: organizationId,
        type: 'client_assignment_required',
        title: 'Client Assignment Required',
        message: `User ${userName} has Client role but no client assigned. Please assign a client.`,
        metadata: {
          user_id: userId,
          user_name: userName,
          requires_action: true,
        },
      });

    if (notifError) {
      logger.error('Failed to create client assignment notification', notifError);
    } else {
      logger.info('Created client assignment notification', { userId, organizationId });
    }
  } catch (error) {
    logger.error('Error creating client assignment notification', error);
  }
}

