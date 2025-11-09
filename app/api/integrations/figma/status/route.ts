/**
 * GET /api/integrations/figma/status
 * Get Figma integration status
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/figma/status
 * Get Figma integration connection status
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    logger.api('/api/integrations/figma/status', 'GET', { userId, orgId });
    
    const { data: integration, error } = await supabaseServer
      .from('figma_integrations')
      .select('id, created_at, updated_at')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();
    
    if (error || !integration) {
      return successResponse({ connected: false });
    }
    
    return successResponse({
      connected: true,
      connectedAt: integration.created_at,
      lastUpdated: integration.updated_at,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to get Figma integration status');
  }
}

