/**
 * Notification Creation Utilities
 * Helper functions for creating notifications in the system
 */

import { supabaseServer } from '@/lib/supabase-server';
import { logger } from './logger';

export type NotificationType =
  | 'approval_request'
  | 'approval_received'
  | 'comment'
  | 'stage_progress'
  | 'final_approval'
  | 'changes_requested';

export interface CreateNotificationParams {
  userId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  relatedAssetId?: string;
  relatedProjectId?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    const { error } = await supabaseServer.from('notifications').insert({
      user_id: params.userId,
      organization_id: params.organizationId,
      type: params.type,
      title: params.title,
      message: params.message,
      link_url: params.linkUrl,
      related_asset_id: params.relatedAssetId,
      related_project_id: params.relatedProjectId,
      metadata: params.metadata || {},
      is_read: false,
    });

    if (error) {
      logger.error('Failed to create notification', error, params);
      // Don't throw - notification creation failure shouldn't break the main flow
    } else {
      logger.info('Notification created successfully', {
        userId: params.userId,
        type: params.type,
      });
    }
  } catch (error) {
    logger.error('Error creating notification', error, params);
    // Don't throw - notification creation failure shouldn't break the main flow
  }
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationsForUsers(
  userIds: string[],
  organizationId: string,
  type: NotificationType,
  title: string,
  message: string,
  linkUrl?: string,
  relatedAssetId?: string,
  relatedProjectId?: string,
  metadata?: Record<string, any>
): Promise<void> {
  const notifications = userIds.map((userId) => ({
    user_id: userId,
    organization_id: organizationId,
    type,
    title,
    message,
    link_url: linkUrl,
    related_asset_id: relatedAssetId,
    related_project_id: relatedProjectId,
    metadata: metadata || {},
    is_read: false,
  }));

  try {
    const { error } = await supabaseServer
      .from('notifications')
      .insert(notifications);

    if (error) {
      logger.error('Failed to create notifications for users', error, {
        userIds,
        type,
      });
    } else {
      logger.info('Notifications created successfully', {
        count: userIds.length,
        type,
      });
    }
  } catch (error) {
    logger.error('Error creating notifications for users', error, {
      userIds,
      type,
    });
  }
}

