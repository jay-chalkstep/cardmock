-- ============================================================================
-- Migration 26: Asset Type Extensions
-- ============================================================================
-- Adds asset_type column to assets table to support different asset types
-- Types: mockup, logo, check, prepaid_card, amazon_card, email_mockup, document, other
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE ASSET TYPE ENUM
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE asset_type AS ENUM (
    'mockup',
    'logo',
    'check',
    'prepaid_card',
    'amazon_card',
    'email_mockup',
    'document',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- STEP 2: ADD ASSET_TYPE COLUMN TO ASSETS TABLE
-- ============================================================================

-- Add asset_type column to assets table
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS asset_type asset_type DEFAULT 'mockup';

-- Add index on asset_type for filtering
CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type) WHERE asset_type IS NOT NULL;

-- ============================================================================
-- STEP 3: UPDATE EXISTING ASSETS
-- ============================================================================

-- Update all existing assets to have asset_type = 'mockup' (default)
-- This preserves existing behavior
UPDATE assets
SET asset_type = 'mockup'
WHERE asset_type IS NULL;

-- Make asset_type NOT NULL after setting defaults
ALTER TABLE assets
ALTER COLUMN asset_type SET NOT NULL;

-- ============================================================================
-- STEP 4: COMMENTS
-- ============================================================================

COMMENT ON COLUMN assets.asset_type IS 'Type of asset: mockup, logo, check, prepaid_card, amazon_card, email_mockup, document, or other';
COMMENT ON TYPE asset_type IS 'Enum for different asset types in the system';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

