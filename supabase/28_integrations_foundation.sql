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
  integration_type TEXT NOT NULL, -- 'figma', 'gmail', 'slack', 'drive', 'dropbox'
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

