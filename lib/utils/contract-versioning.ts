/**
 * Contract Document Versioning Service
 * 
 * Unified service for handling all contract document versioning logic.
 * Ensures version numbers always increment correctly and watermarks are applied properly.
 */

import { supabaseServer } from '@/lib/supabase-server';
import { createServerAdminClient } from '@/lib/supabase/server';
import { logger } from './logger';
import { addWatermarkToDocument } from './watermark';
import { extractTextFromWordDocument } from '@/lib/ai/document-diff';

export interface VersioningResult {
  document: any;
  version: any;
  versionNumber: number;
}

export interface VersioningOptions {
  contractId: string;
  documentId?: string; // If provided, create new version of existing document
  file: File;
  userId: string;
  orgId: string;
  versionOwner?: 'cdco' | 'client'; // Defaults to 'cdco'
}

/**
 * Calculate the next version number for a document
 * This ensures we always get the correct next version by checking both
 * the contract_documents table and contract_document_versions table
 */
export async function calculateNextVersionNumber(
  documentId: string
): Promise<number> {
  // First, get the current version from the document record
  const { data: document } = await supabaseServer
    .from('contract_documents')
    .select('version_number')
    .eq('id', documentId)
    .single();

  if (!document) {
    throw new Error('Document not found');
  }

  // Get the maximum version number from version history
  const { data: versions } = await supabaseServer
    .from('contract_document_versions')
    .select('version_number')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false });

  // Calculate next version
  let maxVersion = document.version_number;
  if (versions && versions.length > 0) {
    const maxVersionFromHistory = Math.max(
      ...versions.map((v) => v.version_number)
    );
    maxVersion = Math.max(maxVersion, maxVersionFromHistory);
  }

  return maxVersion + 1;
}

/**
 * Watermark all previous versions of a document
 * This marks all previous versions as "PREVIOUS VERSION" before uploading a new one
 */
export async function watermarkPreviousVersions(
  documentId: string,
  contractId: string,
  fileExt: string,
  mimeType: string
): Promise<void> {
  const supabaseAdmin = createServerAdminClient();

  // Get all previous versions (including the current document file)
  const { data: document } = await supabaseServer
    .from('contract_documents')
    .select('id, version_number, file_url, is_current')
    .eq('id', documentId)
    .single();

  if (!document) {
    throw new Error('Document not found');
  }

  // Get all version records
  const { data: versions } = await supabaseServer
    .from('contract_document_versions')
    .select('id, version_number, file_url')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false });

  // Collect all files that need watermarking
  const filesToWatermark: Array<{
    id: string;
    version_number: number;
    file_url: string;
    isDocumentRecord: boolean;
  }> = [];

  // Add current document file if it exists and isn't already watermarked
  if (document.file_url && !document.file_url.includes('-watermarked')) {
    filesToWatermark.push({
      id: document.id,
      version_number: document.version_number,
      file_url: document.file_url,
      isDocumentRecord: true,
    });
  }

  // Add all version records that aren't watermarked
  if (versions) {
    for (const version of versions) {
      if (version.file_url && !version.file_url.includes('-watermarked')) {
        filesToWatermark.push({
          id: version.id,
          version_number: version.version_number,
          file_url: version.file_url,
          isDocumentRecord: false,
        });
      }
    }
  }

  logger.info(`Watermarking ${filesToWatermark.length} previous versions`, {
    documentId,
  });

  // Watermark each file
  for (const fileInfo of filesToWatermark) {
    try {
      logger.info(`Watermarking version ${fileInfo.version_number}`, {
        versionId: fileInfo.id,
        fileUrl: fileInfo.file_url,
      });

      // Download and watermark the document
      const watermarkedBuffer = await addWatermarkToDocument(fileInfo.file_url);

      // Upload watermarked version
      const watermarkedFileName = `${contractId}/${Date.now()}-v${fileInfo.version_number}-watermarked.${fileExt}`;
      const watermarkedFilePath = `contract-documents/${watermarkedFileName}`;

      const { data: watermarkedUpload, error: watermarkedError } =
        await supabaseAdmin.storage.from('contract-documents').upload(
          watermarkedFilePath,
          watermarkedBuffer,
          {
            contentType: mimeType,
            upsert: false,
          }
        );

      if (watermarkedError) {
        logger.error(
          `Failed to upload watermarked version ${fileInfo.version_number}:`,
          {
            versionId: fileInfo.id,
            error: watermarkedError,
          }
        );
        continue; // Continue with other versions even if one fails
      }

      const { data: watermarkedUrlData } = supabaseAdmin.storage
        .from('contract-documents')
        .getPublicUrl(watermarkedFilePath);

      // Update the appropriate record
      if (fileInfo.isDocumentRecord) {
        await supabaseServer
          .from('contract_documents')
          .update({ file_url: watermarkedUrlData.publicUrl })
          .eq('id', fileInfo.id);
      } else {
        await supabaseServer
          .from('contract_document_versions')
          .update({ file_url: watermarkedUrlData.publicUrl })
          .eq('id', fileInfo.id);
      }

      logger.info(`Successfully watermarked version ${fileInfo.version_number}`, {
        versionId: fileInfo.id,
      });
    } catch (error) {
      logger.error(`Failed to watermark version ${fileInfo.version_number}:`, {
        versionId: fileInfo.id,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue with other versions even if one fails
    }
  }
}

/**
 * Create a new version of an existing document
 */
export async function createNewVersion(
  options: VersioningOptions
): Promise<VersioningResult> {
  const { contractId, documentId, file, userId, orgId, versionOwner = 'cdco' } = options;

  if (!documentId) {
    throw new Error('Document ID is required for creating new versions');
  }

  const supabaseAdmin = createServerAdminClient();
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'docx';

  // Verify document exists
  const { data: document } = await supabaseServer
    .from('contract_documents')
    .select('id, contract_id, version_number, file_url, file_name')
    .eq('id', documentId)
    .eq('contract_id', contractId)
    .single();

  if (!document) {
    throw new Error('Document not found');
  }

  // Calculate next version number
  const nextVersion = await calculateNextVersionNumber(documentId);

  logger.info(`Creating new version ${nextVersion} for document ${documentId}`, {
    documentId,
    currentVersion: document.version_number,
    nextVersion,
  });

  // Watermark all previous versions BEFORE uploading the new one
  await watermarkPreviousVersions(documentId, contractId, fileExt, file.type);

  // Upload the new version file
  const fileName = `${contractId}/${Date.now()}-v${nextVersion}.${fileExt}`;
  const filePath = `contract-documents/${fileName}`;
  const fileBuffer = await file.arrayBuffer();

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('contract-documents')
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    logger.error('Storage upload error:', uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from('contract-documents')
    .getPublicUrl(filePath);

  // Extract text from document for search
  let searchableText: string | null = null;
  try {
    searchableText = await extractTextFromWordDocument(urlData.publicUrl);
    if (searchableText && searchableText.length > 100000) {
      searchableText = searchableText.substring(0, 100000);
    }
  } catch (error) {
    logger.warn('Failed to extract text from document for search:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Mark previous document as not current
  await supabaseServer
    .from('contract_documents')
    .update({ is_current: false })
    .eq('id', documentId);

  // Update document record with new version
  const { data: updatedDoc, error: docError } = await supabaseServer
    .from('contract_documents')
    .update({
      version_number: nextVersion,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      is_current: true,
      searchable_text: searchableText,
      version_owner: versionOwner,
    })
    .eq('id', documentId)
    .select()
    .single();

  if (docError) {
    // Clean up uploaded file
    await supabaseAdmin.storage.from('contract-documents').remove([filePath]);
    throw new Error(`Failed to update document: ${docError.message}`);
  }

  // Create version record
  const { data: version, error: versionError } = await supabaseServer
    .from('contract_document_versions')
    .insert({
      document_id: documentId,
      version_number: nextVersion,
      file_url: urlData.publicUrl,
      created_by: userId,
      version_owner: versionOwner,
    })
    .select()
    .single();

  if (versionError) {
    logger.error('Version creation error:', versionError);
    // Don't fail the request if version record fails - document upload succeeded
    logger.warn(
      `Document ${documentId} updated to version ${nextVersion} but version record creation failed`,
      {
        documentId,
        versionNumber: nextVersion,
        error: versionError,
      }
    );
  } else {
    logger.info(`Document version created successfully`, {
      documentId,
      versionId: version?.id,
      versionNumber: nextVersion,
    });
  }

  return {
    document: updatedDoc,
    version: version || null,
    versionNumber: nextVersion,
  };
}

/**
 * Create a new document (first version)
 */
export async function createNewDocument(
  options: Omit<VersioningOptions, 'documentId'>
): Promise<VersioningResult> {
  const { contractId, file, userId, orgId, versionOwner = 'cdco' } = options;

  const supabaseAdmin = createServerAdminClient();
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'docx';
  const nextVersion = 1;

  // Upload the file
  const fileName = `${contractId}/${Date.now()}-v${nextVersion}.${fileExt}`;
  const filePath = `contract-documents/${fileName}`;
  const fileBuffer = await file.arrayBuffer();

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from('contract-documents')
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    logger.error('Storage upload error:', uploadError);
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // Get public URL
  const { data: urlData } = supabaseAdmin.storage
    .from('contract-documents')
    .getPublicUrl(filePath);

  // Mark previous documents as not current
  await supabaseServer
    .from('contract_documents')
    .update({ is_current: false })
    .eq('contract_id', contractId)
    .eq('is_current', true);

  // Extract text from document for search
  let searchableText: string | null = null;
  try {
    searchableText = await extractTextFromWordDocument(urlData.publicUrl);
    if (searchableText && searchableText.length > 100000) {
      searchableText = searchableText.substring(0, 100000);
    }
  } catch (error) {
    logger.warn('Failed to extract text from document for search:', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  // Create document record
  const { data: document, error: docError } = await supabaseServer
    .from('contract_documents')
    .insert({
      contract_id: contractId,
      version_number: nextVersion,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      is_current: true,
      uploaded_by: userId,
      searchable_text: searchableText,
      version_owner: versionOwner,
    })
    .select()
    .single();

  if (docError) {
    // Clean up uploaded file
    await supabaseAdmin.storage.from('contract-documents').remove([filePath]);
    throw new Error(`Failed to create document: ${docError.message}`);
  }

  // Create version record
  const { data: version, error: versionError } = await supabaseServer
    .from('contract_document_versions')
    .insert({
      document_id: document.id,
      version_number: nextVersion,
      file_url: urlData.publicUrl,
      created_by: userId,
    })
    .select()
    .single();

  if (versionError) {
    logger.error('Version creation error:', versionError);
    // Don't fail the request if version record fails - document upload succeeded
    logger.warn(
      `Document ${document.id} uploaded but version record creation failed`,
      {
        documentId: document.id,
        versionNumber: nextVersion,
        error: versionError,
      }
    );
  } else {
    logger.info(`Document version created successfully`, {
      documentId: document.id,
      versionId: version?.id,
      versionNumber: nextVersion,
    });
  }

  return {
    document,
    version: version || null,
    versionNumber: nextVersion,
  };
}

/**
 * Handle document upload - automatically determines if it's a new document or new version
 */
export async function handleDocumentUpload(
  options: VersioningOptions
): Promise<VersioningResult> {
  const { contractId, file, userId, orgId } = options;

  // Check if a document with the same name already exists for this contract
  const { data: existingDocument } = await supabaseServer
    .from('contract_documents')
    .select('id, version_number')
    .eq('contract_id', contractId)
    .eq('file_name', file.name)
    .single();

  if (existingDocument) {
    // Document with same name exists - create new version
    logger.info(
      `Document with name "${file.name}" already exists, creating new version`,
      {
        documentId: existingDocument.id,
        currentVersion: existingDocument.version_number,
      }
    );

    return createNewVersion({
      ...options,
      documentId: existingDocument.id,
    });
  } else {
    // New document - create first version
    logger.info(`Creating new document: "${file.name}"`);
    return createNewDocument(options);
  }
}


