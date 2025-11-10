-- ============================================================================
-- MIGRATION 36: Contract AI Summaries
-- ============================================================================
-- Adds comprehensive AI-generated summaries and changelogs to contracts
-- ============================================================================

-- Add AI summary fields to contracts table
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_changelog TEXT,
  ADD COLUMN IF NOT EXISTS ai_changelog_generated_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN contracts.ai_summary IS 'Comprehensive AI-generated summary of the contract, including key terms, parties, obligations, and important details';
COMMENT ON COLUMN contracts.ai_summary_generated_at IS 'Timestamp when the AI summary was generated';
COMMENT ON COLUMN contracts.ai_changelog IS 'Comprehensive AI-generated changelog showing all version-to-version changes across all documents';
COMMENT ON COLUMN contracts.ai_changelog_generated_at IS 'Timestamp when the AI changelog was generated';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

