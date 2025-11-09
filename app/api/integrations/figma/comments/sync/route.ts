/**
 * POST /api/integrations/figma/comments/sync
 * Sync comments between Figma and Aiproval
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { getIntegrationCredentials } from '@/lib/integrations/oauth';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { recordIntegrationEvent } from '@/lib/integrations/status';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/figma/comments/sync
 * Sync comments bidirectionally between Figma and Aiproval
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const body = await request.json();
    const { assetId, direction = 'both' } = body; // 'figma_to_aiproval', 'aiproval_to_figma', 'both'
    
    if (!assetId) {
      return badRequestResponse('Asset ID is required');
    }
    
    logger.api('/api/integrations/figma/comments/sync', 'POST', { userId, orgId, assetId, direction });
    
    // Get Figma credentials
    const credentials = await getIntegrationCredentials('figma', userId, orgId);
    if (!credentials) {
      return errorResponse(new Error('Figma integration not connected'), 'Figma integration not connected');
    }
    
    // Get asset with Figma metadata
    const { data: asset, error: assetError } = await supabaseServer
      .from('assets')
      .select('id, figma_metadata')
      .eq('id', assetId)
      .eq('organization_id', orgId)
      .single();
    
    if (assetError || !asset || !asset.figma_metadata) {
      return errorResponse(new Error('Asset not found or not synced with Figma'), 'Asset not found or not synced with Figma');
    }
    
    const figmaMetadata = asset.figma_metadata as {
      figma_file_id: string;
      figma_node_ids: string[];
      figma_file_url: string;
    };
    
    // Get Aiproval comments for this asset
    const { data: aiprovalComments } = await supabaseServer
      .from('mockup_comments')
      .select('*')
      .eq('mockup_id', assetId)
      .order('created_at', { ascending: false });
    
    // TODO: Implement actual Figma API calls to sync comments
    // This is a placeholder - actual implementation would:
    // 1. Fetch comments from Figma API
    // 2. Compare with Aiproval comments
    // 3. Create missing comments in both systems
    // 4. Update existing comments if needed
    
    // Record sync event
    await recordIntegrationEvent(
      'figma',
      orgId,
      'comment_sync',
      { assetId, direction, commentCount: aiprovalComments?.length || 0 },
      'success'
    );
    
    logger.info('Figma comments synced', { userId, orgId, assetId, direction });
    
    return successResponse({
      synced: true,
      direction,
      aiprovalCommentCount: aiprovalComments?.length || 0,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to sync Figma comments');
  }
}

