import { NextRequest } from 'next/server';
import { getAuthContext } from '@/lib/api/auth';
import { successResponse, errorResponse, badRequestResponse, notFoundResponse } from '@/lib/api/response';
import { handleSupabaseError } from '@/lib/api/error-handler';
import { supabaseServer } from '@/lib/supabase-server';
import { logger } from '@/lib/utils/logger';
import { clerkClient } from '@clerk/nextjs/server';
import { createNewVersion } from '@/lib/utils/contract-versioning';

export const dynamic = 'force-dynamic';

/**
 * GET /api/contracts/[id]/documents/[docId]/versions
 *
 * Get all versions of a document
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

    logger.api(`/api/contracts/${id}/documents/${docId}/versions`, 'GET', { orgId });

    // Check if contract and document exist
    const { data: document } = await supabaseServer
      .from('contract_documents')
      .select('id, contract_id')
      .eq('id', docId)
      .eq('contract_id', id)
      .single();

    if (!document) {
      return notFoundResponse('Document not found');
    }

    // Get versions
    const { data: versions, error } = await supabaseServer
      .from('contract_document_versions')
      .select('*')
      .eq('document_id', docId)
      .order('version_number', { ascending: false });

    if (error) {
      return handleSupabaseError(error);
    }

    // Enrich versions with user names from Clerk
    const clerk = await clerkClient();
    const enrichedVersions = await Promise.all(
      (versions || []).map(async (version) => {
        try {
          const user = await clerk.users.getUser(version.created_by);
          const userName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.firstName || user.username || user.emailAddresses[0]?.emailAddress?.split('@')[0] || 'Unknown User';
          
          return {
            ...version,
            created_by_name: userName,
          };
        } catch (error) {
          logger.error('Failed to fetch user from Clerk', error);
          return {
            ...version,
            created_by_name: 'Unknown User',
          };
        }
      })
    );

    return successResponse({ versions: enrichedVersions });
  } catch (error) {
    return errorResponse(error, 'Failed to fetch versions');
  }
}

/**
 * POST /api/contracts/[id]/documents/[docId]/versions
 *
 * Create a new version of a document
 *
 * Body: FormData with file
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const authResult = await getAuthContext();
    if (authResult instanceof Response) return authResult;
    const { userId, orgId } = authResult;
    
    const { id, docId } = await context.params;

    logger.api(`/api/contracts/${id}/documents/${docId}/versions`, 'POST', { orgId, userId });

    // Check if document exists and get current file URL
    const { data: document } = await supabaseServer
      .from('contract_documents')
      .select('id, contract_id, version_number, file_url, file_name')
      .eq('id', docId)
      .eq('contract_id', id)
      .single();

    if (!document) {
      return notFoundResponse('Document not found');
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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
    ];

    if (!allowedTypes.includes(file.type)) {
      return badRequestResponse('Only Word documents (.docx, .doc) are allowed');
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return badRequestResponse('File size must be less than 10MB');
    }

    // Use the unified versioning service to create a new version
    try {
      const result = await createNewVersion({
        contractId: id,
        documentId: docId,
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
      logger.error('Error creating new version:', {
        error: error instanceof Error ? error.message : String(error),
        documentId: docId,
        contractId: id,
      });
      return errorResponse(
        error,
        error instanceof Error ? error.message : 'Failed to create new version'
      );
    }
  } catch (error) {
    return errorResponse(error, 'Failed to create version');
  }
}

