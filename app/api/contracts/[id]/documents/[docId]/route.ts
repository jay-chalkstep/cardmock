import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/[id]/documents/[docId]
 *
 * Get a single document
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id, docId } = await context.params;

    logger.api(`/api/contracts/${id}/documents/${docId}`, 'GET', { orgId });

    // Check if contract exists
    const { data: contract } = await supabaseServer
      .from('contracts')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!contract) {
      return notFoundResponse('Contract not found');
    }

    // Get document
    const { data: document, error } = await supabaseServer
      .from('contract_documents')
      .select('*')
      .eq('id', docId)
      .eq('contract_id', id)
      .single();

    if (error || !document) {
      return notFoundResponse('Document not found');
    }

    return successResponse({ document });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch document');
  }
}

/**
 * DELETE /api/contracts/[id]/documents/[docId]
 *
 * Delete a document
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id, docId } = await context.params;

    logger.api(`/api/contracts/${id}/documents/${docId}`, 'DELETE', { orgId });

    // Check if contract exists
    const { data: contract } = await supabaseServer
      .from('contracts')
      .select('id')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (!contract) {
      return notFoundResponse('Contract not found');
    }

    // Get document to get file path
    const { data: document } = await supabaseServer
      .from('contract_documents')
      .select('file_url')
      .eq('id', docId)
      .eq('contract_id', id)
      .single();

    if (!document) {
      return notFoundResponse('Document not found');
    }

    // Delete document (cascade will handle versions)
    const { error } = await supabaseServer
      .from('contract_documents')
      .delete()
      .eq('id', docId)
      .eq('contract_id', id);

    if (error) {
      return handleSupabaseError(error);
    }

    // TODO: Delete file from storage (optional cleanup)

    return successResponse({ message: 'Document deleted successfully' });
  } catch (error) {
    return errorResponse(error, 'Failed to delete document');
  }
}

