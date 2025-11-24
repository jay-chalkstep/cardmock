#!/bin/bash
# Script to combine all migrations into a single consolidated file

OUTPUT_FILE="00_complete_schema.sql"
MIGRATIONS_DIR="."

# Start with header
cat > "$OUTPUT_FILE" << 'EOF'
-- ============================================================================
-- COMPLETE CARDMOCK DATABASE SCHEMA
-- ============================================================================
-- This is a consolidated migration that combines all 39 individual migrations
-- into a single file for easy setup of a new Supabase project.
--
-- IMPORTANT NOTES:
-- 1. This migration creates the FINAL schema (after all migrations)
-- 2. AI features (migration 11) are NOT included (removed in migration 20)
-- 3. Contracts and Figma (migrations 23-30, 36-38) are NOT included (removed in migration 39)
-- 4. Table names use final terminology: assets (not card_mockups), templates (not card_templates)
-- 5. Storage buckets must be created separately (see SUPABASE_SETUP.md)
--
-- Usage:
-- 1. Create your Supabase project
-- 2. Run this entire file in the SQL Editor
-- 3. Create storage buckets: logos, card-templates, card-mockups
-- 4. Apply storage policies from section below
-- ============================================================================

EOF

# List of migrations to include (in order)
# Skip: 11 (AI features - removed in 20), 23-30 (contracts - removed in 39), 36-38 (contracts - removed in 39)
MIGRATIONS=(
    "01_initial_schema.sql"
    "02_brand_centric.sql"
    "03_storage_setup.sql"
    "04_folder_organization.sql"
    "05_collaboration.sql"
    "06_comment_audit_trail.sql"
    "07_projects.sql"
    "08_workflows.sql"
    "09_stage_progress.sql"
    "10_remove_old_review_system.sql"
    # Skip 11 - AI features (removed in 20)
    "12_fix_brands_multi_tenancy.sql"
    "13_terminology_cleanup.sql"
    "14_fix_security_definer_views.sql"
    "15_fix_migration_history_rls.sql"
    "16_fix_function_search_paths.sql"
    "17_fix_stage_progress_trigger.sql"
    "18_user_level_approvals.sql"
    "19_fix_templates_columns.sql"
    "20_remove_ai_features.sql"
    "21_notifications.sql"
    "22_user_preferences.sql"
    # Skip 23-30 - Contracts and Figma (removed in 39)
    "25_client_ein_and_user_association.sql"
    "26_asset_types.sql"
    "27_contract_notification_types.sql"
    "28_integrations_foundation.sql"
    "29_public_sharing.sql"
    # Skip 30 - Figma (removed in 39)
    "31_gmail_integration.sql"
    "32_slack_integration.sql"
    "33_cloud_storage_import.sql"
    "34_presentation_mode.sql"
    "35_add_client_id_to_projects.sql"
    # Skip 36-38 - Contracts (removed in 39)
    "37_add_searchable_text.sql"
    "39_remove_contracts_and_figma.sql"
    "fix_approval_counts.sql"
)

echo "" >> "$OUTPUT_FILE"
echo "-- ============================================================================" >> "$OUTPUT_FILE"
echo "-- MIGRATIONS COMBINED" >> "$OUTPUT_FILE"
echo "-- ============================================================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Process each migration
for mig in "${MIGRATIONS[@]}"; do
    if [ -f "$mig" ]; then
        echo "-- ============================================================================" >> "$OUTPUT_FILE"
        echo "-- FROM: $mig" >> "$OUTPUT_FILE"
        echo "-- ============================================================================" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        # Remove duplicate CREATE EXTENSION statements (keep only first)
        if [[ "$mig" == "01_initial_schema.sql" ]]; then
            cat "$mig" >> "$OUTPUT_FILE"
        else
            # Remove CREATE EXTENSION lines from other migrations
            grep -v "CREATE EXTENSION IF NOT EXISTS" "$mig" >> "$OUTPUT_FILE" || cat "$mig" >> "$OUTPUT_FILE"
        fi
        echo "" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    else
        echo "Warning: $mig not found, skipping..." >&2
    fi
done

echo "-- ============================================================================" >> "$OUTPUT_FILE"
echo "-- MIGRATION COMPLETE" >> "$OUTPUT_FILE"
echo "-- ============================================================================" >> "$OUTPUT_FILE"
echo "-- Next steps:" >> "$OUTPUT_FILE"
echo "-- 1. Create storage buckets: logos, card-templates, card-mockups" >> "$OUTPUT_FILE"
echo "-- 2. Verify all tables were created successfully" >> "$OUTPUT_FILE"
echo "-- 3. Test your application" >> "$OUTPUT_FILE"

echo "Consolidated migration created: $OUTPUT_FILE"

