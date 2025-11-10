/**
 * POST /api/integrations/figma/import
 * Import selected frames from Figma
 */

import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse } from '@/lib/api/response';
import { getFigmaAccessToken, exportFigmaFrame } from '@/lib/integrations/figma';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/figma/import
 * Import frames from Figma
 * Body: { fileKey: string, nodeIds: string[], projectId?: string, folderId?: string, workflowId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;

    const body = await request.json();
    const { fileKey, nodeIds, projectId, folderId, workflowId } = body;

    if (!fileKey || !nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return badRequestResponse('fileKey and nodeIds array are required');
    }

    logger.api('/api/integrations/figma/import', 'POST', { userId, orgId, fileKey, nodeCount: nodeIds.length });

    // Get Figma access token
    const accessToken = await getFigmaAccessToken(userId, orgId);
    if (!accessToken) {
      return errorResponse(new Error('Figma integration not connected'), 'Figma integration not connected');
    }

    // Get file structure to get frame names
    const { fetchFigmaFileStructure, extractFramesFromFile } = await import('@/lib/integrations/figma');
    const fileStructure = await fetchFigmaFileStructure(accessToken, fileKey);
    const frames = extractFramesFromFile(fileStructure);
    const frameMap = new Map(frames.map(f => [f.nodeId, f]));

    const importedAssets = [];
    const errors = [];

    // Process each frame
    for (const nodeId of nodeIds) {
      try {
        const frame = frameMap.get(nodeId);
        const frameName = frame?.name || `Frame ${nodeId.substring(0, 8)}`;

        // Export frame as image
        const imageUrl = await exportFigmaFrame(accessToken, fileKey, nodeId);

        if (!imageUrl) {
          errors.push(`Failed to export frame ${frameName}`);
          continue;
        }

        // Download image
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
          errors.push(`Failed to download image for ${frameName}`);
          continue;
        }

        const imageBlob = await imageResponse.blob();

        // Upload to Supabase storage
        const fileName = `${Date.now()}-${nodeId}-${frameName.replace(/[^a-z0-9]/gi, '_')}.png`;
        const { data: uploadData, error: uploadError } = await supabaseServer.storage
          .from('card-mockups')
          .upload(fileName, imageBlob, {
            contentType: 'image/png',
            cacheControl: '3600',
          });

        if (uploadError) {
          logger.error('Failed to upload Figma frame', uploadError, { fileName });
          errors.push(`Failed to upload ${frameName}`);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabaseServer.storage
          .from('card-mockups')
          .getPublicUrl(fileName);

        // Create asset record
        const figmaMetadata = {
          figma_file_id: fileKey,
          figma_node_ids: [nodeId],
          figma_file_url: `https://www.figma.com/file/${fileKey}`,
          version_key: `${fileKey}-${nodeId}-${Date.now()}`,
          last_modified: new Date().toISOString(),
        };

        const { data: asset, error: assetError } = await supabaseServer
          .from('assets')
          .insert({
            mockup_name: frameName,
            organization_id: orgId,
            created_by: userId,
            project_id: projectId || null,
            folder_id: folderId || null,
            mockup_image_url: urlData.publicUrl,
            figma_metadata: figmaMetadata,
          })
          .select()
          .single();

        if (assetError || !asset) {
          logger.error('Failed to create asset from Figma frame', assetError);
          errors.push(`Failed to create asset for ${frameName}`);
          continue;
        }

        importedAssets.push(asset);

        // Record sync event
        await supabaseServer
          .from('integration_events')
          .insert({
            integration_type: 'figma',
            organization_id: orgId,
            event_type: 'import',
            payload_jsonb: {
              fileKey,
              nodeId,
              assetId: asset.id,
            },
            status: 'success',
          });
      } catch (frameError) {
        logger.error('Error processing Figma frame', frameError, { nodeId });
        errors.push(`Error processing frame ${nodeId}: ${frameError instanceof Error ? frameError.message : 'Unknown error'}`);
      }
    }

    logger.info('Figma frames imported', { userId, orgId, imported: importedAssets.length, errors: errors.length });

    return successResponse({
      success: true,
      assets: importedAssets,
      imported: importedAssets.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to import Figma frames');
  }
}

