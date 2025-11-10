-- ============================================================================
-- Migration 35: Add client_id to projects table
-- ============================================================================
-- Projects must have a direct relationship to clients via client_id
-- This fixes access control logic so client-role users see projects
-- based on their assigned client, not contracts
-- ============================================================================

-- Step 1: Add client_id column (nullable initially for migration)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Step 2: Migrate existing data - set client_id based on client_name matching
-- For projects with client_name, try to find matching client by name
UPDATE projects p
SET client_id = (
  SELECT c.id
  FROM clients c
  WHERE c.name = p.client_name
    AND c.organization_id = p.organization_id
  LIMIT 1
)
WHERE p.client_id IS NULL
  AND p.client_name IS NOT NULL
  AND p.client_name != '';

-- Step 3: Handle projects with NULL client_name or no match
-- For projects that couldn't be matched, we'll need to set them manually
-- For now, we'll leave them NULL and require manual assignment
-- (This will be handled in the application layer)

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_org ON projects(client_id, organization_id);

-- Step 5: Add comment
COMMENT ON COLUMN projects.client_id IS 'Required reference to clients table. Projects must belong to a client.';

-- Note: We're keeping client_id nullable for now to allow manual assignment
-- of projects that couldn't be automatically migrated. After all projects
-- have been assigned, we can make it NOT NULL in a future migration.


