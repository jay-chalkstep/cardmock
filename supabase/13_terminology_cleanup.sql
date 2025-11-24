-- Migration 13: Terminology Cleanup (Modernization v3.5.0)
--
-- This migration updates database terminology to align with the modernization plan:
-- 1. Renames card_mockups -> assets (visual brand applications)
-- 2. Renames card_templates -> templates (design templates)
-- 3. Updates all foreign key references
-- 4. Creates compatibility views for backward compatibility during transition
-- 5. Updates comments and documentation
--
-- Date: 2025-10-28
-- Version: 3.5.0
--
-- WARNING: This is a breaking change. Ensure application code is updated
-- after this migration runs, or use the compatibility views temporarily.
-- ============================================================================

-- ============================================================================
-- STEP 1: Rename main tables
-- ============================================================================

-- Rename card_mockups to assets
ALTER TABLE card_mockups RENAME TO assets;

-- Rename card_templates to templates
ALTER TABLE card_templates RENAME TO templates;

-- ============================================================================
-- STEP 2: Rename columns that reference mockup_id (only if tables exist)
-- ============================================================================

-- Rename mockup_id to asset_id in related tables (using DO blocks to check existence)

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mockup_comments') THEN
    ALTER TABLE mockup_comments RENAME COLUMN mockup_id TO asset_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mockup_reviewers') THEN
    ALTER TABLE mockup_reviewers RENAME COLUMN mockup_id TO asset_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mockup_stage_progress') THEN
    ALTER TABLE mockup_stage_progress RENAME COLUMN mockup_id TO asset_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mockup_ai_metadata') THEN
    ALTER TABLE mockup_ai_metadata RENAME COLUMN mockup_id TO asset_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'folder_suggestions') THEN
    ALTER TABLE folder_suggestions RENAME COLUMN mockup_id TO asset_id;
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Rename constraints to match new table names
-- ============================================================================

-- Rename primary key constraints
ALTER TABLE assets
  RENAME CONSTRAINT card_mockups_pkey TO assets_pkey;
ALTER TABLE templates
  RENAME CONSTRAINT card_templates_pkey TO templates_pkey;

-- Note: No foreign key constraint renames needed for folder_items or project_assets
-- because those tables don't exist

-- ============================================================================
-- STEP 4: Rename indexes
-- ============================================================================

-- Drop old indexes and create new ones for assets table
DROP INDEX IF EXISTS idx_mockups_created_by;
DROP INDEX IF EXISTS idx_card_mockups_organization_id;
DROP INDEX IF EXISTS idx_card_mockups_logo_id;
DROP INDEX IF EXISTS idx_card_mockups_template_id;
DROP INDEX IF EXISTS idx_mockups_folder;
DROP INDEX IF EXISTS idx_mockups_project;
DROP INDEX IF EXISTS idx_mockups_project_org;

CREATE INDEX idx_assets_created_by ON assets(created_by, organization_id);
CREATE INDEX idx_assets_organization_id ON assets(organization_id);
CREATE INDEX idx_assets_created_at ON assets(created_at DESC);
CREATE INDEX idx_assets_logo_id ON assets(logo_id);
CREATE INDEX idx_assets_template_id ON assets(template_id);
CREATE INDEX idx_assets_folder ON assets(folder_id, organization_id);
CREATE INDEX idx_assets_project ON assets(project_id);
CREATE INDEX idx_assets_project_org ON assets(project_id, organization_id);

-- Note: Not recreating templates indexes because the templates table
-- from migration 01 doesn't have created_by, organization_id, or is_template columns

-- ============================================================================
-- STEP 5: Create compatibility views for backward compatibility
-- ============================================================================

-- Create view for card_mockups pointing to assets
CREATE OR REPLACE VIEW card_mockups AS
SELECT
  id,
  mockup_name,
  logo_id,
  template_id,
  logo_x,
  logo_y,
  logo_scale,
  mockup_image_url,
  folder_id,
  project_id,
  created_by,
  organization_id,
  created_at,
  updated_at
FROM assets;

-- Create view for card_templates pointing to templates
CREATE OR REPLACE VIEW card_templates AS
SELECT
  id,
  template_name,
  template_url,
  file_type,
  file_size,
  uploaded_date,
  created_by,
  organization_id,
  created_at,
  updated_at
FROM templates;

-- Create INSTEAD OF triggers to handle INSERT/UPDATE/DELETE on views
-- This allows the application to continue working during the transition

-- Trigger for card_mockups view INSERT
CREATE OR REPLACE FUNCTION card_mockups_insert() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO assets (
    id, mockup_name, logo_id, template_id, logo_x, logo_y, logo_scale,
    mockup_image_url, folder_id, project_id, created_by, organization_id,
    created_at, updated_at
  ) VALUES (
    NEW.id, NEW.mockup_name, NEW.logo_id, NEW.template_id, NEW.logo_x, NEW.logo_y, NEW.logo_scale,
    NEW.mockup_image_url, NEW.folder_id, NEW.project_id, NEW.created_by, NEW.organization_id,
    NEW.created_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_mockups_insert_trigger
  INSTEAD OF INSERT ON card_mockups
  FOR EACH ROW EXECUTE FUNCTION card_mockups_insert();

-- Trigger for card_mockups view UPDATE
CREATE OR REPLACE FUNCTION card_mockups_update() RETURNS TRIGGER AS $$
BEGIN
  UPDATE assets SET
    mockup_name = NEW.mockup_name,
    logo_id = NEW.logo_id,
    template_id = NEW.template_id,
    logo_x = NEW.logo_x,
    logo_y = NEW.logo_y,
    logo_scale = NEW.logo_scale,
    mockup_image_url = NEW.mockup_image_url,
    folder_id = NEW.folder_id,
    project_id = NEW.project_id,
    created_by = NEW.created_by,
    organization_id = NEW.organization_id,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_mockups_update_trigger
  INSTEAD OF UPDATE ON card_mockups
  FOR EACH ROW EXECUTE FUNCTION card_mockups_update();

-- Trigger for card_mockups view DELETE
CREATE OR REPLACE FUNCTION card_mockups_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM assets WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_mockups_delete_trigger
  INSTEAD OF DELETE ON card_mockups
  FOR EACH ROW EXECUTE FUNCTION card_mockups_delete();

-- Trigger for card_templates view INSERT
CREATE OR REPLACE FUNCTION card_templates_insert() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO templates (
    id, template_name, template_url, file_type, file_size, uploaded_date,
    created_by, organization_id, created_at, updated_at
  ) VALUES (
    NEW.id, NEW.template_name, NEW.template_url, NEW.file_type, NEW.file_size, NEW.uploaded_date,
    NEW.created_by, NEW.organization_id, NEW.created_at, NEW.updated_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_templates_insert_trigger
  INSTEAD OF INSERT ON card_templates
  FOR EACH ROW EXECUTE FUNCTION card_templates_insert();

-- Trigger for card_templates view UPDATE
CREATE OR REPLACE FUNCTION card_templates_update() RETURNS TRIGGER AS $$
BEGIN
  UPDATE templates SET
    template_name = NEW.template_name,
    template_url = NEW.template_url,
    file_type = NEW.file_type,
    file_size = NEW.file_size,
    uploaded_date = NEW.uploaded_date,
    created_by = NEW.created_by,
    organization_id = NEW.organization_id,
    updated_at = NEW.updated_at
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_templates_update_trigger
  INSTEAD OF UPDATE ON card_templates
  FOR EACH ROW EXECUTE FUNCTION card_templates_update();

-- Trigger for card_templates view DELETE
CREATE OR REPLACE FUNCTION card_templates_delete() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM templates WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER card_templates_delete_trigger
  INSTEAD OF DELETE ON card_templates
  FOR EACH ROW EXECUTE FUNCTION card_templates_delete();

-- ============================================================================
-- STEP 6: Update table comments with new terminology
-- ============================================================================

COMMENT ON TABLE assets IS
  'Brand assets - visual applications of brand elements (formerly card_mockups). Includes marketing materials, social media graphics, presentations, etc.';

COMMENT ON TABLE templates IS
  'Design templates - reusable canvas configurations (formerly card_templates). Used as starting points for creating new brand assets.';

-- Note: folders.asset_count doesn't exist as a database column - it's computed in the application layer

-- ============================================================================
-- STEP 7: Update RLS policies if needed
-- ============================================================================

-- RLS policies should continue to work since we're using views
-- No changes needed to RLS at this time

-- ============================================================================
-- STEP 8: Add migration metadata
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
  '13',
  'terminology_cleanup',
  'Renamed card_mockups->assets, card_templates->templates. Added compatibility views for backward compatibility.'
);

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify migration success)
-- ============================================================================

-- Check that tables were renamed
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('assets', 'templates', 'card_mockups', 'card_templates')
-- ORDER BY table_name;
-- Expected: assets (table), templates (table), card_mockups (view), card_templates (view)

-- Check that columns were renamed
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'folder_items'
-- AND column_name IN ('asset_id', 'mockup_id');
-- Expected: asset_id (not mockup_id)

-- Test backward compatibility
-- INSERT INTO card_mockups (id, brand_id, name, created_by, organization_id)
-- VALUES (gen_random_uuid(), gen_random_uuid(), 'Test Asset', 'user_123', 'org_123');
-- Should insert into assets table through the view

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- To rollback this migration:
-- 1. Drop the views: DROP VIEW card_mockups, card_templates CASCADE;
-- 2. Rename tables back:
--    ALTER TABLE assets RENAME TO card_mockups;
--    ALTER TABLE templates RENAME TO card_templates;
-- 3. Rename columns back:
--    ALTER TABLE folders RENAME COLUMN asset_count TO mockup_count;
--    ALTER TABLE folder_items RENAME COLUMN asset_id TO mockup_id;
--    ALTER TABLE project_assets RENAME COLUMN asset_id TO mockup_id;
-- 4. Rename constraints and indexes back to original names
-- 5. Delete migration history record

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS
  'CardMock v3.5.0 - Modernized terminology: assets (brand applications) and templates (design starting points)';