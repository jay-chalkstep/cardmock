-- ============================================================================
-- Migration 25: Client EIN, User Association, Hierarchy, and Brand Association
-- ============================================================================
-- Adds EIN field to clients, implements user-client association system,
-- adds client hierarchy support, and adds brand-client association.
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD EIN FIELD TO CLIENTS TABLE
-- ============================================================================

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS ein TEXT;

-- Add index on EIN for lookups
CREATE INDEX IF NOT EXISTS idx_clients_ein ON clients(ein) WHERE ein IS NOT NULL;

-- ============================================================================
-- STEP 2: ADD CLIENT HIERARCHY SUPPORT
-- ============================================================================

-- Add parent_client_id column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS parent_client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index on parent_client_id for hierarchy queries
CREATE INDEX IF NOT EXISTS idx_clients_parent ON clients(parent_client_id) WHERE parent_client_id IS NOT NULL;

-- Add constraint to prevent circular references
-- A client cannot be its own parent (enforced by check constraint)
ALTER TABLE clients
DROP CONSTRAINT IF EXISTS check_no_self_parent;

ALTER TABLE clients
ADD CONSTRAINT check_no_self_parent CHECK (id != parent_client_id);

-- ============================================================================
-- STEP 3: CREATE USER-CLIENT ASSOCIATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID
  organization_id TEXT NOT NULL,
  assigned_by TEXT NOT NULL, -- Clerk user ID who assigned
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one client per user per organization
  CONSTRAINT unique_user_client_per_org UNIQUE(user_id, organization_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_user ON client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_org ON client_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_users_assigned_at ON client_users(assigned_at DESC);

-- ============================================================================
-- STEP 4: ADD BRAND-CLIENT ASSOCIATION
-- ============================================================================

-- Add client_id column to brands table
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index on client_id for client-brand lookups
CREATE INDEX IF NOT EXISTS idx_brands_client ON brands(client_id) WHERE client_id IS NOT NULL;

-- ============================================================================
-- STEP 5: UPDATED_AT TRIGGERS
-- ============================================================================

-- Client users updated_at trigger
DROP TRIGGER IF EXISTS update_client_users_updated_at ON client_users;
CREATE TRIGGER update_client_users_updated_at
  BEFORE UPDATE ON client_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: ROW LEVEL SECURITY
-- ============================================================================

-- Client users RLS
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated users in org" ON client_users;
CREATE POLICY "Allow all for authenticated users in org"
  ON client_users FOR ALL
  USING (true);

-- ============================================================================
-- STEP 7: HELPER FUNCTIONS
-- ============================================================================

-- Function to get all child clients (recursive)
CREATE OR REPLACE FUNCTION get_child_clients(parent_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  parent_client_id UUID,
  level INTEGER
) AS $$
WITH RECURSIVE client_hierarchy AS (
  -- Base case: direct children
  SELECT 
    c.id,
    c.name,
    c.parent_client_id,
    1 as level
  FROM clients c
  WHERE c.parent_client_id = parent_id
  
  UNION ALL
  
  -- Recursive case: children of children
  SELECT 
    c.id,
    c.name,
    c.parent_client_id,
    ch.level + 1
  FROM clients c
  INNER JOIN client_hierarchy ch ON c.parent_client_id = ch.id
)
SELECT * FROM client_hierarchy;
$$ LANGUAGE SQL STABLE;

-- Function to check if client hierarchy is valid (no circular references)
CREATE OR REPLACE FUNCTION check_client_hierarchy_valid(client_id UUID, new_parent_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN := true;
BEGIN
  -- A client cannot be its own parent
  IF client_id = new_parent_id THEN
    RETURN false;
  END IF;
  
  -- Check if new_parent_id is a descendant of client_id (would create cycle)
  IF EXISTS (
    SELECT 1 FROM get_child_clients(client_id) WHERE id = new_parent_id
  ) THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 8: COMMENTS
-- ============================================================================

COMMENT ON COLUMN clients.ein IS 'Employer Identification Number (EIN) for client identification';
COMMENT ON COLUMN clients.parent_client_id IS 'References parent client for hierarchy. NULL for top-level clients.';
COMMENT ON TABLE client_users IS 'User-client association table. One client per user per organization.';
COMMENT ON COLUMN client_users.user_id IS 'Clerk user ID';
COMMENT ON COLUMN client_users.assigned_by IS 'Clerk user ID who assigned this user to the client';
COMMENT ON COLUMN brands.client_id IS 'References client for brand-client association. NULL for org-level brands.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

