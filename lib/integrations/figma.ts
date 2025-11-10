/**
 * Figma API helper functions
 * Provides utilities for interacting with the Figma API
 */

import { getIntegrationCredentials } from './oauth';
import { logger } from '@/lib/utils/logger';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

export interface FigmaFile {
  key: string;
  name: string;
  last_modified: string;
  thumbnail_url?: string;
}

export interface FigmaFrame {
  nodeId: string;
  name: string;
  type: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  thumbnail_url?: string;
}

/**
 * Get Figma access token for a user
 */
export async function getFigmaAccessToken(
  userId: string,
  orgId: string
): Promise<string | null> {
  try {
    const credentials = await getIntegrationCredentials('figma', userId, orgId);
    if (!credentials) {
      return null;
    }
    
    return credentials.access_token as string;
  } catch (error) {
    logger.error('Failed to get Figma access token', error);
    return null;
  }
}

/**
 * Fetch user's Figma files
 * Note: Figma API doesn't have a direct "list all files" endpoint
 * This would require team/files endpoint with team ID, or user needs to provide file key
 * For now, this returns empty array - users will provide file key directly
 */
export async function fetchFigmaFiles(accessToken: string): Promise<FigmaFile[]> {
  // Figma API doesn't have a direct "list all files" endpoint
  // Users need to provide file key from the Figma file URL
  // This function is kept for future team/files endpoint integration
  return [];
}

/**
 * Fetch Figma file structure
 */
export async function fetchFigmaFileStructure(
  accessToken: string,
  fileKey: string
): Promise<any> {
  try {
    const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to fetch Figma file structure', { fileKey, status: response.status, error });
      throw new Error(`Failed to fetch Figma file: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logger.error('Error fetching Figma file structure', error);
    throw error;
  }
}

/**
 * Extract frames from Figma file structure
 */
export function extractFramesFromFile(fileStructure: any): FigmaFrame[] {
  const frames: FigmaFrame[] = [];

  function traverseNodes(node: any) {
    if (!node) return;

    // Check if this is a frame (FRAME, COMPONENT, COMPONENT_SET, or INSTANCE)
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'COMPONENT_SET' || node.type === 'INSTANCE') {
      // Only include top-level frames or components (not nested ones unless they're components)
      // For now, include all frames - user can select which ones to import
      frames.push({
        nodeId: node.id,
        name: node.name || 'Untitled Frame',
        type: node.type,
        bounds: node.absoluteBoundingBox ? {
          x: node.absoluteBoundingBox.x,
          y: node.absoluteBoundingBox.y,
          width: node.absoluteBoundingBox.width,
          height: node.absoluteBoundingBox.height,
        } : undefined,
      });
    }

    // Traverse children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        traverseNodes(child);
      }
    }
  }

  // Start traversal from document root
  if (fileStructure.document) {
    traverseNodes(fileStructure.document);
  }

  return frames;
}

/**
 * Export Figma frame as image
 */
export async function exportFigmaFrame(
  accessToken: string,
  fileKey: string,
  nodeId: string
): Promise<string> {
  try {
    const response = await fetch(
      `${FIGMA_API_BASE}/images/${fileKey}?ids=${nodeId}&format=png&scale=2`,
      {
        headers: {
          'X-Figma-Token': accessToken,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to export Figma frame', { fileKey, nodeId, status: response.status, error });
      throw new Error(`Failed to export frame: ${response.status}`);
    }

    const data = await response.json();
    // Figma returns image URLs in the images object
    return data.images?.[nodeId] || '';
  } catch (error) {
    logger.error('Error exporting Figma frame', error);
    throw error;
  }
}

