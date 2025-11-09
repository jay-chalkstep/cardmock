/**
 * Database Column Name Mapping Utilities
 * Handles column name inconsistencies (mockup_id vs asset_id)
 */

/**
 * Column name mapping for tables that were renamed
 * Migration 13 renamed mockup_id to asset_id in several tables
 */
export const COLUMN_MAPPING = {
  // Tables that use asset_id (after migration 13)
  mockup_comments: 'asset_id',
  mockup_reviewers: 'asset_id',
  mockup_stage_progress: 'asset_id',
  mockup_ai_metadata: 'asset_id',
  folder_suggestions: 'asset_id',
  
  // Tables that still use mockup_id
  card_mockups: 'id', // Primary key, not renamed
} as const;

/**
 * Get the correct column name for a table
 */
export function getColumnName(table: string, column: 'mockup_id' | 'asset_id'): string {
  const mappedColumn = COLUMN_MAPPING[table as keyof typeof COLUMN_MAPPING];
  
  if (mappedColumn) {
    return mappedColumn;
  }
  
  // Default to asset_id for most tables (post-migration 13)
  return column === 'mockup_id' ? 'asset_id' : column;
}

/**
 * Table names that use asset_id
 */
export const ASSET_ID_TABLES = [
  'mockup_comments',
  'mockup_reviewers',
  'mockup_stage_progress',
  'mockup_ai_metadata',
  'folder_suggestions',
] as const;

/**
 * Check if a table uses asset_id
 */
export function usesAssetId(table: string): boolean {
  return ASSET_ID_TABLES.includes(table as typeof ASSET_ID_TABLES[number]);
}

