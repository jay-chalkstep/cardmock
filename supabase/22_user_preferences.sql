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

