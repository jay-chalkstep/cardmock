-- ============================================================================
-- MIGRATION 38: Contract Routing for Comment
-- ============================================================================
-- Adds version owner tracking and routing functionality for contracts
-- Enables sending contract versions to stakeholders via email or Slack
-- ============================================================================

-- Create version_owner enum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE version_owner AS ENUM ('cdco', 'client');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add version_owner to contract_documents
ALTER TABLE contract_documents
  ADD COLUMN IF NOT EXISTS version_owner version_owner DEFAULT 'cdco';

-- Add version_owner to contract_document_versions
ALTER TABLE contract_document_versions
  ADD COLUMN IF NOT EXISTS version_owner version_owner DEFAULT 'cdco';

-- Create contract_routing_recipients table
CREATE TABLE IF NOT EXISTS contract_routing_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contract_id, email)
);

-- Create contract_routing_events table
CREATE TABLE IF NOT EXISTS contract_routing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  document_id UUID REFERENCES contract_documents(id) ON DELETE SET NULL,
  routed_by TEXT NOT NULL, -- Clerk user ID
  routing_method TEXT NOT NULL, -- 'email' | 'slack' | 'both'
  recipients JSONB NOT NULL, -- Array of recipient info
  slack_channel_id TEXT, -- If Slack was used
  message TEXT, -- Optional custom message
  ai_summary_included BOOLEAN DEFAULT true,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_contract_routing_recipients_contract_id 
  ON contract_routing_recipients(contract_id);

CREATE INDEX IF NOT EXISTS idx_contract_routing_events_contract_id 
  ON contract_routing_events(contract_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_contract_documents_version_owner 
  ON contract_documents(version_owner);

-- Enable RLS
ALTER TABLE contract_routing_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_routing_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_routing_recipients
-- Allow service role full access
CREATE POLICY "Service role full access on contract_routing_recipients"
  ON contract_routing_recipients FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read/write their organization's recipients
CREATE POLICY "Users can manage routing recipients for their organization"
  ON contract_routing_recipients FOR ALL
  TO authenticated
  USING (organization_id = current_setting('app.current_organization_id', true))
  WITH CHECK (organization_id = current_setting('app.current_organization_id', true));

-- RLS Policies for contract_routing_events
-- Allow service role full access
CREATE POLICY "Service role full access on contract_routing_events"
  ON contract_routing_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read their organization's routing events
CREATE POLICY "Users can read routing events for their organization"
  ON contract_routing_events FOR SELECT
  TO authenticated
  USING (organization_id = current_setting('app.current_organization_id', true));

-- Add comments
COMMENT ON COLUMN contract_documents.version_owner IS 'Indicates whether this version represents CDCO''s or the client''s latest offering';
COMMENT ON COLUMN contract_document_versions.version_owner IS 'Indicates whether this version represents CDCO''s or the client''s latest offering';
COMMENT ON TABLE contract_routing_recipients IS 'Saved list of recipients for routing contract versions for comment';
COMMENT ON TABLE contract_routing_events IS 'History of all contract routing events (email/Slack distribution)';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

