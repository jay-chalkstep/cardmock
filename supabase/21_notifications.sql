-- ============================================================================
-- Migration 21: Notifications System
-- ============================================================================
-- Creates notifications table for in-app notification system
-- Supports approval requests, comments, stage progress, and final approvals
-- ============================================================================

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'approval_request',      -- User assigned as reviewer
  'approval_received',     -- Someone approved (progress update)
  'comment',               -- New comment on asset
  'stage_progress',        -- Stage advanced or completed
  'final_approval',        -- Final approval needed or completed
  'changes_requested'      -- Changes requested by reviewer
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL, -- Clerk user ID (recipient)
  organization_id TEXT NOT NULL, -- Clerk org ID for multi-tenancy
  
  -- Notification content
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT, -- e.g., '/mockups/[id]' or '/projects/[id]'
  
  -- Related entities (nullable for flexibility)
  related_asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  related_project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Read status
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::jsonb, -- For additional context (e.g., stage name, reviewer name)
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_asset ON notifications(related_asset_id) WHERE related_asset_id IS NOT NULL;
CREATE INDEX idx_notifications_project ON notifications(related_project_id) WHERE related_project_id IS NOT NULL;
CREATE INDEX idx_notifications_type ON notifications(type, created_at DESC);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications within their organization
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- Policy: System can create notifications (via service role)
-- Note: In practice, notifications are created via API routes using service role
-- This policy allows authenticated users to create notifications for themselves
-- (though typically done via service role in API routes)
CREATE POLICY "Users can create own notifications"
  ON notifications FOR INSERT
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  )
  WITH CHECK (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- Policy: Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (
    user_id = current_setting('app.current_user_id', true) AND
    organization_id = current_setting('app.current_org_id', true)
  );

-- ============================================================================
-- HELPER FUNCTION: Get unread notification count
-- ============================================================================
CREATE OR REPLACE FUNCTION get_unread_notification_count(
  p_user_id TEXT,
  p_organization_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id
    AND organization_id = p_organization_id
    AND is_read = false;
  
  RETURN COALESCE(unread_count, 0);
END;
$$;

