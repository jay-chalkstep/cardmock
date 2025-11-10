import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import mammoth from 'mammoth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/documents/[docId]/preview
 *
 * Get HTML preview of a document
 * Query params:
 * - version_id?: string (optional, specific version to preview)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ docId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { docId } = await context.params;
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get('version_id');

    logger.api(`/api/contracts/documents/${docId}/preview`, 'GET', { orgId, versionId });

    // Get document
    const { data: document } = await supabaseServer
      .from('contract_documents')
      .select('id, version_number, file_url, contract_id')
      .eq('id', docId)
      .single();

    if (!document) {
      return notFoundResponse('Document not found');
    }

    let fileUrl = document.file_url;

    // If version_id is provided, get that specific version
    if (versionId) {
      const { data: version } = await supabaseServer
        .from('contract_document_versions')
        .select('file_url')
        .eq('id', versionId)
        .eq('document_id', docId)
        .single();

      if (version) {
        fileUrl = version.file_url;
      }
    }

    // Fetch the document
    const response = await fetch(fileUrl);
    if (!response.ok) {
      logger.error('Failed to fetch document file:', { status: response.status, statusText: response.statusText });
      return errorResponse(
        new Error('Failed to fetch document file'),
        'Unable to load document for preview. The file may not be accessible.'
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert Word document to HTML using mammoth
    let html: string;
    try {
      const result = await mammoth.convertToHtml({ buffer });
      html = result.value;
      
      // Add basic styling for better readability
      html = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
          ${html}
        </div>
      `;
    } catch (error) {
      logger.error('Error converting document to HTML:', error);
      return errorResponse(
        error instanceof Error ? error : new Error('Failed to convert document'),
        'Failed to convert document to HTML. The file may be corrupted or in an unsupported format.'
      );
    }

    return successResponse({ html });
  } catch (error) {
    return errorResponse(error, 'Failed to generate document preview');
  }
}

