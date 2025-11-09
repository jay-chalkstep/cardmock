/**
 * POST /api/integrations/figma/frames/upload
 * Upload frames from Figma plugin
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
 * POST /api/integrations/figma/frames/upload
 * Upload frames from Figma plugin
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const body = await request.json();
    const {
      frames, // Array of { nodeId, imageData, fileName, figmaFileId, figmaFileUrl }
      projectId,
      workflowId,
      figmaMetadata,
    } = body;
    
    if (!frames || !Array.isArray(frames) || frames.length === 0) {
      return badRequestResponse('Frames array is required');
    }
    
    logger.api('/api/integrations/figma/frames/upload', 'POST', { userId, orgId, frameCount: frames.length });
    
    // Get Figma credentials
    const credentials = await getIntegrationCredentials('figma', userId, orgId);
    if (!credentials) {
      return errorResponse(new Error('Figma integration not connected'), 'Figma integration not connected');
    }
    
    const uploadedAssets = [];
    
    // Process each frame
    for (const frame of frames) {
      try {
        // Convert base64 image data to blob
        const imageBlob = await fetch(frame.imageData).then((r) => r.blob());
        
        // Upload to Supabase storage
        const fileName = `${Date.now()}-${frame.fileName || 'figma-frame'}.png`;
        const { data: uploadData, error: uploadError } = await supabaseServer.storage
          .from('card-mockups')
          .upload(fileName, imageBlob, {
            contentType: 'image/png',
            cacheControl: '3600',
          });
        
        if (uploadError) {
          logger.error('Failed to upload Figma frame', uploadError, { fileName });
          continue;
        }
        
        // Get public URL
        const { data: urlData } = supabaseServer.storage
          .from('card-mockups')
          .getPublicUrl(fileName);
        
        // Create asset record
        const figmaMetadataForAsset = {
          figma_file_id: frame.figmaFileId,
          figma_node_ids: [frame.nodeId],
          figma_file_url: frame.figmaFileUrl,
          version_key: `${frame.figmaFileId}-${frame.nodeId}-${Date.now()}`,
          last_modified: new Date().toISOString(),
          ...figmaMetadata,
        };
        
        const { data: asset, error: assetError } = await supabaseServer
          .from('assets')
          .insert({
            mockup_name: frame.fileName || 'Figma Frame',
            organization_id: orgId,
            created_by: userId,
            project_id: projectId || null,
            mockup_image_url: urlData.publicUrl,
            figma_metadata: figmaMetadataForAsset,
          })
          .select()
          .single();
        
        if (assetError || !asset) {
          logger.error('Failed to create asset from Figma frame', assetError);
          continue;
        }
        
        uploadedAssets.push(asset);
        
        // Record sync event
        await recordIntegrationEvent(
          'figma',
          orgId,
          'upload',
          { assetId: asset.id, frameId: frame.nodeId },
          'success'
        );
      } catch (frameError) {
        logger.error('Error processing Figma frame', frameError, { frameId: frame.nodeId });
        await recordIntegrationEvent(
          'figma',
          orgId,
          'upload',
          { frameId: frame.nodeId },
          'error',
          frameError instanceof Error ? frameError.message : String(frameError)
        );
      }
    }
    
    logger.info('Figma frames uploaded', { userId, orgId, count: uploadedAssets.length });
    
    return successResponse({
      assets: uploadedAssets,
      count: uploadedAssets.length,
    }, 201);
  } catch (error) {
    return errorResponse(error, 'Failed to upload Figma frames');
  }
}

