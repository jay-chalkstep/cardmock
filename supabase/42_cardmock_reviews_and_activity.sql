-- ============================================================================
-- Migration 42: CardMock Reviews and Activity System
-- ============================================================================
-- Implements simplified review workflow (independent of stage-based workflows)
-- and activity logging for CardMocks
-- ============================================================================

-- ============================================================================
-- PART 1: CARDMOCK STATUS
-- ============================================================================

-- Add status column to assets table if not exists
ALTER TABLE assets ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';

COMMENT ON COLUMN assets.status IS 'Current status: draft, in_review, approved, needs_changes';

-- ============================================================================
-- PART 2: CARDMOCK REVIEWS TABLE
-- ============================================================================

-- Table for review requests
CREATE TABLE IF NOT EXISTS cardmock_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cardmock_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, changes_requested, cancelled
  review_type VARCHAR(20) NOT NULL DEFAULT 'all', -- all (all must approve), any (any one can approve)
  due_date DATE,
  message TEXT,
  created_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cardmock_reviews_cardmock ON cardmock_reviews(cardmock_id);
CREATE INDEX IF NOT EXISTS idx_cardmock_reviews_status ON cardmock_reviews(status);
CREATE INDEX IF NOT EXISTS idx_cardmock_reviews_created_by ON cardmock_reviews(created_by);
CREATE INDEX IF NOT EXISTS idx_cardmock_reviews_created_at ON cardmock_reviews(created_at DESC);

-- RLS
ALTER TABLE cardmock_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users"
  ON cardmock_reviews FOR ALL USING (true);

COMMENT ON TABLE cardmock_reviews IS 'Review requests for CardMocks. Supports both "all must approve" and "any one can approve" modes.';

-- ============================================================================
-- PART 3: CARDMOCK REVIEW ASSIGNMENTS TABLE
-- ============================================================================

-- Table for individual reviewer assignments
CREATE TABLE IF NOT EXISTS cardmock_review_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES cardmock_reviews(id) ON DELETE CASCADE,
  user_id TEXT, -- Clerk user ID (nullable for external reviewers)
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, changes_requested
  notes TEXT,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_review_assignments_review ON cardmock_review_assignments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_user ON cardmock_review_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_review_assignments_status ON cardmock_review_assignments(status);

-- RLS
ALTER TABLE cardmock_review_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users"
  ON cardmock_review_assignments FOR ALL USING (true);

COMMENT ON TABLE cardmock_review_assignments IS 'Individual reviewer assignments for CardMock reviews.';

-- ============================================================================
-- PART 4: CARDMOCK ACTIVITY TABLE
-- ============================================================================

-- Table for activity/audit logging
CREATE TABLE IF NOT EXISTS cardmock_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cardmock_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- created, edited, shared, review_requested, approved, changes_requested, downloaded, comment_added, duplicated, etc.
  actor_id TEXT, -- Clerk user ID (nullable for system actions)
  metadata JSONB DEFAULT '{}', -- Flexible payload for action-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cardmock_activity_cardmock ON cardmock_activity(cardmock_id);
CREATE INDEX IF NOT EXISTS idx_cardmock_activity_action ON cardmock_activity(action);
CREATE INDEX IF NOT EXISTS idx_cardmock_activity_actor ON cardmock_activity(actor_id);
CREATE INDEX IF NOT EXISTS idx_cardmock_activity_created_at ON cardmock_activity(created_at DESC);

-- RLS
ALTER TABLE cardmock_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users"
  ON cardmock_activity FOR ALL USING (true);

COMMENT ON TABLE cardmock_activity IS 'Activity log for CardMocks. Tracks all actions: created, edited, shared, reviewed, etc.';

-- ============================================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================================

-- Function to check if review is complete and update statuses
CREATE OR REPLACE FUNCTION check_review_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review cardmock_reviews%ROWTYPE;
  v_total_count INTEGER;
  v_approved_count INTEGER;
  v_changes_requested_count INTEGER;
  v_new_status VARCHAR(20);
BEGIN
  -- Get the review
  SELECT * INTO v_review
  FROM cardmock_reviews
  WHERE id = NEW.review_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Count assignments
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'changes_requested')
  INTO v_total_count, v_approved_count, v_changes_requested_count
  FROM cardmock_review_assignments
  WHERE review_id = NEW.review_id;

  -- Determine new status
  IF v_changes_requested_count > 0 THEN
    -- Any changes requested means needs_changes
    v_new_status := 'changes_requested';
  ELSIF v_review.review_type = 'any' AND v_approved_count > 0 THEN
    -- "Any" mode: one approval is enough
    v_new_status := 'approved';
  ELSIF v_review.review_type = 'all' AND v_approved_count = v_total_count THEN
    -- "All" mode: all must approve
    v_new_status := 'approved';
  ELSE
    -- Still pending
    v_new_status := 'pending';
  END IF;

  -- Update review status if changed
  IF v_new_status != v_review.status THEN
    UPDATE cardmock_reviews
    SET
      status = v_new_status,
      completed_at = CASE WHEN v_new_status IN ('approved', 'changes_requested') THEN NOW() ELSE NULL END
    WHERE id = v_review.id;

    -- Update cardmock status
    UPDATE assets
    SET status = CASE
      WHEN v_new_status = 'approved' THEN 'approved'
      WHEN v_new_status = 'changes_requested' THEN 'needs_changes'
      ELSE 'in_review'
    END
    WHERE id = v_review.cardmock_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger to check review completion on assignment update
DROP TRIGGER IF EXISTS trigger_check_review_completion ON cardmock_review_assignments;
CREATE TRIGGER trigger_check_review_completion
  AFTER UPDATE OF status ON cardmock_review_assignments
  FOR EACH ROW
  EXECUTE FUNCTION check_review_completion();

-- ============================================================================
-- PART 6: INITIAL ACTIVITY LOGGING
-- ============================================================================

-- Log 'created' activity for existing assets that don't have any activity
INSERT INTO cardmock_activity (cardmock_id, action, actor_id, metadata, created_at)
SELECT
  id,
  'created',
  created_by,
  '{"initial_migration": true}'::jsonb,
  created_at
FROM assets
WHERE NOT EXISTS (
  SELECT 1 FROM cardmock_activity WHERE cardmock_activity.cardmock_id = assets.id
);

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================
/*
This migration adds:

1. status column to assets table for CardMock workflow status

2. cardmock_reviews table for review requests
   - Supports "all must approve" and "any one can approve" modes
   - Tracks due dates and messages

3. cardmock_review_assignments table for individual reviewers
   - Links reviewers to review requests
   - Tracks individual responses

4. cardmock_activity table for audit logging
   - Tracks all actions on CardMocks
   - Stores flexible metadata as JSONB

5. Trigger function to automatically update review/cardmock status
   when reviewers respond

ROLLBACK:
```sql
DROP TRIGGER IF EXISTS trigger_check_review_completion ON cardmock_review_assignments;
DROP FUNCTION IF EXISTS check_review_completion CASCADE;
DROP TABLE IF EXISTS cardmock_activity CASCADE;
DROP TABLE IF EXISTS cardmock_review_assignments CASCADE;
DROP TABLE IF EXISTS cardmock_reviews CASCADE;
ALTER TABLE assets DROP COLUMN IF EXISTS status;
```
*/
