import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { handleDocumentUpload } from '@/lib/utils/contract-versioning';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/[id]/documents
 *
 * Get all documents for a contract
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/contracts/${id}/documents`, 'GET', { orgId });

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

    // Get documents
    const { data: documents, error } = await supabaseServer
      .from('contract_documents')
      .select('*')
      .eq('contract_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    return successResponse({ documents: documents || [] });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch documents');
  }
}

/**
 * POST /api/contracts/[id]/documents
 *
 * Upload a new document for a contract
 *
 * Body: FormData with file
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id } = await context.params;

    logger.api(`/api/contracts/${id}/documents`, 'POST', { orgId, userId });

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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const versionOwner = (formData.get('version_owner') as string) || 'cdco';

    if (!file) {
      return badRequestResponse('File is required');
    }

    // Validate version_owner
    if (versionOwner !== 'cdco' && versionOwner !== 'client') {
      return badRequestResponse('version_owner must be "cdco" or "client"');
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
    ];

    if (!allowedTypes.includes(file.type)) {
      return badRequestResponse('Only Word documents (.docx, .doc) are allowed');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return badRequestResponse('File size must be less than 10MB');
    }

    // Use the unified versioning service to handle document upload
    // This automatically determines if it's a new document or new version
    try {
      const result = await handleDocumentUpload({
        contractId: id,
        file,
        userId,
        orgId,
        versionOwner: versionOwner as 'cdco' | 'client',
      });

      return successResponse(
        {
          document: result.document,
          version: result.version,
        },
        201
      );
    } catch (error) {
      logger.error('Error handling document upload:', {
        error: error instanceof Error ? error.message : String(error),
        contractId: id,
      });
      return errorResponse(
        error,
        error instanceof Error ? error.message : 'Failed to upload document'
      );
    }
  } catch (error) {
    return errorResponse(error, 'Failed to upload document');
  }
}

