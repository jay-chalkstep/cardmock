-- ============================================================================
-- COMPLETE CARDMOCK DATABASE SCHEMA
-- ============================================================================
-- This is a consolidated migration that combines all 39 individual migrations
-- into a single file for easy setup of a new Supabase project.
--
-- IMPORTANT NOTES:
-- 1. This migration creates the FINAL schema (after all migrations)
-- 2. AI features (migration 11) are NOT included (removed in migration 20)
-- 3. Contracts and Figma (migrations 23-30, 36-38) are NOT included (removed in migration 39)
-- 4. Table names use final terminology: assets (not card_mockups), templates (not card_templates)
-- 5. Storage buckets must be created separately (see SUPABASE_SETUP.md)
--
-- Usage:
-- 1. Create your Supabase project
-- 2. Run this entire file in the SQL Editor
-- 3. Create storage buckets: logos, card-templates, card-mockups
-- 4. Apply storage policies from section below
-- ============================================================================


-- ============================================================================
-- MIGRATIONS COMBINED
-- ============================================================================

-- ============================================================================
-- FROM: 01_initial_schema.sql
-- ============================================================================

-- Logo Finder / Asset Studio - Initial Database Schema
-- This file creates all the base tables needed for the application
-- Run this first before any other migrations

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- LOGOS TABLE (Main logo storage - will be migrated to logo_variants later)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  domain TEXT,
  description TEXT,
  logo_url TEXT NOT NULL,
  logo_type TEXT, -- file extension: png, svg, jpg, etc.
  logo_format TEXT, -- icon, logo, symbol, etc.
  theme TEXT, -- light, dark, etc.
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  background_color TEXT,
  accent_color TEXT,
  is_uploaded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- BRAND COLORS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS brand_colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logo_id UUID REFERENCES logos(id) ON DELETE CASCADE,
  hex TEXT NOT NULL,
  type TEXT, -- primary, secondary, accent, etc.
  brightness NUMERIC, -- 0-100
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- BRAND FONTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS brand_fonts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  logo_id UUID REFERENCES logos(id) ON DELETE CASCADE,
  font_name TEXT NOT NULL,
  font_type TEXT, -- sans-serif, serif, display, etc.
  origin TEXT, -- google-fonts, custom, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CARD TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name TEXT NOT NULL,
  template_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CARD MOCKUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_mockups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mockup_name TEXT NOT NULL,
  logo_id UUID REFERENCES logos(id) ON DELETE CASCADE,
  template_id UUID REFERENCES card_templates(id) ON DELETE CASCADE,
  logo_x NUMERIC NOT NULL, -- Percentage from left (0-100)
  logo_y NUMERIC NOT NULL, -- Percentage from top (0-100)
  logo_scale NUMERIC NOT NULL, -- Logo width as percentage of card width
  mockup_image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_logos_company_name ON logos(company_name);
CREATE INDEX IF NOT EXISTS idx_logos_domain ON logos(domain);
CREATE INDEX IF NOT EXISTS idx_logos_created_at ON logos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_colors_logo_id ON brand_colors(logo_id);
CREATE INDEX IF NOT EXISTS idx_brand_fonts_logo_id ON brand_fonts(logo_id);
CREATE INDEX IF NOT EXISTS idx_card_mockups_logo_id ON card_mockups(logo_id);
CREATE INDEX IF NOT EXISTS idx_card_mockups_template_id ON card_mockups(template_id);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER update_logos_updated_at
    BEFORE UPDATE ON logos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_colors_updated_at
    BEFORE UPDATE ON brand_colors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_brand_fonts_updated_at
    BEFORE UPDATE ON brand_fonts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_templates_updated_at
    BEFORE UPDATE ON card_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_mockups_updated_at
    BEFORE UPDATE ON card_mockups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Note: Since this is a single-user application, we'll enable RLS but allow
-- all operations. You can customize these policies for multi-user scenarios.

ALTER TABLE logos ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_fonts ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_mockups ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (single-user app)
CREATE POLICY "Allow all for authenticated users" ON logos
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON brand_colors
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON brand_fonts
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON card_templates
    FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON card_mockups
    FOR ALL USING (true);

-- ============================================================================
-- INITIAL SETUP COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run 02_brand_centric.sql to migrate to the brand-centric data model
-- 2. Run 03_storage_setup.sql to create storage buckets


-- ============================================================================
-- FROM: 02_brand_centric.sql
-- ============================================================================

-- Logo Finder / Asset Studio - Brand-Centric Data Model Migration
-- This migration restructures the database to use a brand-centric approach
-- where each brand can have multiple logo variants
--
-- Prerequisites: 01_initial_schema.sql must be run first
-- Run this after 01_initial_schema.sql

-- ============================================================================
-- STEP 1: CREATE BRANDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  description TEXT,
  primary_logo_variant_id UUID, -- Will be set after logo_variants are created
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: MIGRATE LOGOS TABLE TO LOGO_VARIANTS
-- ============================================================================
-- First, create unique brands from existing logos data
INSERT INTO brands (company_name, domain, description)
SELECT DISTINCT
  company_name,
  COALESCE(domain, LOWER(REPLACE(company_name, ' ', '')) || '.com') as domain,
  description
FROM logos
WHERE company_name IS NOT NULL
ON CONFLICT (domain) DO NOTHING;

-- Rename logos to logo_variants
ALTER TABLE logos RENAME TO logo_variants;

-- Add brand_id column to logo_variants
ALTER TABLE logo_variants ADD COLUMN IF NOT EXISTS brand_id UUID;

-- Populate brand_id based on company_name/domain match
UPDATE logo_variants lv
SET brand_id = b.id
FROM brands b
WHERE lv.company_name = b.company_name
  AND (lv.domain = b.domain OR lv.domain IS NULL);

-- For any logo_variants without a brand_id, create a new brand
DO $$
DECLARE
  variant_record RECORD;
  new_brand_id UUID;
BEGIN
  FOR variant_record IN
    SELECT * FROM logo_variants WHERE brand_id IS NULL
  LOOP
    -- Create a new brand
    INSERT INTO brands (company_name, domain, description)
    VALUES (
      variant_record.company_name,
      COALESCE(variant_record.domain, LOWER(REPLACE(variant_record.company_name, ' ', '')) || '.com'),
      variant_record.description
    )
    ON CONFLICT (domain) DO UPDATE SET company_name = EXCLUDED.company_name
    RETURNING id INTO new_brand_id;

    -- Update the logo_variant
    UPDATE logo_variants
    SET brand_id = new_brand_id
    WHERE id = variant_record.id;
  END LOOP;
END $$;

-- Now drop the redundant columns from logo_variants
ALTER TABLE logo_variants DROP COLUMN IF EXISTS company_name;
ALTER TABLE logo_variants DROP COLUMN IF EXISTS domain;
ALTER TABLE logo_variants DROP COLUMN IF EXISTS description;

-- Make brand_id required
ALTER TABLE logo_variants ALTER COLUMN brand_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE logo_variants
  ADD CONSTRAINT fk_logo_variants_brand_id
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 3: UPDATE BRAND_COLORS TO REFERENCE BRANDS
-- ============================================================================
-- Add brand_id column
ALTER TABLE brand_colors ADD COLUMN IF NOT EXISTS brand_id UUID;

-- Migrate data from logo_id to brand_id
UPDATE brand_colors bc
SET brand_id = lv.brand_id
FROM logo_variants lv
WHERE bc.logo_id = lv.id AND bc.brand_id IS NULL;

-- Drop old logo_id foreign key constraint if it exists
ALTER TABLE brand_colors DROP CONSTRAINT IF EXISTS brand_colors_logo_id_fkey;

-- Drop logo_id column (colors are now associated with brands, not individual logos)
ALTER TABLE brand_colors DROP COLUMN IF EXISTS logo_id;

-- Make brand_id required for new records
ALTER TABLE brand_colors ALTER COLUMN brand_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE brand_colors
  ADD CONSTRAINT fk_brand_colors_brand_id
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: UPDATE BRAND_FONTS TO REFERENCE BRANDS
-- ============================================================================
-- Add brand_id column
ALTER TABLE brand_fonts ADD COLUMN IF NOT EXISTS brand_id UUID;

-- Migrate data from logo_id to brand_id
UPDATE brand_fonts bf
SET brand_id = lv.brand_id
FROM logo_variants lv
WHERE bf.logo_id = lv.id AND bf.brand_id IS NULL;

-- Drop old logo_id foreign key constraint if it exists
ALTER TABLE brand_fonts DROP CONSTRAINT IF EXISTS brand_fonts_logo_id_fkey;

-- Drop logo_id column (fonts are now associated with brands, not individual logos)
ALTER TABLE brand_fonts DROP COLUMN IF EXISTS logo_id;

-- Make brand_id required for new records
ALTER TABLE brand_fonts ALTER COLUMN brand_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE brand_fonts
  ADD CONSTRAINT fk_brand_fonts_brand_id
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 5: SET PRIMARY LOGO VARIANT FOR EACH BRAND
-- ============================================================================
-- For each brand, set the first logo variant as the primary one
UPDATE brands b
SET primary_logo_variant_id = (
  SELECT id FROM logo_variants
  WHERE brand_id = b.id
  ORDER BY created_at ASC
  LIMIT 1
)
WHERE primary_logo_variant_id IS NULL;

-- Add foreign key constraint for primary_logo_variant_id
ALTER TABLE brands
  ADD CONSTRAINT fk_brands_primary_logo_variant
  FOREIGN KEY (primary_logo_variant_id)
  REFERENCES logo_variants(id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 6: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_logo_variants_brand_id ON logo_variants(brand_id);
CREATE INDEX IF NOT EXISTS idx_brands_domain ON brands(domain);
CREATE INDEX IF NOT EXISTS idx_brands_company_name ON brands(company_name);
CREATE INDEX IF NOT EXISTS idx_brand_colors_brand_id ON brand_colors(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_fonts_brand_id ON brand_fonts(brand_id);

-- ============================================================================
-- STEP 7: ADD UPDATED_AT TRIGGER TO BRANDS
-- ============================================================================
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 8: ENABLE RLS ON BRANDS TABLE
-- ============================================================================
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON brands
    FOR ALL USING (true);

-- Update RLS policy name for logo_variants to be more accurate
DROP POLICY IF EXISTS "Allow all for authenticated users" ON logo_variants;
CREATE POLICY "Allow all for authenticated users" ON logo_variants
    FOR ALL USING (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The database is now using a brand-centric model where:
-- - Each brand can have multiple logo variants
-- - Colors and fonts are associated with brands, not individual logos
-- - Each brand has a primary logo variant for quick reference
--
-- Next step: Run 03_storage_setup.sql to create storage buckets


-- ============================================================================
-- FROM: 03_storage_setup.sql
-- ============================================================================

-- Logo Finder / Asset Studio - Storage Setup
-- This file sets up Supabase Storage buckets and policies
--
-- NOTE: Storage buckets must be created through the Supabase Dashboard or CLI
-- This file contains the SQL policies to apply after bucket creation
--
-- Prerequisites:
-- 1. Complete 01_initial_schema.sql
-- 2. Complete 02_brand_centric.sql
-- 3. Create storage buckets (see instructions below)

-- ============================================================================
-- STEP 1: CREATE STORAGE BUCKETS (via Supabase Dashboard or CLI)
-- ============================================================================
-- You must create these buckets manually in the Supabase Dashboard:
--
-- 1. Go to Storage section in Supabase Dashboard
-- 2. Click "Create bucket"
-- 3. Create the following buckets:
--
--    Bucket Name: logos
--    Public: Yes
--    File size limit: 10 MB
--    Allowed MIME types: image/png, image/jpeg, image/jpg, image/svg+xml, image/webp
--
--    Bucket Name: card-templates
--    Public: Yes
--    File size limit: 10 MB
--    Allowed MIME types: image/png, image/jpeg, image/jpg, image/svg+xml
--
--    Bucket Name: card-mockups
--    Public: Yes
--    File size limit: 10 MB
--    Allowed MIME types: image/png, image/jpeg, image/jpg
--
-- OR use Supabase CLI:
--   supabase storage create logos --public
--   supabase storage create card-templates --public
--   supabase storage create card-mockups --public

-- ============================================================================
-- STEP 2: STORAGE POLICIES (Run this SQL after creating buckets)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- LOGOS BUCKET POLICIES
-- ----------------------------------------------------------------------------

-- Allow anyone to view files in the logos bucket (public read)
CREATE POLICY "Public read access for logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their uploaded files
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos'
  AND auth.role() = 'authenticated'
);

-- ----------------------------------------------------------------------------
-- CARD-TEMPLATES BUCKET POLICIES
-- ----------------------------------------------------------------------------

-- Allow anyone to view templates (public read)
CREATE POLICY "Public read access for card templates"
ON storage.objects FOR SELECT
USING (bucket_id = 'card-templates');

-- Allow authenticated users to upload templates
CREATE POLICY "Authenticated users can upload card templates"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'card-templates'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update templates
CREATE POLICY "Authenticated users can update card templates"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'card-templates'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete templates
CREATE POLICY "Authenticated users can delete card templates"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'card-templates'
  AND auth.role() = 'authenticated'
);

-- ----------------------------------------------------------------------------
-- CARD-MOCKUPS BUCKET POLICIES
-- ----------------------------------------------------------------------------

-- Allow anyone to view mockups (public read)
CREATE POLICY "Public read access for card mockups"
ON storage.objects FOR SELECT
USING (bucket_id = 'card-mockups');

-- Allow authenticated users to upload mockups
CREATE POLICY "Authenticated users can upload card mockups"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'card-mockups'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update mockups
CREATE POLICY "Authenticated users can update card mockups"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'card-mockups'
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete mockups
CREATE POLICY "Authenticated users can delete card mockups"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'card-mockups'
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- STORAGE SETUP COMPLETE
-- ============================================================================
-- Your storage buckets are now configured with the following access:
-- - Public read access (anyone can view files via public URLs)
-- - Authenticated write access (logged-in users can upload/update/delete)
--
-- Test your setup:
-- 1. Try uploading a logo through the app's upload page
-- 2. Verify the file appears in Supabase Storage
-- 3. Check that the public URL works in your browser
--
-- Troubleshooting:
-- - If uploads fail, check the bucket exists and is public
-- - Verify RLS policies are enabled with: SELECT * FROM storage.policies;
-- - Check browser console for CORS or policy errors


-- ============================================================================
-- FROM: 04_folder_organization.sql
-- ============================================================================

-- Asset Studio - Folder Organization Migration
-- This migration adds folder support and user-level tracking while maintaining backward compatibility
--
-- Prerequisites: Run 01, 02, and 03 migrations first
-- IMPORTANT: This is additive only - all existing data remains functional

-- ============================================================================
-- STEP 1: ADD USER TRACKING TO EXISTING TABLES
-- ============================================================================
-- Add created_by (Clerk user ID) to existing tables
-- NULL values indicate legacy data (pre-migration)

-- Add to card_mockups
ALTER TABLE card_mockups ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add to card_templates
ALTER TABLE card_templates ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add to brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Add organization_id columns BEFORE creating indexes (fixes migration 12 issue)
ALTER TABLE brands ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE card_mockups ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE card_templates ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE logo_variants ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE brand_colors ADD COLUMN IF NOT EXISTS organization_id TEXT;
ALTER TABLE brand_fonts ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mockups_created_by ON card_mockups(created_by, organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON card_templates(created_by, organization_id);
CREATE INDEX IF NOT EXISTS idx_brands_created_by ON brands(created_by, organization_id);

-- ============================================================================
-- STEP 2: CREATE FOLDERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by TEXT NOT NULL, -- Clerk user ID
  organization_id TEXT NOT NULL,
  parent_folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  is_org_shared BOOLEAN DEFAULT false, -- For hybrid model: personal vs org-wide folders
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: LINK MOCKUPS TO FOLDERS
-- ============================================================================
-- Add folder reference (nullable for backward compatibility)
ALTER TABLE card_mockups ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create index for folder queries
CREATE INDEX IF NOT EXISTS idx_mockups_folder ON card_mockups(folder_id, organization_id);

-- ============================================================================
-- STEP 4: ADD INDEXES FOR FOLDERS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_folders_org_user ON folders(organization_id, created_by);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_shared ON folders(organization_id, is_org_shared) WHERE is_org_shared = true;

-- ============================================================================
-- STEP 5: ADD UPDATED_AT TRIGGER FOR FOLDERS
-- ============================================================================
CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: ROW LEVEL SECURITY
-- ============================================================================
-- Enable RLS on folders table
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users within their organization
-- Note: Application layer will handle user-specific filtering
-- This provides a safety net ensuring org isolation
CREATE POLICY "Allow all for authenticated users in org" ON folders
  FOR ALL USING (true);

-- ============================================================================
-- STEP 7: HELPER FUNCTION FOR FOLDER DEPTH CHECK
-- ============================================================================
-- Prevent excessive nesting (recommended max: 3 levels)
CREATE OR REPLACE FUNCTION check_folder_depth()
RETURNS TRIGGER AS $$
DECLARE
  depth INTEGER := 0;
  current_parent UUID;
BEGIN
  current_parent := NEW.parent_folder_id;

  -- Walk up the tree to count depth
  WHILE current_parent IS NOT NULL AND depth < 10 LOOP
    depth := depth + 1;

    SELECT parent_folder_id INTO current_parent
    FROM folders
    WHERE id = current_parent;
  END LOOP;

  -- Prevent nesting beyond 5 levels (configurable)
  IF depth >= 5 THEN
    RAISE EXCEPTION 'Maximum folder nesting depth (5 levels) exceeded';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to folders
CREATE TRIGGER enforce_folder_depth
  BEFORE INSERT OR UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION check_folder_depth();

-- ============================================================================
-- STEP 8: HELPER VIEW FOR MOCKUP COUNTS
-- ============================================================================
-- Create a view to easily get mockup counts per folder
CREATE OR REPLACE VIEW folder_mockup_counts AS
SELECT
  f.id as folder_id,
  f.name as folder_name,
  f.organization_id,
  f.created_by,
  COUNT(m.id) as mockup_count
FROM folders f
LEFT JOIN card_mockups m ON f.id = m.folder_id
GROUP BY f.id, f.name, f.organization_id, f.created_by;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Summary of changes:
-- ✅ Added created_by to card_mockups, card_templates, brands
-- ✅ Created folders table with org/user hybrid support
-- ✅ Linked card_mockups to folders (nullable for backward compatibility)
-- ✅ Added performance indexes
-- ✅ Enabled RLS on folders
-- ✅ Added folder depth validation (max 5 levels)
-- ✅ Created helper view for mockup counts
--
-- Backward compatibility:
-- - Existing mockups with NULL folder_id show as "Unsorted"
-- - Existing mockups with NULL created_by are visible org-wide
-- - All existing queries continue to work unchanged
--
-- Next steps:
-- 1. Update application code to populate created_by when saving
-- 2. Build folder management UI
-- 3. Add folder selector to mockup creation flow


-- ============================================================================
-- FROM: 05_collaboration.sql
-- ============================================================================

-- Migration 05: Collaboration System
-- Adds visual annotation and review capabilities to mockups

-- Enable UUID extension if not already enabled

-- ============================================================================
-- MOCKUP COMMENTS TABLE
-- ============================================================================
-- Stores all comments on mockups with visual annotation data

CREATE TABLE IF NOT EXISTS mockup_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mockup_id UUID NOT NULL REFERENCES card_mockups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID
  user_name TEXT NOT NULL, -- Display name from Clerk
  user_email TEXT NOT NULL, -- Email for notifications
  user_avatar TEXT, -- Profile pic URL from Clerk
  comment_text TEXT NOT NULL,

  -- Visual annotation fields
  annotation_data JSONB, -- Stores Konva shape objects (arrows, circles, paths, etc.)
  position_x DECIMAL(5,2), -- X position as % from left (0-100), for pin markers
  position_y DECIMAL(5,2), -- Y position as % from top (0-100), for pin markers
  annotation_type TEXT, -- 'pin' | 'arrow' | 'circle' | 'rect' | 'freehand' | 'text' | 'none'
  annotation_color TEXT DEFAULT '#FF6B6B', -- Color for annotation (assigned per reviewer)

  -- Status and metadata
  is_resolved BOOLEAN DEFAULT false, -- For marking comments as resolved
  parent_comment_id UUID REFERENCES mockup_comments(id) ON DELETE CASCADE, -- For threaded replies

  -- Audit fields
  organization_id TEXT NOT NULL, -- Clerk org ID for multi-tenancy
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_mockup_comments_mockup ON mockup_comments(mockup_id, created_at DESC);
CREATE INDEX idx_mockup_comments_user ON mockup_comments(user_id, created_at DESC);
CREATE INDEX idx_mockup_comments_org ON mockup_comments(organization_id);
CREATE INDEX idx_mockup_comments_resolved ON mockup_comments(is_resolved, mockup_id);
CREATE INDEX idx_mockup_comments_parent ON mockup_comments(parent_comment_id);

-- ============================================================================
-- MOCKUP REVIEWERS TABLE
-- ============================================================================
-- Tracks who's been invited to review mockups and their status

CREATE TABLE IF NOT EXISTS mockup_reviewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mockup_id UUID NOT NULL REFERENCES card_mockups(id) ON DELETE CASCADE,

  -- Reviewer info (from Clerk)
  reviewer_id TEXT NOT NULL, -- Clerk user ID
  reviewer_name TEXT NOT NULL, -- Display name
  reviewer_email TEXT NOT NULL, -- For email notifications
  reviewer_avatar TEXT, -- Profile pic URL
  reviewer_color TEXT, -- Assigned color for their annotations

  -- Review status
  status TEXT DEFAULT 'pending', -- 'pending' | 'viewed' | 'approved' | 'changes_requested'

  -- Invitation details
  invited_by TEXT NOT NULL, -- Clerk user ID of person who invited
  invited_at TIMESTAMP DEFAULT NOW(),
  invitation_message TEXT, -- Optional message from inviter

  -- Activity timestamps
  viewed_at TIMESTAMP, -- First time reviewer opened the mockup
  responded_at TIMESTAMP, -- When they approved/requested changes
  response_note TEXT, -- Note added when approving or requesting changes

  -- Multi-tenancy
  organization_id TEXT NOT NULL, -- Clerk org ID

  -- Prevent duplicate invitations
  UNIQUE(mockup_id, reviewer_id)
);

-- Indexes for performance
CREATE INDEX idx_mockup_reviewers_mockup ON mockup_reviewers(mockup_id);
CREATE INDEX idx_mockup_reviewers_reviewer ON mockup_reviewers(reviewer_id, status);
CREATE INDEX idx_mockup_reviewers_org ON mockup_reviewers(organization_id);
CREATE INDEX idx_mockup_reviewers_status ON mockup_reviewers(status, invited_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE mockup_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mockup_reviewers ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- MOCKUP COMMENTS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view comments on mockups they created or are reviewing
CREATE POLICY "Users can view relevant comments"
ON mockup_comments FOR SELECT
USING (
  organization_id IN (
    SELECT unnest(string_to_array(current_setting('request.jwt.claims', true)::json->>'orgs', ','))
  )
  AND (
    -- Creator can see all comments on their mockup
    mockup_id IN (
      SELECT id FROM card_mockups
      WHERE created_by = current_setting('request.jwt.claims', true)::json->>'sub'
    )
    OR
    -- Reviewer can see comments on mockups they're reviewing
    mockup_id IN (
      SELECT mockup_id FROM mockup_reviewers
      WHERE reviewer_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- Users can add comments to mockups they have access to
CREATE POLICY "Users can add comments"
ON mockup_comments FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT unnest(string_to_array(current_setting('request.jwt.claims', true)::json->>'orgs', ','))
  )
  AND user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  AND (
    -- Creator can comment on their own mockup
    mockup_id IN (
      SELECT id FROM card_mockups
      WHERE created_by = current_setting('request.jwt.claims', true)::json->>'sub'
    )
    OR
    -- Reviewer can comment on mockups they're reviewing
    mockup_id IN (
      SELECT mockup_id FROM mockup_reviewers
      WHERE reviewer_id = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON mockup_comments FOR UPDATE
USING (
  user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  AND organization_id IN (
    SELECT unnest(string_to_array(current_setting('request.jwt.claims', true)::json->>'orgs', ','))
  )
);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON mockup_comments FOR DELETE
USING (
  user_id = current_setting('request.jwt.claims', true)::json->>'sub'
  AND organization_id IN (
    SELECT unnest(string_to_array(current_setting('request.jwt.claims', true)::json->>'orgs', ','))
  )
);

-- ----------------------------------------------------------------------------
-- MOCKUP REVIEWERS POLICIES
-- ----------------------------------------------------------------------------

-- Users can view reviewers on mockups they created or are reviewing
CREATE POLICY "Users can view relevant reviewers"
ON mockup_reviewers FOR SELECT
USING (
  organization_id IN (
    SELECT unnest(string_to_array(current_setting('request.jwt.claims', true)::json->>'orgs', ','))
  )
  AND (
    -- Creator can see all reviewers on their mockup
    mockup_id IN (
      SELECT id FROM card_mockups
      WHERE created_by = current_setting('request.jwt.claims', true)::json->>'sub'
    )
    OR
    -- Reviewer can see themselves and other reviewers
    reviewer_id = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Only mockup creators can add reviewers
CREATE POLICY "Creators can add reviewers"
ON mockup_reviewers FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT unnest(string_to_array(current_setting('request.jwt.claims', true)::json->>'orgs', ','))
  )
  AND invited_by = current_setting('request.jwt.claims', true)::json->>'sub'
  AND mockup_id IN (
    SELECT id FROM card_mockups
    WHERE created_by = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- Reviewers can update their own status, creators can update any reviewer
CREATE POLICY "Reviewers can update own status"
ON mockup_reviewers FOR UPDATE
USING (
  organization_id IN (
    SELECT unnest(string_to_array(current_setting('request.jwt.claims', true)::json->>'orgs', ','))
  )
  AND (
    -- Reviewer can update their own record
    reviewer_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR
    -- Creator can update any reviewer on their mockup
    mockup_id IN (
      SELECT id FROM card_mockups
      WHERE created_by = current_setting('request.jwt.claims', true)::json->>'sub'
    )
  )
);

-- Creators can remove reviewers
CREATE POLICY "Creators can remove reviewers"
ON mockup_reviewers FOR DELETE
USING (
  organization_id IN (
    SELECT unnest(string_to_array(current_setting('request.jwt.claims', true)::json->>'orgs', ','))
  )
  AND mockup_id IN (
    SELECT id FROM card_mockups
    WHERE created_by = current_setting('request.jwt.claims', true)::json->>'sub'
  )
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for mockup_comments
CREATE TRIGGER update_mockup_comments_updated_at
BEFORE UPDATE ON mockup_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COLOR ASSIGNMENT HELPER
-- ============================================================================

-- Predefined colors for reviewer annotations (rotates through list)
-- Colors chosen for good contrast against typical mockup backgrounds
COMMENT ON COLUMN mockup_reviewers.reviewer_color IS
  'Auto-assigned from: #FF6B6B (red), #4ECDC4 (teal), #FFE66D (yellow), #95E1D3 (mint), #A29BFE (purple), #FD79A8 (pink)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE mockup_comments IS 'Stores comments and visual annotations on mockups for collaboration';
COMMENT ON TABLE mockup_reviewers IS 'Tracks review invitations and approval status for mockups';


-- ============================================================================
-- FROM: 06_comment_audit_trail.sql
-- ============================================================================

-- Migration 06: Comment Audit Trail and Resolution System
-- Adds complete chain of custody for comments with resolution workflow

-- ============================================================================
-- ADD AUDIT TRAIL COLUMNS TO MOCKUP_COMMENTS
-- ============================================================================

-- Resolution tracking (enhance existing is_resolved field)
ALTER TABLE mockup_comments
ADD COLUMN IF NOT EXISTS resolved_by TEXT, -- Clerk user ID who resolved
ADD COLUMN IF NOT EXISTS resolved_by_name TEXT, -- Display name for audit
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMP, -- When resolved
ADD COLUMN IF NOT EXISTS resolution_note TEXT; -- Resolution explanation

-- Soft delete for preserving history
ALTER TABLE mockup_comments
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP, -- Soft delete timestamp
ADD COLUMN IF NOT EXISTS deleted_by TEXT, -- Clerk user ID who deleted
ADD COLUMN IF NOT EXISTS deleted_by_name TEXT; -- Display name for audit

-- Edit history tracking
ALTER TABLE mockup_comments
ADD COLUMN IF NOT EXISTS edit_history JSONB DEFAULT '[]'::jsonb, -- Array of edits
ADD COLUMN IF NOT EXISTS original_comment_text TEXT; -- First version for audit

-- Backfill original_comment_text for existing comments
UPDATE mockup_comments
SET original_comment_text = comment_text
WHERE original_comment_text IS NULL;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for filtering resolved/unresolved comments
CREATE INDEX IF NOT EXISTS idx_mockup_comments_resolved_status
ON mockup_comments(mockup_id, is_resolved, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for soft delete filtering
CREATE INDEX IF NOT EXISTS idx_mockup_comments_not_deleted
ON mockup_comments(mockup_id, created_at DESC)
WHERE deleted_at IS NULL;

-- Index for resolved comments
CREATE INDEX IF NOT EXISTS idx_mockup_comments_resolved_by
ON mockup_comments(resolved_by, resolved_at DESC)
WHERE is_resolved = true;

-- ============================================================================
-- HELPER COMMENTS
-- ============================================================================

COMMENT ON COLUMN mockup_comments.resolved_by IS
  'Clerk user ID of person who marked comment as resolved';

COMMENT ON COLUMN mockup_comments.resolution_note IS
  'Explanation of how/why comment was resolved - what action was taken';

COMMENT ON COLUMN mockup_comments.deleted_at IS
  'Soft delete timestamp - comments are never truly deleted for audit trail';

COMMENT ON COLUMN mockup_comments.edit_history IS
  'JSONB array tracking all edits: [{edited_at, edited_by, edited_by_name, old_text, new_text}]';

COMMENT ON COLUMN mockup_comments.original_comment_text IS
  'Original comment text when first created - preserved for audit trail';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- This migration adds complete audit trail capabilities:
-- 1. Resolution workflow with notes
-- 2. Soft deletes (never lose history)
-- 3. Edit history tracking
-- 4. Original text preservation
-- All existing comments are fully compatible (new columns nullable except original_comment_text)


-- ============================================================================
-- FROM: 07_projects.sql
-- ============================================================================

-- ============================================================================
-- MIGRATION 07: PROJECTS
-- Adds project-based organization for client engagements
-- ============================================================================

-- Create enum for project status
CREATE TYPE project_status AS ENUM ('active', 'completed', 'archived');

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  client_name TEXT,
  description TEXT,
  status project_status DEFAULT 'active',
  color TEXT DEFAULT '#3B82F6', -- For UI customization (blue default)
  created_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add project reference to mockups (nullable - mockups can exist without projects)
ALTER TABLE card_mockups
ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

-- Performance indexes
CREATE INDEX idx_projects_org ON projects(organization_id);
CREATE INDEX idx_projects_org_status ON projects(organization_id, status);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_mockups_project ON card_mockups(project_id);
CREATE INDEX idx_mockups_project_org ON card_mockups(project_id, organization_id);

-- Updated_at trigger (follows existing pattern from folders)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (Note: With Clerk auth, all access via API routes)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (following same pattern as folders)
-- Authentication is handled at API route level with Clerk
CREATE POLICY "Allow all for authenticated users in org"
  ON projects FOR ALL
  USING (true);

-- Comment explaining RLS pattern
COMMENT ON TABLE projects IS 'All access through API routes with Clerk authentication. RLS enabled but permissive - security enforced at API layer.';


-- ============================================================================
-- FROM: 08_workflows.sql
-- ============================================================================

-- ============================================================================
-- MIGRATION 08: WORKFLOWS
-- Adds reusable workflow templates with multi-stage approval sequences
-- ============================================================================

-- Create enum for workflow stage colors
CREATE TYPE workflow_stage_color AS ENUM (
  'yellow',   -- Design/Draft stages
  'green',    -- Approved/Ready stages
  'blue',     -- Review/In-Progress stages
  'purple',   -- Final/Stakeholder stages
  'orange',   -- Changes Requested stages
  'red',      -- Blocked/Rejected stages
  'gray'      -- Pending/Not Started stages
);

-- Workflows table - reusable templates for approval sequences
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {order: number, name: string, color: workflow_stage_color}
  is_default BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project stage reviewers - assigns users to specific workflow stages per project
CREATE TABLE project_stage_reviewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL, -- Which stage in the workflow (1, 2, 3...)
  user_id TEXT NOT NULL, -- Clerk user ID
  user_name TEXT NOT NULL, -- Cached for display
  user_image_url TEXT, -- Cached avatar URL
  added_by TEXT NOT NULL, -- Clerk user ID who assigned this reviewer
  created_at TIMESTAMP DEFAULT NOW(),

  -- Prevent duplicate reviewers in same stage
  UNIQUE(project_id, stage_order, user_id)
);

-- Add workflow reference to projects (nullable - projects can exist without workflows)
ALTER TABLE projects
ADD COLUMN workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL;

-- Performance indexes
CREATE INDEX idx_workflows_org ON workflows(organization_id);
CREATE INDEX idx_workflows_org_active ON workflows(organization_id, is_archived) WHERE is_archived = false;
CREATE INDEX idx_workflows_org_default ON workflows(organization_id, is_default) WHERE is_default = true;
CREATE INDEX idx_workflows_created_by ON workflows(created_by);

CREATE INDEX idx_project_reviewers_project ON project_stage_reviewers(project_id);
CREATE INDEX idx_project_reviewers_project_stage ON project_stage_reviewers(project_id, stage_order);
CREATE INDEX idx_project_reviewers_user ON project_stage_reviewers(user_id);

CREATE INDEX idx_projects_workflow ON projects(workflow_id);

-- Updated_at trigger for workflows (reuse existing function)
CREATE TRIGGER update_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies (Note: With Clerk auth, all access via API routes)
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_stage_reviewers ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (following same pattern as projects/folders)
-- Authentication is handled at API route level with Clerk
CREATE POLICY "Allow all for authenticated users in org"
  ON workflows FOR ALL
  USING (true);

CREATE POLICY "Allow all for authenticated users in org"
  ON project_stage_reviewers FOR ALL
  USING (true);

-- Comments explaining RLS pattern
COMMENT ON TABLE workflows IS 'Reusable multi-stage approval workflow templates. All access through API routes with Clerk authentication. RLS enabled but permissive - security enforced at API layer.';
COMMENT ON TABLE project_stage_reviewers IS 'Reviewer assignments for each stage of a project workflow. All access through API routes with Clerk authentication.';

-- Helper function to validate workflow stages JSONB structure
CREATE OR REPLACE FUNCTION validate_workflow_stages()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure stages is an array
  IF jsonb_typeof(NEW.stages) != 'array' THEN
    RAISE EXCEPTION 'stages must be a JSON array';
  END IF;

  -- Ensure at least one stage exists
  IF jsonb_array_length(NEW.stages) < 1 THEN
    RAISE EXCEPTION 'workflow must have at least one stage';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_workflow_stages_trigger
  BEFORE INSERT OR UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION validate_workflow_stages();


-- ============================================================================
-- FROM: 09_stage_progress.sql
-- ============================================================================

-- ============================================================================
-- MIGRATION 09: STAGE PROGRESS
-- Tracks mockup progress through multi-stage approval workflows
-- ============================================================================

-- Create enum for stage status
CREATE TYPE stage_status AS ENUM (
'pending',              -- Not yet reached this stage
'in_review',           -- Currently at this stage, awaiting approval
'approved',            -- Stage approved
'changes_requested'    -- Changes requested at this stage
);

-- Mockup stage progress - tracks each mockup's progress through workflow stages
CREATE TABLE mockup_stage_progress (
id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
mockup_id UUID NOT NULL REFERENCES card_mockups(id) ON DELETE CASCADE,
project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
stage_order INTEGER NOT NULL, -- Which stage (1, 2, 3...)
status stage_status NOT NULL DEFAULT 'pending',

-- Reviewer who acted on this stage
reviewed_by TEXT, -- Clerk user ID
reviewed_by_name TEXT,
reviewed_at TIMESTAMP,
notes TEXT, -- Approval notes or change request details

-- Email notification tracking
notification_sent BOOLEAN DEFAULT false,
notification_sent_at TIMESTAMP,

created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP DEFAULT NOW(),

-- Ensure one progress record per mockup per stage
UNIQUE(mockup_id, stage_order)
);

-- Performance indexes
CREATE INDEX idx_stage_progress_mockup ON mockup_stage_progress(mockup_id);
CREATE INDEX idx_stage_progress_project ON mockup_stage_progress(project_id);
CREATE INDEX idx_stage_progress_status ON mockup_stage_progress(status);
CREATE INDEX idx_stage_progress_project_stage ON mockup_stage_progress(project_id, stage_order);
CREATE INDEX idx_stage_progress_mockup_stage ON mockup_stage_progress(mockup_id, stage_order);

-- Updated_at trigger
CREATE TRIGGER update_stage_progress_updated_at
BEFORE UPDATE ON mockup_stage_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to initialize stage progress when mockup is assigned to a project with workflow
CREATE OR REPLACE FUNCTION initialize_mockup_stage_progress()
RETURNS TRIGGER AS $$
DECLARE
workflow_record RECORD;
stage RECORD;
BEGIN
-- Only initialize if mockup is being assigned to a project (not null)
-- and either it's a new mockup or the project_id is changing
IF NEW.project_id IS NOT NULL AND (
TG_OP = 'INSERT' OR
(TG_OP = 'UPDATE' AND (OLD.project_id IS NULL OR OLD.project_id != NEW.project_id))
) THEN
-- Check if project has a workflow
SELECT w.* INTO workflow_record
FROM workflows w
JOIN projects p ON p.workflow_id = w.id
WHERE p.id = NEW.project_id;

IF FOUND AND workflow_record.stages IS NOT NULL THEN
  -- Delete any existing progress for this mockup (in case of project reassignment)
  DELETE FROM mockup_stage_progress WHERE mockup_id = NEW.id;

  -- Create progress records for each stage in the workflow
  FOR stage IN
    SELECT
      (stage_data->>'order')::INTEGER as stage_order
    FROM jsonb_array_elements(workflow_record.stages) as stage_data
    ORDER BY (stage_data->>'order')::INTEGER
  LOOP
    INSERT INTO mockup_stage_progress (
      mockup_id,
      project_id,
      stage_order,
      status,
      notification_sent
    ) VALUES (
      NEW.id,
      NEW.project_id,
      stage.stage_order,
      CASE
        -- First stage starts in review, all others pending
        WHEN stage.stage_order = 1 THEN 'in_review'::stage_status
        ELSE 'pending'::stage_status
      END,
      false
    );
  END LOOP;

  -- Note: Email notification to stage 1 reviewers will be sent by application
  -- after INSERT completes, to avoid complex async email logic in triggers
END IF;
END IF;

RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-initialize stage progress
CREATE TRIGGER trigger_initialize_mockup_stage_progress
AFTER INSERT OR UPDATE OF project_id ON card_mockups
FOR EACH ROW
EXECUTE FUNCTION initialize_mockup_stage_progress();

-- Function to advance to next stage (called after approval)
CREATE OR REPLACE FUNCTION advance_to_next_stage(
p_mockup_id UUID,
p_current_stage_order INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
v_next_stage_order INTEGER;
v_has_next_stage BOOLEAN;
BEGIN
-- Find the next stage
SELECT stage_order INTO v_next_stage_order
FROM mockup_stage_progress
WHERE mockup_id = p_mockup_id
AND stage_order > p_current_stage_order
ORDER BY stage_order ASC
LIMIT 1;

v_has_next_stage := FOUND;

IF v_has_next_stage THEN
-- Update next stage to in_review
UPDATE mockup_stage_progress
SET
  status = 'in_review',
  updated_at = NOW()
WHERE mockup_id = p_mockup_id
  AND stage_order = v_next_stage_order;

RETURN TRUE;
ELSE
-- No next stage, this was the last one
RETURN FALSE;
END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to reset mockup to first stage (called when changes requested)
CREATE OR REPLACE FUNCTION reset_to_first_stage(
p_mockup_id UUID
)
RETURNS VOID AS $$
BEGIN
-- Reset all stages to pending
UPDATE mockup_stage_progress
SET
status = 'pending',
reviewed_by = NULL,
reviewed_by_name = NULL,
reviewed_at = NULL,
notes = NULL,
notification_sent = false,
notification_sent_at = NULL,
updated_at = NOW()
WHERE mockup_id = p_mockup_id;

-- Set stage 1 to in_review
UPDATE mockup_stage_progress
SET
status = 'in_review',
updated_at = NOW()
WHERE mockup_id = p_mockup_id
AND stage_order = 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE mockup_stage_progress ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated users (following same pattern as other tables)
-- Authentication is handled at API route level with Clerk
CREATE POLICY "Allow all for authenticated users in org"
ON mockup_stage_progress FOR ALL
USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE mockup_stage_progress IS 'Tracks each mockup''s progress through workflow approval stages. All access through API routes with Clerk authentication. RLS enabled but permissive - security enforced at API layer.';
COMMENT ON COLUMN mockup_stage_progress.status IS 'Current status of this stage: pending (not reached), in_review (awaiting approval), approved (stage passed), changes_requested (rejected)';
COMMENT ON FUNCTION advance_to_next_stage IS 'Advances a mockup to the next workflow stage after approval. Returns TRUE if there is a next stage, FALSE if this was the last stage.';
COMMENT ON FUNCTION reset_to_first_stage IS 'Resets a mockup back to stage 1 in_review when changes are requested at any stage. Clears all approval data.';


-- ============================================================================
-- FROM: 10_remove_old_review_system.sql
-- ============================================================================

-- ============================================================================
-- MIGRATION 10: REMOVE OLD REVIEW SYSTEM
-- Drops the legacy ad-hoc reviewer invitation system (mockup_reviewers table)
-- The new stage-based workflow approval system (mockup_stage_progress) remains
-- ============================================================================

-- Drop the old review system table
-- This table stored ad-hoc reviewer invitations before the workflow system
DROP TABLE IF EXISTS mockup_reviewers CASCADE;

-- Note: mockup_comments table is preserved (still used for annotations)
-- Note: mockup_stage_progress table is preserved (new workflow system)
-- Note: project_stage_reviewers table is preserved (workflow stage assignments)

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Removed: mockup_reviewers table (old ad-hoc review invitations)
-- Kept: mockup_comments (annotations/comments on mockups)
-- Kept: mockup_stage_progress (new workflow progress tracking)
-- Kept: project_stage_reviewers (workflow stage reviewer assignments)
-- ============================================================================


-- ============================================================================
-- FROM: 12_fix_brands_multi_tenancy.sql
-- ============================================================================

-- Migration 12: Fix Multi-Tenancy for All Brand-Related Tables
--
-- This migration fixes a critical multi-tenancy bug where:
-- 1. The organization_id column was missing from MULTIPLE tables (brands, card_mockups,
--    card_templates, logo_variants, brand_colors, brand_fonts)
-- 2. Migration 04 created indexes referencing organization_id but never created the column
-- 3. The unique constraint on brands.domain prevented different orgs from saving the same brand
-- 4. Application code referenced organization_id throughout but column didn't exist
--
-- This migration enables true multi-tenant storage where different organizations
-- can independently save and manage the same brands, mockups, and templates.
--
-- Date: 2025-10-28
-- Version: 3.4.1

-- ============================================================================
-- STEP 1: Add missing organization_id column to ALL affected tables
-- ============================================================================

-- Add organization_id column to brands table (nullable initially for safety)
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Add organization_id to card_mockups (referenced in migration 04 indexes but never created)
ALTER TABLE card_mockups
ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Add organization_id to card_templates (referenced in migration 04 indexes but never created)
ALTER TABLE card_templates
ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Add organization_id to logo_variants (referenced in app code but never created)
ALTER TABLE logo_variants
ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Add organization_id to brand_colors (referenced in app code but never created)
ALTER TABLE brand_colors
ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Add organization_id to brand_fonts (referenced in app code but never created)
ALTER TABLE brand_fonts
ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- ============================================================================
-- STEP 2: Handle existing data
-- ============================================================================

-- IMPORTANT: For existing records without organization_id, we have two options:
--
-- OPTION A (Recommended for fresh/test deployments):
--   Delete existing data - users can re-save from scratch
--   Uncomment the following lines:
--
--   DELETE FROM brands WHERE organization_id IS NULL;
--   DELETE FROM card_mockups WHERE organization_id IS NULL;
--   DELETE FROM card_templates WHERE organization_id IS NULL;
--   DELETE FROM logo_variants WHERE organization_id IS NULL;
--   DELETE FROM brand_colors WHERE organization_id IS NULL;
--   DELETE FROM brand_fonts WHERE organization_id IS NULL;
--
-- OPTION B (Recommended for production with existing data):
--   Keep existing data but it will need manual cleanup
--   Records will be visible across all organizations until cleaned up
--   You can identify and reassign them later using created_by field
--
-- For this migration, we'll use OPTION B to preserve data by default.
-- Admins can manually delete orphaned records after migration if needed.

COMMENT ON COLUMN brands.organization_id IS
  'Organization ID from Clerk. NULL values indicate legacy data that needs cleanup.';
COMMENT ON COLUMN card_mockups.organization_id IS
  'Organization ID from Clerk. NULL values indicate legacy data that needs cleanup.';
COMMENT ON COLUMN card_templates.organization_id IS
  'Organization ID from Clerk. NULL values indicate legacy data that needs cleanup.';
COMMENT ON COLUMN logo_variants.organization_id IS
  'Organization ID from Clerk. NULL values indicate legacy data that needs cleanup.';
COMMENT ON COLUMN brand_colors.organization_id IS
  'Organization ID from Clerk. NULL values indicate legacy data that needs cleanup.';
COMMENT ON COLUMN brand_fonts.organization_id IS
  'Organization ID from Clerk. NULL values indicate legacy data that needs cleanup.';

-- ============================================================================
-- STEP 3: Update unique constraints for multi-tenancy
-- ============================================================================

-- Drop the existing global unique constraint on domain
-- This constraint prevented different organizations from saving the same brand
ALTER TABLE brands
DROP CONSTRAINT IF EXISTS brands_domain_key;

-- Add composite unique constraint on (domain, organization_id)
-- This allows different organizations to save the same brand domain
-- while preventing duplicates within the same organization
--
-- NOTE: PostgreSQL treats NULL as distinct, so brands with NULL organization_id
-- can have duplicate domains. This is acceptable for legacy data cleanup.
ALTER TABLE brands
ADD CONSTRAINT brands_domain_organization_key
  UNIQUE (domain, organization_id);

-- ============================================================================
-- STEP 4: Update indexes for performance
-- ============================================================================

-- The index idx_brands_created_by already exists from migration 04 and includes organization_id
-- Verify it exists (it was created expecting this column)
CREATE INDEX IF NOT EXISTS idx_brands_organization_id ON brands(organization_id);

-- ============================================================================
-- STEP 5: Verify RLS policies
-- ============================================================================

-- RLS is already enabled on brands table from migration 02
-- The existing policy "Allow all for authenticated users" remains in place
-- Organization isolation is handled at the application layer via API routes
-- No changes needed to RLS policies

-- ============================================================================
-- STEP 6: Create indexes on all tables (now that organization_id exists)
-- ============================================================================

-- These indexes were attempted in migration 04 but failed because the column didn't exist
-- Now we can create them successfully

-- Create/recreate composite indexes from migration 04 (these may have failed originally)
CREATE INDEX IF NOT EXISTS idx_mockups_created_by ON card_mockups(created_by, organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_created_by ON card_templates(created_by, organization_id);
CREATE INDEX IF NOT EXISTS idx_brands_created_by ON brands(created_by, organization_id);

-- Add organization_id indexes for better query performance on related tables
CREATE INDEX IF NOT EXISTS idx_card_mockups_organization_id ON card_mockups(organization_id);
CREATE INDEX IF NOT EXISTS idx_card_templates_organization_id ON card_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_logo_variants_organization_id ON logo_variants(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_colors_organization_id ON brand_colors(organization_id);
CREATE INDEX IF NOT EXISTS idx_brand_fonts_organization_id ON brand_fonts(organization_id);

-- ============================================================================
-- VERIFICATION QUERIES (run these to verify migration success)
-- ============================================================================

-- Check for brands missing organization_id
-- SELECT COUNT(*) as legacy_brands FROM brands WHERE organization_id IS NULL;

-- Verify unique constraint
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'brands' AND constraint_type = 'UNIQUE';

-- Test multi-tenancy (should allow same domain for different org_ids)
-- These should both succeed:
-- INSERT INTO brands (id, name, domain, organization_id, created_by)
--   VALUES (gen_random_uuid(), 'Nike', 'nike.com', 'org_123', 'user_123');
-- INSERT INTO brands (id, name, domain, organization_id, created_by)
--   VALUES (gen_random_uuid(), 'Nike', 'nike.com', 'org_456', 'user_456');

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE brands IS
  'Brand information with multi-tenant isolation. Each organization can have its own copy of any brand.';


-- ============================================================================
-- FROM: 13_terminology_cleanup.sql
-- ============================================================================

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


-- ============================================================================
-- FROM: 14_fix_security_definer_views.sql
-- ============================================================================

-- ============================================================================
-- Fix Security Definer Views Issue
-- ============================================================================
-- Problem: Views created with implicit SECURITY DEFINER are blocking access
-- Solution: Recreate views with SECURITY INVOKER so they use the caller's permissions
-- ============================================================================

-- Drop existing views
DROP VIEW IF EXISTS card_mockups CASCADE;
DROP VIEW IF EXISTS card_templates CASCADE;
DROP VIEW IF EXISTS folder_mockup_counts CASCADE;

-- Recreate card_mockups view with SECURITY INVOKER
CREATE OR REPLACE VIEW card_mockups
WITH (security_invoker = true)
AS
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

-- Recreate card_templates view with SECURITY INVOKER
CREATE OR REPLACE VIEW card_templates
WITH (security_invoker = true)
AS
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

-- Recreate folder_mockup_counts view with SECURITY INVOKER
CREATE OR REPLACE VIEW folder_mockup_counts
WITH (security_invoker = true)
AS
SELECT
  f.id as folder_id,
  f.name as folder_name,
  f.organization_id,
  f.created_by,
  COUNT(m.id) as mockup_count
FROM folders f
LEFT JOIN assets m ON f.id = m.folder_id
GROUP BY f.id, f.name, f.organization_id, f.created_by;

-- Add comments
COMMENT ON VIEW card_mockups IS 'Compatibility view for old card_mockups table name. Uses SECURITY INVOKER to run with caller permissions.';
COMMENT ON VIEW card_templates IS 'Compatibility view for old card_templates table name. Uses SECURITY INVOKER to run with caller permissions.';
COMMENT ON VIEW folder_mockup_counts IS 'Aggregated view of mockup counts per folder. Uses SECURITY INVOKER to run with caller permissions.';


-- ============================================================================
-- FROM: 15_fix_migration_history_rls.sql
-- ============================================================================

-- ============================================================================
-- Enable RLS on migration_history table
-- ============================================================================

-- Enable RLS on migration_history
ALTER TABLE IF EXISTS migration_history ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role full access
CREATE POLICY "Service role has full access to migration history"
ON migration_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy to allow authenticated users to read migration history
CREATE POLICY "Authenticated users can view migration history"
ON migration_history
FOR SELECT
TO authenticated
USING (true);

COMMENT ON TABLE migration_history IS 'Tracks database migrations. Service role has full access, authenticated users can read.';


-- ============================================================================
-- FROM: 16_fix_function_search_paths.sql
-- ============================================================================

-- ============================================================================
-- Fix Function Search Path Security Warnings
-- ============================================================================
-- Problem: Functions don't have explicit search_path, which is a security risk
-- Solution: Set explicit search_path on all functions
-- ============================================================================

-- Fix card_mockups trigger functions
ALTER FUNCTION card_mockups_insert() SET search_path = public, pg_temp;
ALTER FUNCTION card_mockups_update() SET search_path = public, pg_temp;
ALTER FUNCTION card_mockups_delete() SET search_path = public, pg_temp;

-- Fix card_templates trigger functions
ALTER FUNCTION card_templates_insert() SET search_path = public, pg_temp;
ALTER FUNCTION card_templates_update() SET search_path = public, pg_temp;
ALTER FUNCTION card_templates_delete() SET search_path = public, pg_temp;

-- Fix workflow functions (skip if function doesn't exist)
DO $$
BEGIN
  -- update_updated_at_column
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    ALTER FUNCTION update_updated_at_column() SET search_path = public, pg_temp;
  END IF;

  -- reset_to_first_stage
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reset_to_first_stage') THEN
    ALTER FUNCTION reset_to_first_stage(uuid) SET search_path = public, pg_temp;
  END IF;

  -- advance_to_next_stage (handle all possible signatures)
  -- This function gets recreated in later migrations, so we'll set search_path there
  -- Skip here to avoid signature mismatch errors

  -- initialize_mockup_stage_progress
  -- This function is a trigger function with no parameters, skip ALTER here
  -- The final version in migration 18 already sets search_path

  -- validate_workflow_stages (trigger function with no parameters)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'validate_workflow_stages') THEN
    ALTER FUNCTION validate_workflow_stages() SET search_path = public, pg_temp;
  END IF;

  -- check_folder_depth
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_folder_depth') THEN
    ALTER FUNCTION check_folder_depth() SET search_path = public, pg_temp;
  END IF;
END $$;

COMMENT ON FUNCTION card_mockups_insert IS 'INSTEAD OF INSERT trigger for card_mockups view. Search path secured.';
COMMENT ON FUNCTION card_mockups_update IS 'INSTEAD OF UPDATE trigger for card_mockups view. Search path secured.';
COMMENT ON FUNCTION card_mockups_delete IS 'INSTEAD OF DELETE trigger for card_mockups view. Search path secured.';
COMMENT ON FUNCTION card_templates_insert IS 'INSTEAD OF INSERT trigger for card_templates view. Search path secured.';
COMMENT ON FUNCTION card_templates_update IS 'INSTEAD OF UPDATE trigger for card_templates view. Search path secured.';
COMMENT ON FUNCTION card_templates_delete IS 'INSTEAD OF DELETE trigger for card_templates view. Search path secured.';


-- ============================================================================
-- FROM: 17_fix_stage_progress_trigger.sql
-- ============================================================================

-- ============================================================================
-- Fix Stage Progress Trigger After Column Rename
-- ============================================================================
-- Migration 13 renamed mockup_id to asset_id in mockup_stage_progress table
-- but didn't update the trigger function that references it
-- ============================================================================

-- Update the trigger function to use asset_id instead of mockup_id
CREATE OR REPLACE FUNCTION initialize_mockup_stage_progress()
RETURNS TRIGGER AS $$
DECLARE
  workflow_record RECORD;
  stage RECORD;
BEGIN
  -- Only initialize if mockup is being assigned to a project (not null)
  -- and either it's a new mockup or the project_id is changing
  IF NEW.project_id IS NOT NULL AND (
    TG_OP = 'INSERT' OR
    (TG_OP = 'UPDATE' AND (OLD.project_id IS NULL OR OLD.project_id != NEW.project_id))
  ) THEN
    -- Check if project has a workflow
    SELECT w.* INTO workflow_record
    FROM workflows w
    JOIN projects p ON p.workflow_id = w.id
    WHERE p.id = NEW.project_id;

    IF FOUND AND workflow_record.stages IS NOT NULL THEN
      -- Delete any existing progress for this mockup (in case of project reassignment)
      -- FIXED: Use asset_id instead of mockup_id
      DELETE FROM mockup_stage_progress WHERE asset_id = NEW.id;

      -- Create progress records for each stage in the workflow
      FOR stage IN
        SELECT
          (stage_data->>'order')::INTEGER as stage_order
        FROM jsonb_array_elements(workflow_record.stages) as stage_data
        ORDER BY (stage_data->>'order')::INTEGER
      LOOP
        INSERT INTO mockup_stage_progress (
          asset_id,  -- FIXED: Use asset_id instead of mockup_id
          project_id,
          stage_order,
          status,
          notification_sent
        ) VALUES (
          NEW.id,
          NEW.project_id,
          stage.stage_order,
          CASE
            -- First stage starts in review, all others pending
            WHEN stage.stage_order = 1 THEN 'in_review'::stage_status
            ELSE 'pending'::stage_status
          END,
          false
        );
      END LOOP;

      -- Note: Email notification to stage 1 reviewers will be sent by application
      -- after INSERT completes, to avoid complex async email logic in triggers
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update advance_to_next_stage function
CREATE OR REPLACE FUNCTION advance_to_next_stage(
  p_mockup_id UUID,
  p_current_stage_order INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_next_stage_order INTEGER;
  v_has_next_stage BOOLEAN;
BEGIN
  -- Find the next stage
  -- FIXED: Use asset_id instead of mockup_id
  SELECT stage_order INTO v_next_stage_order
  FROM mockup_stage_progress
  WHERE asset_id = p_mockup_id
  AND stage_order > p_current_stage_order
  ORDER BY stage_order ASC
  LIMIT 1;

  v_has_next_stage := FOUND;

  IF v_has_next_stage THEN
    -- Update next stage to in_review
    UPDATE mockup_stage_progress
    SET
      status = 'in_review',
      updated_at = NOW()
    WHERE asset_id = p_mockup_id
      AND stage_order = v_next_stage_order;

    RETURN TRUE;
  ELSE
    -- No next stage, this was the last one
    RETURN FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update reset_to_first_stage function
CREATE OR REPLACE FUNCTION reset_to_first_stage(
  p_mockup_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Reset all stages to pending
  -- FIXED: Use asset_id instead of mockup_id
  UPDATE mockup_stage_progress
  SET
    status = 'pending',
    reviewed_by = NULL,
    reviewed_by_name = NULL,
    reviewed_at = NULL,
    notes = NULL,
    notification_sent = false,
    notification_sent_at = NULL,
    updated_at = NOW()
  WHERE asset_id = p_mockup_id;

  -- Set stage 1 to in_review
  UPDATE mockup_stage_progress
  SET
    status = 'in_review',
    updated_at = NOW()
  WHERE asset_id = p_mockup_id
  AND stage_order = 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION initialize_mockup_stage_progress IS 'FIXED: Updated to use asset_id column after migration 13 rename';
COMMENT ON FUNCTION advance_to_next_stage IS 'FIXED: Updated to use asset_id column after migration 13 rename';
COMMENT ON FUNCTION reset_to_first_stage IS 'FIXED: Updated to use asset_id column after migration 13 rename';


-- ============================================================================
-- FROM: 18_user_level_approvals.sql
-- ============================================================================

-- ============================================================================
-- Migration 18: User-Level Approval Tracking & Owner Final Approval
-- ============================================================================
-- Implements individual reviewer approval tracking and project owner final
-- approval step. Changes approval logic from "any one reviewer" to
-- "all reviewers must approve" before advancing stages.
-- ============================================================================

-- ============================================================================
-- PART 1: NEW TABLES
-- ============================================================================

-- Table: mockup_stage_user_approvals
-- Purpose: Track each individual reviewer's approval/rejection per stage
-- One record per user per stage per asset
CREATE TABLE IF NOT EXISTS mockup_stage_user_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage_order INTEGER NOT NULL,
  user_id TEXT NOT NULL, -- Clerk user ID
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_image_url TEXT,
  action TEXT NOT NULL CHECK (action IN ('approve', 'request_changes')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure user can only approve/reject once per stage per asset
  CONSTRAINT unique_user_stage_asset UNIQUE(asset_id, stage_order, user_id)
);

-- Indexes for performance
CREATE INDEX idx_user_approvals_asset ON mockup_stage_user_approvals(asset_id);
CREATE INDEX idx_user_approvals_project ON mockup_stage_user_approvals(project_id);
CREATE INDEX idx_user_approvals_user ON mockup_stage_user_approvals(user_id);
CREATE INDEX idx_user_approvals_stage ON mockup_stage_user_approvals(asset_id, stage_order);
CREATE INDEX idx_user_approvals_created_at ON mockup_stage_user_approvals(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_user_approvals_updated_at
  BEFORE UPDATE ON mockup_stage_user_approvals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE mockup_stage_user_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON mockup_stage_user_approvals FOR ALL USING (true);

COMMENT ON TABLE mockup_stage_user_approvals IS 'Tracks individual reviewer approvals/rejections per workflow stage';
COMMENT ON COLUMN mockup_stage_user_approvals.action IS 'approve or request_changes';

-- ============================================================================
-- PART 2: ALTER EXISTING TABLES
-- ============================================================================

-- Add approval tracking columns to mockup_stage_progress
ALTER TABLE mockup_stage_progress
  ADD COLUMN IF NOT EXISTS approvals_required INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approvals_received INTEGER DEFAULT 0;

COMMENT ON COLUMN mockup_stage_progress.approvals_required IS 'Number of reviewers assigned to this stage';
COMMENT ON COLUMN mockup_stage_progress.approvals_received IS 'Number of reviewers who have approved';

-- Add final approval columns to assets table
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS final_approved_by TEXT,
  ADD COLUMN IF NOT EXISTS final_approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS final_approval_notes TEXT;

COMMENT ON COLUMN assets.final_approved_by IS 'Clerk user ID of project owner who gave final approval';
COMMENT ON COLUMN assets.final_approved_at IS 'Timestamp of final approval';
COMMENT ON COLUMN assets.final_approval_notes IS 'Optional notes from owner during final approval';

-- ============================================================================
-- PART 3: UPDATE EXISTING ENUMS
-- ============================================================================

-- Add new status for pending final approval
-- Note: ALTER TYPE ADD VALUE cannot be in a transaction block, may need manual execution
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'pending_final_approval'
    AND enumtypid = 'stage_status'::regtype
  ) THEN
    ALTER TYPE stage_status ADD VALUE 'pending_final_approval';
  END IF;
END$$;

-- ============================================================================
-- PART 4: DATABASE FUNCTIONS
-- ============================================================================

-- Function: Count reviewers for a stage
-- Returns: Number of reviewers assigned to given stage for project
CREATE OR REPLACE FUNCTION count_stage_reviewers(p_project_id UUID, p_stage_order INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reviewer_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id)
  INTO reviewer_count
  FROM project_stage_reviewers
  WHERE project_id = p_project_id
    AND stage_order = p_stage_order;

  RETURN COALESCE(reviewer_count, 0);
END;
$$;

COMMENT ON FUNCTION count_stage_reviewers IS 'Counts number of reviewers assigned to a specific stage';

-- Function: Check if stage has all required approvals
-- Returns: TRUE if approvals_received >= approvals_required
CREATE OR REPLACE FUNCTION check_stage_approval_complete(p_asset_id UUID, p_stage_order INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approvals_required INTEGER;
  v_approvals_received INTEGER;
BEGIN
  SELECT approvals_required, approvals_received
  INTO v_approvals_required, v_approvals_received
  FROM mockup_stage_progress
  WHERE asset_id = p_asset_id
    AND stage_order = p_stage_order;

  -- If no reviewers assigned, consider complete
  IF v_approvals_required = 0 THEN
    RETURN TRUE;
  END IF;

  RETURN v_approvals_received >= v_approvals_required;
END;
$$;

COMMENT ON FUNCTION check_stage_approval_complete IS 'Checks if stage has received all required approvals';

-- Function: Update stage approval count
-- Increments approvals_received when a user approves
CREATE OR REPLACE FUNCTION increment_stage_approval_count(p_asset_id UUID, p_stage_order INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE mockup_stage_progress
  SET approvals_received = approvals_received + 1,
      updated_at = NOW()
  WHERE asset_id = p_asset_id
    AND stage_order = p_stage_order;
END;
$$;

COMMENT ON FUNCTION increment_stage_approval_count IS 'Increments approval count when reviewer approves';

-- Function: Record final approval by project owner
-- Sets final approval fields on asset
CREATE OR REPLACE FUNCTION record_final_approval(
  p_asset_id UUID,
  p_user_id TEXT,
  p_user_name TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id UUID;
  v_max_stage INTEGER;
BEGIN
  -- Get asset's project and max stage
  SELECT project_id INTO v_project_id
  FROM assets
  WHERE id = p_asset_id;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Asset not assigned to project';
  END IF;

  -- Get highest stage order
  SELECT MAX(stage_order) INTO v_max_stage
  FROM mockup_stage_progress
  WHERE asset_id = p_asset_id;

  -- Set final approval on asset
  UPDATE assets
  SET final_approved_by = p_user_id,
      final_approved_at = NOW(),
      final_approval_notes = p_notes,
      updated_at = NOW()
  WHERE id = p_asset_id;

  -- Update last stage progress to 'approved'
  UPDATE mockup_stage_progress
  SET status = 'approved',
      reviewed_by = p_user_id,
      reviewed_by_name = p_user_name,
      reviewed_at = NOW(),
      notes = p_notes,
      updated_at = NOW()
  WHERE asset_id = p_asset_id
    AND stage_order = v_max_stage;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION record_final_approval IS 'Records final approval by project owner after all stages complete';

-- ============================================================================
-- PART 5: UPDATE EXISTING FUNCTIONS
-- ============================================================================

-- Update: initialize_mockup_stage_progress
-- Now counts reviewers and sets approvals_required
CREATE OR REPLACE FUNCTION initialize_mockup_stage_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  workflow_record RECORD;
  stage RECORD;
  reviewer_count INTEGER;
BEGIN
  -- Only initialize if mockup is being assigned to a project (not null)
  -- and either it's a new mockup or the project_id is changing
  IF NEW.project_id IS NOT NULL AND (
    TG_OP = 'INSERT' OR
    (TG_OP = 'UPDATE' AND (OLD.project_id IS NULL OR OLD.project_id != NEW.project_id))
  ) THEN
    -- Check if project has a workflow
    SELECT w.* INTO workflow_record
    FROM workflows w
    JOIN projects p ON p.workflow_id = w.id
    WHERE p.id = NEW.project_id;

    IF FOUND AND workflow_record.stages IS NOT NULL THEN
      -- Delete any existing progress for this mockup (in case of project reassignment)
      DELETE FROM mockup_stage_progress WHERE asset_id = NEW.id;
      DELETE FROM mockup_stage_user_approvals WHERE asset_id = NEW.id;

      -- Create progress records for each stage in the workflow
      FOR stage IN
        SELECT
          (stage_data->>'order')::INTEGER as stage_order
        FROM jsonb_array_elements(workflow_record.stages) as stage_data
        ORDER BY (stage_data->>'order')::INTEGER
      LOOP
        -- Count reviewers for this stage
        reviewer_count := count_stage_reviewers(NEW.project_id, stage.stage_order);

        INSERT INTO mockup_stage_progress (
          asset_id,
          project_id,
          stage_order,
          status,
          notification_sent,
          approvals_required,
          approvals_received
        ) VALUES (
          NEW.id,
          NEW.project_id,
          stage.stage_order,
          CASE
            -- First stage starts in review
            WHEN stage.stage_order = 1 THEN 'in_review'::stage_status
            -- All other stages are pending
            ELSE 'pending'::stage_status
          END,
          FALSE,
          reviewer_count,
          0
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION initialize_mockup_stage_progress IS 'Auto-creates stage progress with approval counts when mockup assigned to workflow project';

-- Update: advance_to_next_stage
-- Now checks if it's the last stage and sets pending_final_approval
-- Drop old version first (parameter names changed from p_mockup_id to p_asset_id)
DROP FUNCTION IF EXISTS advance_to_next_stage(uuid, integer);

CREATE OR REPLACE FUNCTION advance_to_next_stage(p_asset_id UUID, p_current_stage_order INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_stage_order INTEGER;
  v_project_id UUID;
  v_max_stage INTEGER;
  v_reviewer_count INTEGER;
BEGIN
  -- Get project_id and find max stage
  SELECT project_id INTO v_project_id
  FROM mockup_stage_progress
  WHERE asset_id = p_asset_id
  LIMIT 1;

  SELECT MAX(stage_order) INTO v_max_stage
  FROM mockup_stage_progress
  WHERE asset_id = p_asset_id;

  v_next_stage_order := p_current_stage_order + 1;

  -- Check if this was the last stage
  IF v_next_stage_order > v_max_stage THEN
    -- Last stage completed - set to pending final approval
    UPDATE mockup_stage_progress
    SET status = 'pending_final_approval'::stage_status,
        updated_at = NOW()
    WHERE asset_id = p_asset_id
      AND stage_order = p_current_stage_order;

    RETURN FALSE; -- No next stage
  END IF;

  -- Count reviewers for next stage
  v_reviewer_count := count_stage_reviewers(v_project_id, v_next_stage_order);

  -- Update next stage to in_review
  UPDATE mockup_stage_progress
  SET status = 'in_review'::stage_status,
      approvals_required = v_reviewer_count,
      approvals_received = 0,
      reviewed_by = NULL,
      reviewed_by_name = NULL,
      reviewed_at = NULL,
      notes = NULL,
      updated_at = NOW()
  WHERE asset_id = p_asset_id
    AND stage_order = v_next_stage_order;

  RETURN TRUE; -- Next stage exists
END;
$$;

COMMENT ON FUNCTION advance_to_next_stage IS 'Advances to next stage or sets pending_final_approval if last stage';

-- ============================================================================
-- PART 6: VERIFICATION QUERIES
-- ============================================================================

-- Check that new table exists
SELECT EXISTS (
  SELECT FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename = 'mockup_stage_user_approvals'
) AS user_approvals_table_exists;

-- Check new columns exist
SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_name = 'mockup_stage_progress'
  AND column_name = 'approvals_required'
) AS stage_approvals_columns_exist;

SELECT EXISTS (
  SELECT FROM information_schema.columns
  WHERE table_name = 'assets'
  AND column_name = 'final_approved_by'
) AS asset_final_approval_columns_exist;

-- Check new enum value exists
SELECT EXISTS (
  SELECT 1 FROM pg_enum
  WHERE enumlabel = 'pending_final_approval'
  AND enumtypid = 'stage_status'::regtype
) AS pending_final_approval_status_exists;

-- Count new functions
SELECT COUNT(*) as new_functions_count
FROM pg_proc
WHERE proname IN (
  'count_stage_reviewers',
  'check_stage_approval_complete',
  'increment_stage_approval_count',
  'record_final_approval'
);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
/*
BREAKING CHANGES:
- None for existing data. This is additive only.
- Existing workflows will now require ALL reviewers to approve (was ANY one)
- New "pending_final_approval" status added after last stage completes

POST-MIGRATION STEPS:
1. Verify all tables and columns created
2. Test with a sample project:
   - Assign multiple reviewers to stages
   - Verify approvals_required is set correctly
   - Test that all must approve before advancing
3. Update frontend to use new approval endpoints
4. Test final approval flow with project owner

ROLLBACK:
To rollback this migration:
```sql
DROP TABLE IF EXISTS mockup_stage_user_approvals CASCADE;
ALTER TABLE mockup_stage_progress DROP COLUMN IF EXISTS approvals_required;
ALTER TABLE mockup_stage_progress DROP COLUMN IF EXISTS approvals_received;
ALTER TABLE assets DROP COLUMN IF EXISTS final_approved_by;
ALTER TABLE assets DROP COLUMN IF EXISTS final_approved_at;
ALTER TABLE assets DROP COLUMN IF EXISTS final_approval_notes;
DROP FUNCTION IF EXISTS count_stage_reviewers CASCADE;
DROP FUNCTION IF EXISTS check_stage_approval_complete CASCADE;
DROP FUNCTION IF EXISTS increment_stage_approval_count CASCADE;
DROP FUNCTION IF EXISTS record_final_approval CASCADE;
-- Note: Cannot remove enum value without recreating the type
```
*/


-- ============================================================================
-- FROM: 19_fix_templates_columns.sql
-- ============================================================================

-- Migration 19: Fix Missing Columns in Templates Table
--
-- This migration ensures the templates table has all required columns
-- for multi-tenancy and user tracking, regardless of migration order.
--
-- Context: Migration 13 renamed card_templates -> templates
-- Migration 12 tried to add organization_id to card_templates (which no longer exists)
-- This fixes any missing columns on the current templates table.
--
-- Date: 2025-10-29
-- Version: 3.6.1

-- ============================================================================
-- STEP 1: Add missing columns if they don't exist
-- ============================================================================

-- Add organization_id column (for multi-tenant isolation)
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Add created_by column (for user tracking)
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- ============================================================================
-- STEP 2: Create performance indexes
-- ============================================================================

-- Index on organization_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_templates_organization_id
ON templates(organization_id);

-- Composite index on created_by and organization_id
CREATE INDEX IF NOT EXISTS idx_templates_created_by
ON templates(created_by, organization_id);

-- ============================================================================
-- STEP 3: Update backward compatibility view
-- ============================================================================

-- Update the card_templates view to include new columns
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

-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================

COMMENT ON COLUMN templates.organization_id IS
  'Organization ID from Clerk for multi-tenant data isolation';

COMMENT ON COLUMN templates.created_by IS
  'User ID from Clerk who uploaded this template';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the migration worked:

-- Check columns exist
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'templates'
-- AND column_name IN ('organization_id', 'created_by')
-- ORDER BY column_name;

-- Check indexes exist
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'templates'
-- AND indexname LIKE 'idx_templates_%';

-- Test inserting a template (should succeed)
-- INSERT INTO templates (template_name, template_url, organization_id, created_by, file_type, file_size)
-- VALUES ('Test Template', 'https://example.com/test.png', 'org_test123', 'user_test123', 'image/png', 12345);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE templates IS
  'Design templates for creating brand assets. Fixed in migration 19 to ensure organization_id and created_by columns exist.';


-- ============================================================================
-- FROM: 20_remove_ai_features.sql
-- ============================================================================

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
  'CardMock v3.7.0 - AI features removed for simplification';



-- ============================================================================
-- FROM: 21_notifications.sql
-- ============================================================================

-- ============================================================================
-- Migration 21: Notifications System
-- ============================================================================
-- Creates notifications table for in-app notification system
-- Supports approval requests, comments, stage progress, and final approvals
-- ============================================================================

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'approval_request',      -- User assigned as reviewer
  'approval_received',     -- Someone approved (progress update)
  'comment',               -- New comment on asset
  'stage_progress',        -- Stage advanced or completed
  'final_approval',        -- Final approval needed or completed
  'changes_requested'      -- Changes requested by reviewer
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID (recipient)
  organization_id TEXT NOT NULL, -- Clerk org ID for multi-tenancy
  
  -- Notification content
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT, -- e.g., '/mockups/[id]' or '/projects/[id]'
  
  -- Related entities (nullable for flexibility)
  related_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  related_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Read status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb, -- For additional context (e.g., stage name, reviewer name)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_asset ON notifications(related_asset_id) WHERE related_asset_id IS NOT NULL;
CREATE INDEX idx_notifications_project ON notifications(related_project_id) WHERE related_project_id IS NOT NULL;
CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications within their organization
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- Policy: System can create notifications (via service role)
-- Note: In practice, notifications are created via API routes using service role
-- This policy allows authenticated users to create notifications for themselves
-- (though typically done via service role in API routes)
CREATE POLICY "Users can create own notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  )
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- ============================================================================
-- HELPER FUNCTION: Get unread notification count
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unread_notification_count(
  p_user_id TEXT,
  p_organization_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND is_read = false;
  
  RETURN COALESCE(unread_count, 0);
END;
$$;



-- ============================================================================
-- FROM: 22_user_preferences.sql
-- ============================================================================

-- ============================================================================
-- Migration 22: User Preferences
-- ============================================================================
-- Creates user preferences table for storing user settings
-- ============================================================================

-- ============================================================================
-- USER PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID
  organization_id TEXT NOT NULL, -- Clerk org ID for multi-tenancy
  
  -- Notification preferences (JSONB for flexibility)
  notification_preferences JSONB DEFAULT '{
    "email_approval_request": true,
    "email_approval_received": true,
    "email_comment": true,
    "email_stage_progress": true,
    "email_final_approval": true,
    "email_changes_requested": true,
    "in_app_approval_request": true,
    "in_app_approval_received": true,
    "in_app_comment": true,
    "in_app_stage_progress": true,
    "in_app_final_approval": true,
    "in_app_changes_requested": true
  }'::jsonb,
  
  -- Display preferences
  theme TEXT DEFAULT 'light', -- 'light' | 'dark' | 'system'
  layout_preferences JSONB DEFAULT '{}'::jsonb, -- For future layout customization
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- One preference record per user per organization
  CONSTRAINT unique_user_org_preferences UNIQUE(user_id, organization_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_org ON user_preferences(organization_id);
CREATE INDEX idx_user_preferences_user_org ON user_preferences(user_id, organization_id);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- Policy: Users can create their own preferences
CREATE POLICY "Users can create own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  )
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own preferences"
  ON user_preferences FOR DELETE
  USING (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );



-- ============================================================================
-- FROM: 25_client_ein_and_user_association.sql
-- ============================================================================

-- ============================================================================
-- Migration 25: Client EIN, User Association, Hierarchy, and Brand Association
-- ============================================================================
-- Adds EIN field to clients, implements user-client association system,
-- adds client hierarchy support, and adds brand-client association.
-- ============================================================================

-- Create clients table (separate from brands)
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- STEP 1: ADD EIN FIELD TO CLIENTS TABLE
-- ============================================================================

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS ein TEXT;

-- Add index on EIN for lookups
CREATE INDEX IF NOT EXISTS idx_clients_ein ON clients(ein) WHERE ein IS NOT NULL;

-- ============================================================================
-- STEP 2: ADD CLIENT HIERARCHY SUPPORT
-- ============================================================================

-- Add parent_client_id column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS parent_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index on parent_client_id for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_clients_parent ON clients(parent_client_id) WHERE parent_client_id IS NOT NULL;

-- Add constraint to prevent circular references
-- A client cannot be its own parent (enforced by check constraint)
ALTER TABLE clients
DROP CONSTRAINT IF EXISTS check_no_self_parent;

ALTER TABLE clients
ADD CONSTRAINT check_no_self_parent CHECK (id != parent_client_id);

-- ============================================================================
-- STEP 3: CREATE USER-CLIENT ASSOCIATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID
  organization_id TEXT NOT NULL,
  assigned_by TEXT NOT NULL, -- Clerk user ID who assigned
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one client per user per organization
  CONSTRAINT unique_user_client_per_org UNIQUE(user_id, organization_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_user ON client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_org ON client_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_users_assigned_at ON client_users(assigned_at DESC);

-- ============================================================================
-- STEP 4: ADD BRAND-CLIENT ASSOCIATION
-- ============================================================================

-- Add client_id column to brands table
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index on client_id for client-brand lookups
CREATE INDEX IF NOT EXISTS idx_brands_client ON brands(client_id) WHERE client_id IS NOT NULL;

-- ============================================================================
-- STEP 5: UPDATED_AT TRIGGERS
-- ============================================================================

-- Client users updated_at trigger
DROP TRIGGER IF EXISTS update_client_users_updated_at ON client_users;
CREATE TRIGGER update_client_users_updated_at
  BEFORE UPDATE ON client_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: ROW LEVEL SECURITY
-- ============================================================================

-- Client users RLS
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users in org" ON client_users;
CREATE POLICY "Allow all for authenticated users in org"
  ON client_users FOR ALL
  USING (true);

-- ============================================================================
-- STEP 7: HELPER FUNCTIONS
-- ============================================================================

-- Function to get all child clients (recursive)
CREATE OR REPLACE FUNCTION get_child_clients(parent_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  parent_client_id UUID,
  level INTEGER
) AS $$
WITH RECURSIVE client_hierarchy AS (
  -- Base case: direct children
  SELECT 
    c.id,
    c.name,
    c.parent_client_id,
    1 as level
  FROM clients c
  WHERE c.parent_client_id = parent_id
  
  UNION ALL
  
  -- Recursive case: children of children
  SELECT 
    c.id,
    c.name,
    c.parent_client_id,
    ch.level + 1
  FROM clients c
  INNER JOIN client_hierarchy ch ON c.parent_client_id = ch.id
)
SELECT * FROM client_hierarchy;
$$ LANGUAGE SQL STABLE;

-- Function to check if client hierarchy is valid (no circular references)
CREATE OR REPLACE FUNCTION check_client_hierarchy_valid(client_id UUID, new_parent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN := true;
BEGIN
  -- A client cannot be its own parent
  IF client_id = new_parent_id THEN
    RETURN false;
  END IF;
  
  -- Check if new_parent_id is a descendant of client_id (would create cycle)
  IF EXISTS (
    SELECT 1 FROM get_child_clients(client_id) WHERE id = new_parent_id
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: COMMENTS
-- ============================================================================

COMMENT ON COLUMN clients.ein IS 'Employer Identification Number (EIN) for client identification';
COMMENT ON COLUMN clients.parent_client_id IS 'References parent client for hierarchy. NULL for top-level clients.';
COMMENT ON TABLE client_users IS 'User-client association table. One client per user per organization.';
COMMENT ON COLUMN client_users.user_id IS 'Clerk user ID';
COMMENT ON COLUMN client_users.assigned_by IS 'Clerk user ID who assigned this user to the client';
COMMENT ON COLUMN brands.client_id IS 'References client for brand-client association. NULL for org-level brands.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================



-- ============================================================================
-- FROM: 26_asset_types.sql
-- ============================================================================

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



-- ============================================================================
-- Migration 27: Contract Notification Types - REMOVED
-- ============================================================================
-- This migration was removed as contracts functionality has been removed from the application
-- ============================================================================


-- ============================================================================
-- FROM: 28_integrations_foundation.sql
-- ============================================================================

-- ============================================================================
-- Migration 28: Integrations Foundation
-- ============================================================================
-- Creates shared infrastructure for all platform integrations
-- Includes OAuth credential storage, event tracking, and analytics
-- ============================================================================

-- Integration credentials (OAuth tokens) - Shared across all integrations
CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  user_id TEXT, -- Nullable for org-level integrations (e.g., Slack)
  integration_type TEXT NOT NULL, -- 'gmail', 'slack', 'drive', 'dropbox'
  credentials_encrypted TEXT NOT NULL, -- Encrypted JSON
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  metadata_jsonb JSONB, -- Provider-specific metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, integration_type, user_id)
);

-- Integration activity tracking - Shared across all integrations
CREATE TABLE IF NOT EXISTS integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_jsonb JSONB,
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Integration usage analytics
CREATE TABLE IF NOT EXISTS integration_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_type TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  metadata_jsonb JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_integration_credentials_org_type ON integration_credentials(organization_id, integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_credentials_user ON integration_credentials(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_events_type_status ON integration_events(integration_type, status);
CREATE INDEX IF NOT EXISTS idx_integration_events_created_at ON integration_events(created_at);
CREATE INDEX IF NOT EXISTS idx_integration_analytics_type ON integration_analytics(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_analytics_org ON integration_analytics(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_analytics_created_at ON integration_analytics(created_at);

-- RLS Policies for integration_credentials
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON integration_credentials FOR ALL
  USING (true);

-- RLS Policies for integration_events
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON integration_events FOR ALL
  USING (true);

-- RLS Policies for integration_analytics
ALTER TABLE integration_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON integration_analytics FOR ALL
  USING (true);

-- Add updated_at trigger for integration_credentials
CREATE OR REPLACE FUNCTION update_integration_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER integration_credentials_updated_at
  BEFORE UPDATE ON integration_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_credentials_updated_at();

-- Comments
COMMENT ON TABLE integration_credentials IS 'Stores encrypted OAuth tokens for all platform integrations';
COMMENT ON TABLE integration_events IS 'Tracks all integration activity for debugging and monitoring';
COMMENT ON TABLE integration_analytics IS 'Tracks integration usage metrics for analytics';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================



-- ============================================================================
-- FROM: 29_public_sharing.sql
-- ============================================================================

-- ============================================================================
-- Migration 29: Public Sharing
-- ============================================================================
-- Enables public share links for assets, allowing external reviewers
-- to review and approve without creating an account
-- ============================================================================

-- Public share links table
CREATE TABLE IF NOT EXISTS public_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE, -- JWT token or unique identifier
  expires_at TIMESTAMPTZ,
  password_hash TEXT, -- Optional password protection
  permissions TEXT NOT NULL DEFAULT 'view', -- 'view', 'comment', 'approve'
  max_uses INTEGER, -- Optional use limit
  use_count INTEGER DEFAULT 0,
  created_by TEXT NOT NULL, -- Clerk user ID
  identity_required_level TEXT NOT NULL DEFAULT 'none', -- 'none', 'comment', 'approve'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public reviewers (captured identity)
CREATE TABLE IF NOT EXISTS public_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  name TEXT,
  company TEXT,
  verified_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  session_token TEXT UNIQUE, -- For session persistence
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Public share analytics
CREATE TABLE IF NOT EXISTS public_share_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public_share_links(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  user_agent TEXT,
  actions_taken TEXT[], -- Array of actions: ['view', 'comment', 'approve']
  time_spent INTEGER, -- Seconds
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add public share enabled flag to assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS public_share_enabled BOOLEAN DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_public_share_links_token ON public_share_links(token);
CREATE INDEX IF NOT EXISTS idx_public_share_links_asset_id ON public_share_links(asset_id);
CREATE INDEX IF NOT EXISTS idx_public_share_links_org ON public_share_links(organization_id);
CREATE INDEX IF NOT EXISTS idx_public_reviewers_email ON public_reviewers(email);
CREATE INDEX IF NOT EXISTS idx_public_reviewers_session_token ON public_reviewers(session_token);
CREATE INDEX IF NOT EXISTS idx_public_share_analytics_link_id ON public_share_analytics(link_id);
CREATE INDEX IF NOT EXISTS idx_public_share_analytics_created_at ON public_share_analytics(created_at);

-- RLS Policies for public_share_links
ALTER TABLE public_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON public_share_links FOR ALL
  USING (true);

-- RLS Policies for public_reviewers
ALTER TABLE public_reviewers ENABLE ROW LEVEL SECURITY;

-- Allow public access for reviewers (no auth required)
CREATE POLICY "Public reviewers can view their own records"
  ON public_reviewers
  FOR SELECT
  USING (true);

CREATE POLICY "Public reviewers can insert their own records"
  ON public_reviewers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public reviewers can update their own records"
  ON public_reviewers
  FOR UPDATE
  USING (true);

-- RLS Policies for public_share_analytics
ALTER TABLE public_share_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON public_share_analytics FOR ALL
  USING (true);

-- Add updated_at trigger for public_share_links
CREATE OR REPLACE FUNCTION update_public_share_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER public_share_links_updated_at
  BEFORE UPDATE ON public_share_links
  FOR EACH ROW
  EXECUTE FUNCTION update_public_share_links_updated_at();

-- Function to check if a share link is valid
CREATE OR REPLACE FUNCTION is_share_link_valid(
  p_token TEXT,
  p_check_password BOOLEAN DEFAULT false,
  p_password TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  link_id UUID,
  asset_id UUID,
  permissions TEXT,
  identity_required_level TEXT
) AS $$
DECLARE
  v_link public_share_links%ROWTYPE;
  v_password_valid BOOLEAN;
BEGIN
  -- Get the link
  SELECT * INTO v_link
  FROM public_share_links
  WHERE token = p_token;
  
  -- Check if link exists
  IF v_link.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;
  
  -- Check expiration
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < NOW() THEN
    RETURN QUERY SELECT false, v_link.id, v_link.asset_id, v_link.permissions, v_link.identity_required_level;
    RETURN;
  END IF;
  
  -- Check max uses
  IF v_link.max_uses IS NOT NULL AND v_link.use_count >= v_link.max_uses THEN
    RETURN QUERY SELECT false, v_link.id, v_link.asset_id, v_link.permissions, v_link.identity_required_level;
    RETURN;
  END IF;
  
  -- Check password if required
  IF p_check_password AND v_link.password_hash IS NOT NULL THEN
    IF p_password IS NULL THEN
      RETURN QUERY SELECT false, v_link.id, v_link.asset_id, v_link.permissions, v_link.identity_required_level;
      RETURN;
    END IF;
    
    -- Password verification would be done in application code
    -- For now, we'll just check if password is provided
    v_password_valid := (p_password IS NOT NULL);
    
    IF NOT v_password_valid THEN
      RETURN QUERY SELECT false, v_link.id, v_link.asset_id, v_link.permissions, v_link.identity_required_level;
      RETURN;
    END IF;
  END IF;
  
  -- Link is valid
  RETURN QUERY SELECT true, v_link.id, v_link.asset_id, v_link.permissions, v_link.identity_required_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE public_share_links IS 'Public share links for assets, allowing external reviewers without accounts';
COMMENT ON TABLE public_reviewers IS 'Captured identity information for public reviewers';
COMMENT ON TABLE public_share_analytics IS 'Analytics tracking for public share link usage';
COMMENT ON FUNCTION is_share_link_valid IS 'Validates a public share link token and returns link details';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================



-- ============================================================================
-- FROM: 31_gmail_integration.sql
-- ============================================================================

-- ============================================================================
-- Migration 31: Gmail Integration
-- ============================================================================
-- Enables Gmail add-on integration for sending approval requests and ingesting feedback
-- ============================================================================

-- Gmail integrations (OAuth tokens)
CREATE TABLE IF NOT EXISTS gmail_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Clerk user ID
  gmail_user_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Gmail threads (link emails to assets)
CREATE TABLE IF NOT EXISTS gmail_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL, -- Gmail thread ID
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(thread_id, organization_id)
);

-- Gmail feedback events (tracking)
CREATE TABLE IF NOT EXISTS gmail_feedback_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES gmail_integrations(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'approval_sent', 'feedback_received', 'quick_action'
  parsed_feedback TEXT,
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_org_user ON gmail_integrations(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_thread_id ON gmail_threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_gmail_threads_asset_id ON gmail_threads(asset_id);
CREATE INDEX IF NOT EXISTS idx_gmail_feedback_events_thread_id ON gmail_feedback_events(thread_id);
CREATE INDEX IF NOT EXISTS idx_gmail_feedback_events_asset_id ON gmail_feedback_events(asset_id);

-- RLS Policies
ALTER TABLE gmail_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_feedback_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON gmail_integrations FOR ALL
  USING (true);

CREATE POLICY "Allow all for authenticated users in org"
  ON gmail_threads FOR ALL
  USING (true);

CREATE POLICY "Allow all for authenticated users in org"
  ON gmail_feedback_events FOR ALL
  USING (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================



-- ============================================================================
-- FROM: 32_slack_integration.sql
-- ============================================================================

-- ============================================================================
-- Migration 32: Slack Integration
-- ============================================================================
-- Enables Slack integration for real-time notifications and quick actions
-- ============================================================================

-- Slack integrations (workspace-level)
CREATE TABLE IF NOT EXISTS slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  workspace_name TEXT,
  bot_token_encrypted TEXT NOT NULL,
  access_token_encrypted TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, workspace_id)
);

-- Slack channels (map channels to projects)
CREATE TABLE IF NOT EXISTS slack_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES slack_integrations(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integration_id, channel_id)
);

-- Slack notification events (tracking)
CREATE TABLE IF NOT EXISTS slack_notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES slack_integrations(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  channel_id TEXT NOT NULL,
  message_ts TEXT, -- Slack message timestamp
  event_type TEXT NOT NULL, -- 'approval_request', 'status_update', 'comment', 'digest'
  status TEXT NOT NULL, -- 'sent', 'error'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_slack_integrations_org ON slack_integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_slack_channels_project_id ON slack_channels(project_id);
CREATE INDEX IF NOT EXISTS idx_slack_notification_events_asset_id ON slack_notification_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_slack_notification_events_channel_id ON slack_notification_events(channel_id);

-- RLS Policies
ALTER TABLE slack_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON slack_integrations FOR ALL
  USING (true);

CREATE POLICY "Allow all for authenticated users in org"
  ON slack_channels FOR ALL
  USING (true);

CREATE POLICY "Allow all for authenticated users in org"
  ON slack_notification_events FOR ALL
  USING (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================



-- ============================================================================
-- FROM: 33_cloud_storage_import.sql
-- ============================================================================

-- ============================================================================
-- Migration 33: Cloud Storage Import
-- ============================================================================
-- Enables Drive/Dropbox import for existing folder structures
-- ============================================================================

-- Cloud storage integrations (OAuth tokens)
CREATE TABLE IF NOT EXISTS cloud_storage_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Clerk user ID
  provider TEXT NOT NULL, -- 'drive', 'dropbox'
  provider_user_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id, provider)
);

-- Import jobs (track import progress)
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES cloud_storage_integrations(id) ON DELETE CASCADE,
  organization_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  root_folder_path TEXT NOT NULL,
  mapping_rules_jsonb JSONB, -- User-configured mapping rules
  progress_jsonb JSONB, -- Current progress: { total: 100, processed: 45, errors: 2 }
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Import mappings (track folder → project mappings)
CREATE TABLE IF NOT EXISTS import_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  source_path TEXT NOT NULL, -- Original folder path
  target_type TEXT NOT NULL, -- 'client', 'project', 'folder', 'asset'
  target_id UUID, -- ID of created client/project/folder/asset
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cloud_storage_integrations_org_user ON cloud_storage_integrations(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_mappings_job_id ON import_mappings(job_id);

-- RLS Policies
ALTER TABLE cloud_storage_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON cloud_storage_integrations FOR ALL
  USING (true);

CREATE POLICY "Allow all for authenticated users in org"
  ON import_jobs FOR ALL
  USING (true);

CREATE POLICY "Allow all for authenticated users in org"
  ON import_mappings FOR ALL
  USING (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================



-- ============================================================================
-- FROM: 34_presentation_mode.sql
-- ============================================================================

-- ============================================================================
-- Migration 34: Presentation Mode
-- ============================================================================
-- Enables comparison and presentation mode for stakeholder reviews
-- ============================================================================

-- Presentation sessions
CREATE TABLE IF NOT EXISTS presentation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  created_by TEXT NOT NULL, -- Clerk user ID
  name TEXT NOT NULL,
  asset_ids UUID[] NOT NULL, -- Array of asset IDs to present
  presentation_mode TEXT NOT NULL DEFAULT 'side_by_side', -- 'side_by_side', 'overlay', 'timeline', 'grid'
  presenter_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Presentation participants (for live collaboration)
CREATE TABLE IF NOT EXISTS presentation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES presentation_sessions(id) ON DELETE CASCADE,
  user_id TEXT, -- Clerk user ID (nullable for anonymous)
  user_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cursor_positions_jsonb JSONB, -- Real-time cursor positions
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Presentation votes (for live polling)
CREATE TABLE IF NOT EXISTS presentation_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES presentation_sessions(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES presentation_participants(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL, -- 'approve', 'reject', 'prefer'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, asset_id, participant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_presentation_sessions_org ON presentation_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_presentation_participants_session ON presentation_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_presentation_votes_session_asset ON presentation_votes(session_id, asset_id);

-- RLS Policies
ALTER TABLE presentation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE presentation_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON presentation_sessions FOR ALL
  USING (true);

CREATE POLICY "Allow all for authenticated users in org"
  ON presentation_participants FOR ALL
  USING (true);

CREATE POLICY "Allow all for authenticated users in org"
  ON presentation_votes FOR ALL
  USING (true);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================



-- ============================================================================
-- FROM: 35_add_client_id_to_projects.sql
-- ============================================================================

-- ============================================================================
-- Migration 35: Add client_id to projects table
-- ============================================================================
-- Projects must have a direct relationship to clients via client_id
-- This fixes access control logic so client-role users see projects
-- based on their assigned client, not contracts
-- ============================================================================

-- Step 1: Add client_id column (nullable initially for migration)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Step 2: Migrate existing data - set client_id based on client_name matching
-- For projects with client_name, try to find matching client by name
UPDATE projects p
SET client_id = (
  SELECT c.id
  FROM clients c
  WHERE c.name = p.client_name
    AND c.organization_id = p.organization_id
  LIMIT 1
)
WHERE p.client_id IS NULL
  AND p.client_name IS NOT NULL
  AND p.client_name != '';

-- Step 3: Handle projects with NULL client_name or no match
-- For projects that couldn't be matched, we'll need to set them manually
-- For now, we'll leave them NULL and require manual assignment
-- (This will be handled in the application layer)

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_org ON projects(client_id, organization_id);

-- Step 5: Add comment
COMMENT ON COLUMN projects.client_id IS 'Required reference to clients table. Projects must belong to a client.';

-- Note: We're keeping client_id nullable for now to allow manual assignment
-- of projects that couldn't be automatically migrated. After all projects
-- have been assigned, we can make it NOT NULL in a future migration.




-- ============================================================================
-- FROM: 37_add_searchable_text.sql
-- ============================================================================

-- ============================================================================
-- MIGRATION 37: Add Searchable Text Fields (Modified)
-- ============================================================================
-- Adds searchable_text field to assets table only
-- (Contract documents part removed as contracts functionality was removed)
-- ============================================================================

-- Add searchable_text to assets
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS searchable_text TEXT;

-- Create index for full-text search on assets
CREATE INDEX IF NOT EXISTS idx_assets_searchable_text
  ON assets USING gin(to_tsvector('english', COALESCE(searchable_text, '')));

-- Add comment
COMMENT ON COLUMN assets.searchable_text IS 'Extracted text content from asset for full-text search';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================



-- ============================================================================
-- FROM: 39_remove_contracts_and_figma.sql
-- ============================================================================

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



-- ============================================================================
-- FROM: fix_approval_counts.sql
-- ============================================================================

-- ============================================================================
-- Fix Approval Counts for Existing Assets
-- ============================================================================
-- This script updates approvals_required for existing stage progress records
-- that were created before migration 18 was run.
--
-- Run this after migration 18 to fix existing assets.
-- ============================================================================

-- Step 1: Check current state (diagnostic query)
-- Run this first to see which records need updating
SELECT
  msp.asset_id,
  a.mockup_name,
  p.name as project_name,
  msp.stage_order,
  msp.status,
  msp.approvals_required,
  msp.approvals_received,
  count_stage_reviewers(msp.project_id, msp.stage_order) as actual_reviewer_count
FROM mockup_stage_progress msp
JOIN assets a ON a.id = msp.asset_id
JOIN projects p ON p.id = msp.project_id
WHERE msp.approvals_required = 0
ORDER BY p.name, a.mockup_name, msp.stage_order;

-- Step 2: Fix the counts
-- This updates all stage progress records to have the correct approvals_required
UPDATE mockup_stage_progress msp
SET
  approvals_required = count_stage_reviewers(msp.project_id, msp.stage_order),
  updated_at = NOW()
WHERE approvals_required = 0
  AND project_id IS NOT NULL;

-- Step 3: Verify the fix
-- Run this to confirm all records now have correct counts
SELECT
  msp.asset_id,
  a.mockup_name,
  p.name as project_name,
  msp.stage_order,
  msp.status,
  msp.approvals_required,
  msp.approvals_received,
  count_stage_reviewers(msp.project_id, msp.stage_order) as actual_reviewer_count
FROM mockup_stage_progress msp
JOIN assets a ON a.id = msp.asset_id
JOIN projects p ON p.id = msp.project_id
ORDER BY p.name, a.mockup_name, msp.stage_order;

-- ============================================================================
-- Alternative: Force re-initialization for a specific project
-- ============================================================================
-- If you want to completely reset a project's workflow progress:
-- Replace 'YOUR_PROJECT_ID' with the actual project UUID

/*
DO $$
DECLARE
  v_project_id UUID := 'YOUR_PROJECT_ID'; -- Replace with actual project ID
  v_asset RECORD;
BEGIN
  -- For each asset in the project
  FOR v_asset IN
    SELECT id, project_id, org_id
    FROM assets
    WHERE project_id = v_project_id
  LOOP
    -- Delete existing progress
    DELETE FROM mockup_stage_progress WHERE asset_id = v_asset.id;
    DELETE FROM mockup_stage_user_approvals WHERE asset_id = v_asset.id;

    -- Re-initialize with correct counts
    PERFORM initialize_mockup_stage_progress(
      v_asset.id,
      v_asset.project_id,
      v_asset.org_id
    );

    RAISE NOTICE 'Re-initialized asset: %', v_asset.id;
  END LOOP;
END $$;
*/

-- ============================================================================
-- Notes
-- ============================================================================
/*
After running this fix:
1. Refresh your browser to see updated counts
2. The "X of Y approved" should now show correct numbers
3. Existing approvals in mockup_stage_user_approvals are preserved
4. Only the counts are updated

If you still see 0 of 0:
- Check that reviewers are actually assigned to the stage
- Run: SELECT * FROM project_stage_reviewers WHERE project_id = 'YOUR_PROJECT_ID'
- If no reviewers assigned, the count will legitimately be 0
*/


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Create storage buckets: logos, card-templates, card-mockups
-- 2. Verify all tables were created successfully
-- 3. Test your application
