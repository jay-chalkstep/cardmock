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

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

