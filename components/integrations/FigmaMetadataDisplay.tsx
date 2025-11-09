'use client';

import { ExternalLink } from 'lucide-react';

interface FigmaMetadata {
  figma_file_id?: string;
  figma_node_ids?: string[];
  figma_file_url?: string;
  version_key?: string;
  last_modified?: string;
}

interface FigmaMetadataDisplayProps {
  metadata: FigmaMetadata | null;
}

export default function FigmaMetadataDisplay({ metadata }: FigmaMetadataDisplayProps) {
  if (!metadata || !metadata.figma_file_id) {
    return null;
  }
  
  return (
    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">Figma Source</span>
        {metadata.figma_file_url && (
          <a
            href={metadata.figma_file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
          >
            Open in Figma
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <div className="space-y-1 text-xs text-gray-600">
        {metadata.figma_file_id && (
          <div>
            <span className="font-medium">File ID:</span> {metadata.figma_file_id}
          </div>
        )}
        {metadata.figma_node_ids && metadata.figma_node_ids.length > 0 && (
          <div>
            <span className="font-medium">Node IDs:</span> {metadata.figma_node_ids.join(', ')}
          </div>
        )}
        {metadata.last_modified && (
          <div>
            <span className="font-medium">Last Modified:</span>{' '}
            {new Date(metadata.last_modified).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}

