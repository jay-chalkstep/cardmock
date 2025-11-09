/**
 * GET /api/integrations/figma/status/[asset_id]
 * Get approval status for a Figma-synced asset
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/figma/status/[asset_id]
 * Get approval status for asset (for Figma plugin)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ asset_id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { asset_id } = await context.params;
    
    logger.api(`/api/integrations/figma/status/${asset_id}`, 'GET', { orgId });
    
    // Get asset with approval status
    const { data: asset, error: assetError } = await supabaseServer
      .from('assets')
      .select('id, mockup_name, figma_metadata, project:projects(id, workflow_id)')
      .eq('id', asset_id)
      .eq('organization_id', orgId)
      .single();
    
    if (assetError || !asset) {
      return notFoundResponse('Asset not found');
    }
    
    // Get stage progress if project has workflow
    let approvalStatus = 'pending';
    let currentStage = null;
    
    // Handle project as array (Supabase relationship returns array)
    const project = Array.isArray(asset.project) ? asset.project[0] : asset.project;
    
    if (project?.workflow_id) {
      const { data: progress } = await supabaseServer
        .from('mockup_stage_progress')
        .select('*, stage:workflow_stages(*)')
        .eq('asset_id', asset_id)
        .order('stage_order', { ascending: false })
        .limit(1)
        .single();
      
      if (progress) {
        currentStage = progress.stage;
        approvalStatus = progress.status === 'approved' ? 'approved' : 'pending';
      }
    }
    
    return successResponse({
      assetId: asset.id,
      assetName: asset.mockup_name,
      figmaMetadata: asset.figma_metadata,
      approvalStatus,
      currentStage,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to get Figma asset status');
  }
}

