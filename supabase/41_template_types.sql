-- Migration: Add template types and enhanced template management
-- Purpose: Support multiple template formats (CR80, Apple Wallet, Google Wallet) with tagging and archival

-- ============================================================================
-- TEMPLATE TYPES TABLE
-- ============================================================================
-- Reference table for supported template formats (seed data, not user-editable)
CREATE TABLE IF NOT EXISTS template_types (
  id TEXT PRIMARY KEY,                    -- 'prepaid-cr80', 'wallet-apple', etc.
  name TEXT NOT NULL,                     -- 'Prepaid Card (CR80)'
  width INTEGER NOT NULL,                 -- 1013
  height INTEGER NOT NULL,                -- 638
  aspect_ratio DECIMAL(6,4) NOT NULL,     -- 1.5878
  category TEXT NOT NULL,                 -- 'physical' | 'digital'
  description TEXT,
  guide_presets JSONB,                    -- Default guide positions for this type
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE template_types IS 'Reference table for supported template formats';
COMMENT ON COLUMN template_types.id IS 'Unique identifier for template type (e.g., prepaid-cr80)';
COMMENT ON COLUMN template_types.category IS 'Template category: physical (cards) or digital (wallet passes)';
COMMENT ON COLUMN template_types.guide_presets IS 'Default guide positions for precision tools';

-- ============================================================================
-- SEED TEMPLATE TYPES
-- ============================================================================
INSERT INTO template_types (id, name, width, height, aspect_ratio, category, description, guide_presets) VALUES
('prepaid-cr80', 'Prepaid Card (CR80)', 1013, 638, 1.5878, 'physical',
 'Standard credit card size for prepaid, gift, and payment cards. Print-ready at 300 DPI.',
 '{"logo_left": 90, "logo_top": 107, "midpoint": 384}'::jsonb),

('wallet-apple', 'Apple Wallet', 1032, 336, 3.0714, 'digital',
 'Hero/strip image for Apple Wallet passes. Used for loyalty cards, gift cards, and coupons.',
 '{"logo_zone_right": 200, "safe_area": 50}'::jsonb),

('wallet-google', 'Google Wallet', 1032, 336, 3.0714, 'digital',
 'Hero image for Google Wallet passes. Same dimensions as Apple Wallet for cross-platform compatibility.',
 '{"logo_zone_right": 200, "safe_area": 50}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  aspect_ratio = EXCLUDED.aspect_ratio,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  guide_presets = EXCLUDED.guide_presets;

-- ============================================================================
-- UPDATE TEMPLATES TABLE
-- ============================================================================

-- Add template type reference (default to prepaid-cr80 for existing templates)
ALTER TABLE templates ADD COLUMN IF NOT EXISTS template_type_id TEXT DEFAULT 'prepaid-cr80';

-- Add tags array for organization
ALTER TABLE templates ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Add archive functionality
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS archived_by TEXT;

-- Add upload quality rating
ALTER TABLE templates ADD COLUMN IF NOT EXISTS upload_quality TEXT; -- 'excellent' | 'good' | 'fair' | 'poor'

-- Add description field for internal notes
ALTER TABLE templates ADD COLUMN IF NOT EXISTS description TEXT;

-- Add foreign key constraint (but allow existing templates to keep working)
-- We use a soft reference since template_type_id might be null for very old templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'templates_template_type_fk'
  ) THEN
    ALTER TABLE templates
    ADD CONSTRAINT templates_template_type_fk
    FOREIGN KEY (template_type_id)
    REFERENCES template_types(id);
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for tag search using GIN (Generalized Inverted Index)
CREATE INDEX IF NOT EXISTS idx_templates_tags ON templates USING GIN(tags);

-- Index for filtering by template type
CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(template_type_id);

-- Index for filtering archived templates
CREATE INDEX IF NOT EXISTS idx_templates_archived ON templates(is_archived);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_templates_org_type_archived
ON templates(organization_id, template_type_id, is_archived);

-- ============================================================================
-- ADD COMMENTS
-- ============================================================================
COMMENT ON COLUMN templates.template_type_id IS 'Reference to template_types table (e.g., prepaid-cr80, wallet-apple)';
COMMENT ON COLUMN templates.tags IS 'Array of tags for filtering and organization';
COMMENT ON COLUMN templates.is_archived IS 'Whether this template is archived (hidden from normal view)';
COMMENT ON COLUMN templates.archived_at IS 'Timestamp when template was archived';
COMMENT ON COLUMN templates.archived_by IS 'User ID who archived the template';
COMMENT ON COLUMN templates.upload_quality IS 'Quality rating based on upload resolution: excellent, good, fair, poor';
COMMENT ON COLUMN templates.description IS 'Internal notes/description for the template';

-- ============================================================================
-- UPDATE EXISTING TEMPLATES
-- ============================================================================
-- Set default values for existing templates
UPDATE templates
SET
  template_type_id = 'prepaid-cr80',
  is_archived = FALSE,
  tags = '{}'
WHERE template_type_id IS NULL;

-- Set upload quality for existing templates based on scale_factor
UPDATE templates
SET upload_quality = CASE
  WHEN scale_factor IS NULL THEN NULL
  WHEN scale_factor <= 0 THEN 'excellent'      -- Downscaling
  WHEN scale_factor <= 10 THEN 'good'          -- Up to 10% upscale
  WHEN scale_factor <= 30 THEN 'fair'          -- 10-30% upscale
  ELSE 'poor'                                   -- 30%+ upscale
END
WHERE upload_quality IS NULL;
