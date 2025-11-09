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

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

