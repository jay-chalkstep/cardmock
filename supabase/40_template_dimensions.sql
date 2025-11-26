-- Migration: Add dimension tracking columns to templates table
-- Purpose: Track template dimensions for precision tools and quality validation

-- Add columns for stored (scaled) dimensions
ALTER TABLE templates ADD COLUMN IF NOT EXISTS width INTEGER DEFAULT 1012;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS height INTEGER DEFAULT 637;

-- Add columns for original (uploaded) dimensions to track source quality
ALTER TABLE templates ADD COLUMN IF NOT EXISTS original_width INTEGER;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS original_height INTEGER;

-- Add scale factor to track how much upscaling was applied
-- Positive values indicate upscaling, negative indicate downscaling
ALTER TABLE templates ADD COLUMN IF NOT EXISTS scale_factor DECIMAL(5,2);

-- Add comments for documentation
COMMENT ON COLUMN templates.width IS 'Template width in pixels (always 1012 for prepaid card standard at 300 DPI)';
COMMENT ON COLUMN templates.height IS 'Template height in pixels (always 637 for prepaid card standard at 300 DPI)';
COMMENT ON COLUMN templates.original_width IS 'Original uploaded image width before scaling';
COMMENT ON COLUMN templates.original_height IS 'Original uploaded image height before scaling';
COMMENT ON COLUMN templates.scale_factor IS 'Percentage upscale applied (e.g., 25.5 means 25.5% larger than original)';

-- Update existing templates with default dimensions (they were uploaded before validation)
-- Mark them with NULL original dimensions to indicate they weren't validated
UPDATE templates
SET width = 1012, height = 637
WHERE width IS NULL OR height IS NULL;
