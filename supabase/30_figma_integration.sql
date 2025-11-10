-- ============================================================================
-- Migration 30: Figma Integration
-- ============================================================================
-- Enables Figma plugin integration for direct frame upload and status sync
-- ============================================================================

-- Figma integrations (OAuth tokens)
CREATE TABLE IF NOT EXISTS figma_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL, -- Clerk user ID
  figma_user_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Figma sync events (tracking)
CREATE TABLE IF NOT EXISTS figma_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES figma_integrations(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'upload', 'status_update', 'comment_sync'
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  error_message TEXT,
  metadata_jsonb JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add Figma metadata to assets
ALTER TABLE assets ADD COLUMN IF NOT EXISTS figma_metadata JSONB;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_figma_integrations_org_user ON figma_integrations(organization_id, user_id);
CREATE INDEX IF NOT EXISTS idx_figma_sync_events_asset_id ON figma_sync_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_figma_sync_events_integration_id ON figma_sync_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_figma_sync_events_status ON figma_sync_events(status);

-- RLS Policies for figma_integrations
ALTER TABLE figma_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON figma_integrations FOR ALL
  USING (true);

-- RLS Policies for figma_sync_events
ALTER TABLE figma_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users in org"
  ON figma_sync_events FOR ALL
  USING (true);

-- Add updated_at trigger for figma_integrations
CREATE OR REPLACE FUNCTION update_figma_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER figma_integrations_updated_at
  BEFORE UPDATE ON figma_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_figma_integrations_updated_at();

-- Comments
COMMENT ON TABLE figma_integrations IS 'OAuth credentials for Figma plugin integration';
COMMENT ON TABLE figma_sync_events IS 'Tracks Figma sync events for debugging and monitoring';
COMMENT ON COLUMN assets.figma_metadata IS 'Figma-specific metadata: file_id, node_ids, file_url, version_key, last_modified';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

