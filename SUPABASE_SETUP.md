# Supabase Setup Guide for New Project

This guide will help you set up your new Supabase project with all required migrations and storage buckets.

## Prerequisites

1. New Supabase project created at https://supabase.com
2. Environment variables configured:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for server-side operations)

## Step 1: Run Database Migrations

You have two options:

### Option A: Single Consolidated Migration (RECOMMENDED for new projects)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase/00_complete_schema.sql`
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** to execute everything at once

This single file combines all 39 migrations into one, making setup much faster!

### Option B: Individual Migrations (if you need to run them separately)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order (01 through 39, then fix_approval_counts.sql)

**Migration Order:**
```
01_initial_schema.sql
02_brand_centric.sql
03_storage_setup.sql (policies only - buckets created separately)
04_folder_organization.sql
05_collaboration.sql
06_comment_audit_trail.sql
07_projects.sql
08_workflows.sql
09_stage_progress.sql
10_remove_old_review_system.sql
11_ai_features.sql
12_fix_brands_multi_tenancy.sql
13_terminology_cleanup.sql
14_fix_security_definer_views.sql
15_fix_migration_history_rls.sql
16_fix_function_search_paths.sql
17_fix_stage_progress_trigger.sql
18_user_level_approvals.sql
19_fix_templates_columns.sql
20_remove_ai_features.sql
21_notifications.sql
22_user_preferences.sql
23_contracts_module.sql
24_contract_documents_storage.sql
25_client_ein_and_user_association.sql
26_asset_types.sql
27_contract_notification_types.sql
28_integrations_foundation.sql
29_public_sharing.sql
30_figma_integration.sql
31_gmail_integration.sql
32_slack_integration.sql
33_cloud_storage_import.sql
34_presentation_mode.sql
35_add_client_id_to_projects.sql
36_contract_ai_summaries.sql
37_add_searchable_text.sql
38_contract_routing.sql
39_remove_contracts_and_figma.sql
fix_approval_counts.sql
```

### Option B: Supabase CLI

If you have Supabase CLI installed and linked:

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Push all migrations
supabase db push
```

## Step 2: Create Storage Buckets

Storage buckets must be created manually through the Supabase Dashboard or CLI.

### Required Buckets:

1. **`logos`** (public)
   - Public: Yes
   - File size limit: 10 MB
   - Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`, `image/svg+xml`, `image/webp`

2. **`card-templates`** (public)
   - Public: Yes
   - File size limit: 10 MB
   - Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`, `image/svg+xml`

3. **`card-mockups`** (public)
   - Public: Yes
   - File size limit: 10 MB
   - Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`

### Via Supabase Dashboard:

1. Go to **Storage** section in your Supabase Dashboard
2. Click **"New bucket"**
3. Create each bucket with the settings above

### Via Supabase CLI:

```bash
supabase storage create logos --public
supabase storage create card-templates --public
supabase storage create card-mockups --public
```

## Step 3: Apply Storage Policies

After creating the buckets, run the storage policies from `03_storage_setup.sql`:

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy the policies section from `supabase/03_storage_setup.sql` (starting from line 42)
3. Run the SQL to apply the policies

Or if using CLI, the policies should be applied automatically when you run the migration.

## Step 4: Verify Setup

### Check Database Tables

Run this query in SQL Editor to verify all tables exist:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see tables like:
- `assets`
- `brands`
- `brand_colors`
- `brand_fonts`
- `clients`
- `folders`
- `notifications`
- `projects`
- `workflows`
- And many more...

### Check Storage Buckets

1. Go to **Storage** section
2. Verify all three buckets exist: `logos`, `card-templates`, `card-mockups`
3. Verify they are marked as **Public**

### Check RLS Policies

Verify Row Level Security is enabled:

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;
```

## Step 5: Test the Application

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Try uploading a logo or creating a mockup
3. Verify files appear in the storage buckets
4. Check that public URLs work

## Troubleshooting

### Migration Errors

- **"relation already exists"**: Some tables may already exist. Check if you're running migrations on a fresh database or if some were already applied.
- **"function does not exist"**: Make sure you're running migrations in order. Some migrations depend on functions created in earlier migrations.
- **"permission denied"**: Ensure you're using a service role key or have proper permissions.

### Storage Upload Errors

- **"Bucket not found"**: Verify buckets are created and names match exactly (case-sensitive)
- **"Policy violation"**: Check that storage policies from `03_storage_setup.sql` are applied
- **CORS errors**: Verify buckets are set to public

### Build Errors

- **TypeScript errors**: Make sure all migrations are applied and database schema matches TypeScript types
- **Missing environment variables**: Verify `.env.local` has all required Supabase credentials

## Next Steps

After setup is complete:

1. Configure Clerk authentication (if not already done)
2. Set up your first organization
3. Create your first brand and upload logos
4. Test the workflow system

## Need Help?

- Check migration files for comments and documentation
- Review `README.md` for application-specific details
- Check Supabase logs in the Dashboard for detailed error messages

