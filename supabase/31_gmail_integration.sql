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

