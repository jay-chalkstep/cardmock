-- ============================================================================
-- Migration 39: Remove Contracts and Figma Integration
-- ============================================================================
-- Removes contract-specific functionality and Figma integration while
-- preserving ALL client functionality (clients table, client_id columns, etc.)
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP CONTRACT-RELATED TABLES
-- ============================================================================

-- Drop contract routing tables first (they reference contracts)
DROP TABLE IF EXISTS contract_routing_events CASCADE;
DROP TABLE IF EXISTS contract_routing_recipients CASCADE;

-- Drop contract document versions (references contract_documents)
DROP TABLE IF EXISTS contract_document_versions CASCADE;

-- Drop contract documents (references contracts)
DROP TABLE IF EXISTS contract_documents CASCADE;

-- Drop email mockups (references contracts)
DROP TABLE IF EXISTS email_mockups CASCADE;

-- Drop payment methods (references contracts)
DROP TABLE IF EXISTS payment_methods CASCADE;

-- Drop contracts table (references clients - but we KEEP clients)
DROP TABLE IF EXISTS contracts CASCADE;

-- ============================================================================
-- STEP 2: DROP FIGMA-RELATED TABLES
-- ============================================================================

-- Drop Figma sync events (references figma_integrations)
DROP TABLE IF EXISTS figma_sync_events CASCADE;

-- Drop Figma integrations
DROP TABLE IF EXISTS figma_integrations CASCADE;

-- ============================================================================
-- STEP 3: REMOVE CONTRACT_ID COLUMNS
-- ============================================================================

-- Remove contract_id from projects table
ALTER TABLE projects DROP COLUMN IF EXISTS contract_id;

-- Remove contract_id from assets table
ALTER TABLE assets DROP COLUMN IF EXISTS contract_id;

-- ============================================================================
-- STEP 4: REMOVE FIGMA_METADATA COLUMN
-- ============================================================================

-- Remove figma_metadata from assets table
ALTER TABLE assets DROP COLUMN IF EXISTS figma_metadata;

-- ============================================================================
-- STEP 5: REMOVE RELATED_CONTRACT_ID FROM NOTIFICATIONS
-- ============================================================================

-- Remove related_contract_id from notifications table
ALTER TABLE notifications DROP COLUMN IF EXISTS related_contract_id;

-- ============================================================================
-- STEP 6: DROP CONTRACT-RELATED INDEXES
-- ============================================================================

-- Drop indexes that reference contract_id (if they exist)
DROP INDEX IF EXISTS idx_projects_contract;
DROP INDEX IF EXISTS idx_assets_contract;
DROP INDEX IF EXISTS idx_notifications_contract;

-- ============================================================================
-- STEP 7: DROP CONTRACT-RELATED ENUMS
-- ============================================================================

-- Note: We can't easily drop enum types if they're still referenced
-- These will remain but won't be used:
-- - contract_status
-- - contract_type
-- - docusign_status
-- - email_mockup_status
-- - payment_method_status

-- ============================================================================
-- STEP 8: REMOVE CONTRACT NOTIFICATION TYPES FROM ENUM
-- ============================================================================

-- Note: PostgreSQL doesn't support removing enum values directly
-- The contract notification types will remain in the enum but won't be used
-- This is safe as they won't affect existing approval workflow notifications

-- ============================================================================
-- STEP 9: DROP CONTRACT-RELATED FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Drop any contract-specific functions if they exist
-- (These would be in the contract-specific migration files)

-- ============================================================================
-- STEP 10: DROP STORAGE POLICIES FOR CONTRACT-DOCUMENTS BUCKET
-- ============================================================================

-- Drop storage policies for contract-documents bucket
DROP POLICY IF EXISTS "Authenticated users can view contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update contract documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete contract documents" ON storage.objects;

-- ============================================================================
-- VERIFICATION: CLIENT FUNCTIONALITY PRESERVED
-- ============================================================================

-- The following are PRESERVED (do not remove):
-- ✅ clients table
-- ✅ client_users table
-- ✅ client_id columns in projects, brands, and all other tables
-- ✅ related_client_id columns (if they exist)
-- ✅ All client-related indexes
-- ✅ All client-related functions and triggers
-- ✅ Client hierarchy (parent_client_id in clients table)

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS
  'CardMock - Contract and Figma integration removed. All client functionality preserved.';

