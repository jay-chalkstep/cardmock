/**
 * Integration status tracking utilities
 * Tracks integration health and status
 */

import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export interface IntegrationStatus {
  integrationType: string;
  organizationId: string;
  userId?: string;
  isConnected: boolean;
  lastSyncAt?: string;
  errorCount: number;
  lastError?: string;
}

/**
 * Record an integration event
 */
export async function recordIntegrationEvent(
  integrationType: string,
  organizationId: string,
  eventType: string,
  payload: Record<string, unknown>,
  status: 'success' | 'error' | 'pending' = 'success',
  errorMessage?: string
): Promise<void> {
  try {
    await supabaseServer
      .from('integration_events')
      .insert({
        integration_type: integrationType,
        organization_id: organizationId,
        event_type: eventType,
        payload_jsonb: payload,
        status,
        error_message: errorMessage,
      });
  } catch (error) {
    logger.error('Failed to record integration event', error, {
      integrationType,
      eventType,
    });
  }
}

/**
 * Record integration analytics
 */
export async function recordIntegrationAnalytics(
  integrationType: string,
  organizationId: string,
  eventType: string,
  metadata: Record<string, unknown> = {},
  userId?: string
): Promise<void> {
  try {
    await supabaseServer
      .from('integration_analytics')
      .insert({
        integration_type: integrationType,
        organization_id: organizationId,
        user_id: userId,
        event_type: eventType,
        metadata_jsonb: metadata,
      });
  } catch (error) {
    logger.error('Failed to record integration analytics', error, {
      integrationType,
      eventType,
    });
  }
}

/**
 * Get integration status
 */
export async function getIntegrationStatus(
  integrationType: string,
  organizationId: string,
  userId?: string
): Promise<IntegrationStatus | null> {
  try {
    // Check if integration is connected
    const { data: credential } = await supabaseServer
      .from('integration_credentials')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('integration_type', integrationType)
      .eq('user_id', userId || null)
      .single();
    
    const isConnected = !!credential;
    
    // Get recent events to determine health
    const { data: recentEvents } = await supabaseServer
      .from('integration_events')
      .select('*')
      .eq('integration_type', integrationType)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    const errorEvents = recentEvents?.filter(e => e.status === 'error') || [];
    const lastSuccessEvent = recentEvents?.find(e => e.status === 'success');
    
    return {
      integrationType,
      organizationId,
      userId,
      isConnected,
      lastSyncAt: lastSuccessEvent?.created_at,
      errorCount: errorEvents.length,
      lastError: errorEvents[0]?.error_message,
    };
  } catch (error) {
    logger.error('Failed to get integration status', error, {
      integrationType,
      organizationId,
    });
    return null;
  }
}

/**
 * Get integration health metrics
 */
export async function getIntegrationHealth(
  integrationType: string,
  organizationId: string,
  days: number = 7
): Promise<{
  totalEvents: number;
  successCount: number;
  errorCount: number;
  successRate: number;
  averageResponseTime?: number;
}> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const { data: events } = await supabaseServer
      .from('integration_events')
      .select('*')
      .eq('integration_type', integrationType)
      .eq('organization_id', organizationId)
      .gte('created_at', since.toISOString());
    
    const totalEvents = events?.length || 0;
    const successCount = events?.filter(e => e.status === 'success').length || 0;
    const errorCount = events?.filter(e => e.status === 'error').length || 0;
    const successRate = totalEvents > 0 ? (successCount / totalEvents) * 100 : 0;
    
    return {
      totalEvents,
      successCount,
      errorCount,
      successRate: Math.round(successRate * 100) / 100,
    };
  } catch (error) {
    logger.error('Failed to get integration health', error, {
      integrationType,
      organizationId,
    });
    return {
      totalEvents: 0,
      successCount: 0,
      errorCount: 0,
      successRate: 0,
    };
  }
}

