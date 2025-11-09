-- Migration 20: Remove AI Features
-- Drops all AI-related tables and extensions
--
-- This migration removes:
-- - mockup_ai_metadata table
-- - folder_suggestions table
-- - search_queries table
-- - pgvector extension (if not used elsewhere)
--
-- Date: 2025-11-09
-- Version: 3.7.0

-- ============================================================================
-- STEP 1: Drop AI-related tables
-- ============================================================================

-- Drop folder_suggestions table
DROP TABLE IF EXISTS folder_suggestions CASCADE;

-- Drop search_queries table
DROP TABLE IF EXISTS search_queries CASCADE;

-- Drop mockup_ai_metadata table (note: column was renamed to asset_id in migration 13)
DROP TABLE IF EXISTS mockup_ai_metadata CASCADE;

-- ============================================================================
-- STEP 2: Drop pgvector extension (if not used elsewhere)
-- ============================================================================

-- Note: Only drop if not used by other features
-- Check if any other tables use vector type before dropping
DO $$
BEGIN
  -- Check if any other tables use the vector type
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE data_type = 'USER-DEFINED' 
    AND udt_name = 'vector'
  ) THEN
    DROP EXTENSION IF EXISTS vector CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Clean up any remaining indexes
-- ============================================================================

-- Drop any indexes that might have been created for AI features
DROP INDEX IF EXISTS idx_mockup_ai_metadata_mockup CASCADE;
DROP INDEX IF EXISTS idx_folder_suggestions_mockup CASCADE;
DROP INDEX IF EXISTS idx_search_queries_user CASCADE;

-- ============================================================================
-- STEP 4: Record migration
-- ============================================================================

-- Create migration tracking table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_history (
  id SERIAL PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  notes TEXT
);

-- Record this migration
INSERT INTO migration_history (version, name, notes)
VALUES (
  '20',
  'remove_ai_features',
  'Removed all AI-related tables and functionality: mockup_ai_metadata, folder_suggestions, search_queries. Dropped pgvector extension if not used elsewhere.'
);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS
  'Aiproval v3.7.0 - AI features removed for simplification';

