# Schema Fixes Applied

## Overview
Fixed the combined schema file (`00_complete_schema.sql`) to resolve SQL execution errors caused by references to removed tables and improper sequencing.

## Issues Fixed

### 1. Missing `validate_workflow_stages` Function Parameter
**Error:** `function validate_workflow_stages(jsonb) does not exist`
**Location:** Line 2156
**Fix:** Changed `ALTER FUNCTION validate_workflow_stages(jsonb)` to `ALTER FUNCTION validate_workflow_stages()` to match the actual trigger function signature (no parameters).

### 2. Missing `clients` Table
**Error:** `relation "clients" does not exist`
**Location:** Line 3209 (Migration 25)
**Fix:** Added creation of `clients` table before Migration 25 attempts to alter it:
```sql
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. References to Non-Existent `contracts` Table
**Error:** `relation "contracts" does not exist`
**Location:** Multiple locations in migrations 27 and 37
**Fixes:**
- **Removed Migration 27 entirely** (Contract Notification Types) - This migration added contract-specific notification types and columns that reference the non-existent contracts table
- **Modified Migration 37** (Add Searchable Text) - Removed references to `contract_documents` table, kept only the assets-related portions
- **Updated Migration 28** - Removed 'figma' from integration types comment

## Removed Components
As documented in the schema header, the following were intentionally removed:
- AI features (Migration 11, removed in Migration 20)
- Contracts functionality (Migrations 23-24, 27, 36, 38)
- Figma integration (Migration 30)

## Migration Sequence
The final schema now properly sequences:
1. Creates all necessary tables (including `clients`)
2. Applies alterations and indexes
3. Migration 39 at the end drops any remaining contract/Figma artifacts

## Testing
The schema should now execute without errors. Make sure to:
1. Run the entire `00_complete_schema.sql` file in a fresh database
2. Create the required storage buckets: `logos`, `card-templates`, `card-mockups`
3. Apply storage policies as documented in the schema

## Notes
- The `brands` and `clients` tables are separate entities
- `brands` can be associated with `clients` via the `client_id` foreign key
- All contract and Figma references have been properly cleaned up