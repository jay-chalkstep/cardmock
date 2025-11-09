-- ============================================================================
-- Migration 27: Contract Notification Types
-- ============================================================================
-- Adds new notification types for contract-related events
-- ============================================================================

-- Add new notification types to the enum
-- Note: PostgreSQL doesn't support ALTER TYPE ... ADD VALUE in a transaction
-- So we need to use a different approach

-- First, check if the enum values already exist
DO $$ 
BEGIN
  -- Add new notification types if they don't exist
  -- We'll use ALTER TYPE ... ADD VALUE IF NOT EXISTS (PostgreSQL 9.1+)
  -- But since we can't use IF NOT EXISTS, we'll catch the error if it exists
  
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'contract_document_uploaded';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'contract_signature_requested';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'contract_signed';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'email_mockup_approval_requested';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'payment_method_approval_requested';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'amendment_created';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Add contract_id and related_contract_id columns to notifications table
-- for contract-related notifications
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS related_contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE;

-- Add index for contract-related notifications
CREATE INDEX IF NOT EXISTS idx_notifications_contract ON notifications(related_contract_id) WHERE related_contract_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN notifications.related_contract_id IS 'References contract for contract-related notifications';
COMMENT ON TYPE notification_type IS 'Enum for notification types including contract-related events';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

