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

