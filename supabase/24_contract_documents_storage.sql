-- ============================================================================
-- Migration 24: Contract Documents Storage Setup
-- ============================================================================
-- Sets up storage bucket policies for contract-documents bucket
-- ============================================================================
--
-- NOTE: Storage bucket must be created through the Supabase Dashboard or CLI
-- This file contains the SQL policies to apply after bucket creation
--
-- Prerequisites:
-- 1. Complete 23_contracts_module.sql
-- 2. Create 'contract-documents' bucket in Supabase Dashboard
--
-- ============================================================================
-- STEP 1: CREATE STORAGE BUCKET (via Supabase Dashboard or CLI)
-- ============================================================================
-- You must create this bucket manually in the Supabase Dashboard:
--
-- 1. Go to Storage section in Supabase Dashboard
-- 2. Click "Create bucket"
-- 3. Create the following bucket:
--
--    Bucket Name: contract-documents
--    Public: Yes (or No, depending on your security requirements)
--    File size limit: 10 MB (or higher for larger documents)
--    Allowed MIME types: 
--      - application/vnd.openxmlformats-officedocument.wordprocessingml.document (.docx)
--      - application/msword (.doc)
--      - application/pdf (if you convert to PDF)
--
-- OR use Supabase CLI:
--   supabase storage create contract-documents --public
--
-- ============================================================================
-- STEP 2: STORAGE POLICIES (Run this SQL after creating bucket)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- CONTRACT-DOCUMENTS BUCKET POLICIES
-- ----------------------------------------------------------------------------

-- Allow authenticated users to view files in the contract-documents bucket
DROP POLICY IF EXISTS "Authenticated users can view contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can view contract documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contract-documents'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Authenticated users can upload contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload contract documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contract-documents'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update files
DROP POLICY IF EXISTS "Authenticated users can update contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can update contract documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contract-documents'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete files
DROP POLICY IF EXISTS "Authenticated users can delete contract documents" ON storage.objects;
CREATE POLICY "Authenticated users can delete contract documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contract-documents'
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- STORAGE SETUP COMPLETE
-- ============================================================================
-- Your contract-documents bucket is now configured with:
-- - Authenticated read access (logged-in users can view files)
-- - Authenticated write access (logged-in users can upload/update/delete)
--
-- Test your setup:
-- 1. Try uploading a contract document through the app
-- 2. Verify the file appears in Supabase Storage
-- 3. Check that the file can be accessed via the API
--
-- Troubleshooting:
-- - If uploads fail, check the bucket exists
-- - Verify RLS policies are enabled with: SELECT * FROM storage.policies WHERE bucket_id = 'contract-documents';
-- - Check browser console for CORS or policy errors

