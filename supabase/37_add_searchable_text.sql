-- ============================================================================
-- MIGRATION 37: Add Searchable Text Fields
-- ============================================================================
-- Adds searchable_text fields to contract_documents and assets tables
-- Enables full-text search within document and asset content
-- ============================================================================

-- Add searchable_text to contract_documents
ALTER TABLE contract_documents
  ADD COLUMN IF NOT EXISTS searchable_text TEXT;

-- Add searchable_text to assets
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS searchable_text TEXT;

-- Create indexes for full-text search (using GIN for better performance with large text)
-- Note: PostgreSQL full-text search requires tsvector, but we'll use ILIKE for now
-- For better performance with large datasets, consider adding a tsvector column and GIN index
CREATE INDEX IF NOT EXISTS idx_contract_documents_searchable_text 
  ON contract_documents USING gin(to_tsvector('english', COALESCE(searchable_text, '')));

CREATE INDEX IF NOT EXISTS idx_assets_searchable_text 
  ON assets USING gin(to_tsvector('english', COALESCE(searchable_text, '')));

-- Add comments
COMMENT ON COLUMN contract_documents.searchable_text IS 'Extracted text content from document for full-text search';
COMMENT ON COLUMN assets.searchable_text IS 'Extracted text content from asset for full-text search';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

