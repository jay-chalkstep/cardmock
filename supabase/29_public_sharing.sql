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

CREATE POLICY "Users can view their own organization's public share links"
  ON public_share_links
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.jwt() ->> 'org_id'
    )
  );

CREATE POLICY "Users can create public share links for their organization's assets"
  ON public_share_links
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.jwt() ->> 'org_id'
    )
    AND created_by = (auth.jwt() ->> 'user_id')
  );

CREATE POLICY "Users can update their own organization's public share links"
  ON public_share_links
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.jwt() ->> 'org_id'
    )
  );

CREATE POLICY "Users can delete their own organization's public share links"
  ON public_share_links
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.jwt() ->> 'org_id'
    )
  );

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

CREATE POLICY "Users can view analytics for their organization's share links"
  ON public_share_analytics
  FOR SELECT
  USING (
    link_id IN (
      SELECT id FROM public_share_links
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.jwt() ->> 'org_id'
      )
    )
  );

CREATE POLICY "Service role can insert analytics"
  ON public_share_analytics
  FOR INSERT
  WITH CHECK (true);

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

