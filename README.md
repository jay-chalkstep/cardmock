# Aiproval v4.1.0

> Multi-tenant SaaS for brand asset management, collaborative mockup review, comprehensive contract management, and platform integrations

A comprehensive platform for design teams, marketing departments, and agencies to search, organize, and collaborate on brand assets with real-time visual annotation, multi-stage approval workflows, project-based review management, full contract lifecycle management, and seamless integrations with Figma, Gmail, Slack, and cloud storage.

---

## 🎯 Overview

**Aiproval** is a full-featured brand asset management, collaboration, and contract management platform that enables teams to:

- 🔍 **Search & Save** company logos via Brandfetch API with automatic metadata extraction
- 📁 **Organize** brand assets in personal and shared folder hierarchies
- 📋 **Manage Projects** with client-based organization and workflow assignments
- 📄 **Manage Contracts** - Complete contract lifecycle management with document versioning ⭐️ NEW
- 👥 **Manage Clients** - Client database with full CRUD operations ⭐️ NEW
- 📝 **Document Versioning** - Word document upload and version control with AI diff summaries ⭐️ NEW
- ✉️ **Email Mockups** - Visual email template creation with client branding ⭐️ NEW
- 💳 **Payment Methods** - Flexible payment method approval workflows ⭐️ NEW
- 🔄 **Standardize Workflows** with reusable multi-stage approval templates
- 🎨 **Design** professional mockups using an interactive canvas editor
- 👥 **Collaborate** with visual annotations, comments, and structured review workflows
- ✅ **Review & Approve** mockups with approval tracking and email notifications
- 🔔 **Notifications** - In-app notification system for approvals, comments, and workflow updates
- ⚙️ **Settings** - Comprehensive settings modal with preferences, account, and organization management
- 📊 **Track** complete audit trail of edits, resolutions, and feedback history
- 🔗 **Platform Integrations** - Seamless integrations with Figma, Gmail, Slack, Drive/Dropbox ⭐️ NEW
- 🌐 **Public Share Pages** - Share assets with external reviewers without account creation ⭐️ NEW
- 🎨 **Presentation Mode** - Side-by-side comparison and presentation tools for stakeholder reviews ⭐️ NEW

Built for teams who need more than basic file storage—Aiproval provides context-aware collaboration with visual feedback directly on mockup designs, organized by client projects with customizable approval workflows, comprehensive contract management for customer onboarding, and powerful integrations that bring approvals into existing design and communication tools.

---

## ✨ Key Features

### UI/UX Excellence ⭐️ ENHANCED in v3.9.0
- **Home/Dashboard** - Overview page for both creators and reviewers with quick actions
- **Global Search** - Persistent search bar in header (Cmd+K) with unified search across all content
- **Library Reorganization** - Unified Library page with tabs for Assets, Brands, and Templates
- **Improved Navigation** - Clear structure: Home → Projects → My Reviews → Library → Designer
- **Gmail-style Three-Panel Layout** - Consistent navigation with collapsible context panels
- **Brand-Centric Interface** - Professional terminology focused on "brands" not "logos"
- **Smart Context Panels** - Collapsible side panels for stage reviewers and folder navigation
- **Full Name Display** - Shows complete user names for better identification
- **Intuitive Button Ordering** - Logical flow: View → Upload Brand → Upload Template
- **Responsive Navigation** - NavRail present on all pages with consistent behavior
- **Improved Scrolling** - Fixed overflow issues for seamless content browsing
- **Clear Visual Hierarchy** - Color legends positioned for maximum visibility

### Notifications System ⭐️ NEW in v3.8.0
- **In-App Notifications** - Real-time notification system with dropdown panel
- **Notification Types** - Approval requests, approval received, comments, stage progress, final approval, changes requested
- **Unread Badge** - Visual indicator showing unread notification count
- **Mark as Read** - Click to mark individual notifications as read
- **Mark All as Read** - Bulk action to clear all unread notifications
- **Auto-Navigation** - Click notification to navigate to related asset/project
- **Real-Time Updates** - Polling system checks for new notifications every 30 seconds
- **Notification History** - Persistent storage in database for full notification history
- **Smart Grouping** - Notifications grouped by date with visual indicators

### Settings & Preferences ⭐️ NEW in v3.8.0
- **Settings Modal** - Comprehensive settings interface with tabbed navigation
- **User Preferences** - Customizable notification preferences (email and in-app)
- **Display Settings** - Theme selection (light, dark, system)
- **Account Management** - Integrated Clerk UserProfile for profile settings
- **Organization Management** - Integrated Clerk OrganizationProfile for admin users
- **Help & Support** - Documentation links and support resources
- **Consolidated Navigation** - User and organization management moved from admin nav to Settings

### Brand Asset Management
- **Brand Search** via Brandfetch API (search by domain or company name)
- **Brand Library** with brand-centric data model (multiple variants per brand)
- **Brand Variants** with format support (SVG, PNG, light/dark themes)
- **Color Palettes** automatically extracted from brand data
- **Font Information** captured and stored
- **Organization Scoping** for secure multi-tenant data isolation

### Contract Management ⭐️ NEW in v4.0.0
- **Client Management** - Full client database with contact information
  - Client list page with search and filtering
  - Client detail page with tabs (Overview, Contracts, Projects)
  - Create, edit, and delete clients
- **Contract Creation** - Create new contracts and amendments
- **Contract Status Tracking** - Draft, pending signature, signed, amended, expired, voided
- **Document Versioning** - Upload Word documents with automatic version control
  - Upload, view, download, and delete documents
  - Automatic version tracking with current version marking
- **Version History** - Complete document version history with timestamps
- **AI Diff Summaries** - AI-powered document comparison (placeholder for future implementation)
- **DocuSign Integration** - E-signature workflow (placeholder for future implementation)
- **Email Mockups** - Create and approve email templates with client branding
  - Full-featured HTML editor with preview mode
  - Variable insertion (client_name, activation_link, etc.)
  - Client branding selector (colors, fonts, logos)
  - Email mockup list and preview components
- **Payment Methods** - Flexible payment method approval workflows
  - Add, view, and delete payment methods
  - Support for prepaid cards, checks, Amazon cards, and custom types
- **Contract-Project Linking** - Link contracts to projects for organization
- **Contract Detail View** - Comprehensive contract view with tabs for all related content
  - Documents tab - Upload and manage contract documents
  - Email Mockups tab - Create and manage email templates
  - Payment Methods tab - Manage payment methods
  - Assets tab - View linked assets
  - Comments tab - Add and view contract comments (UI ready)
- **Contract Notifications** - In-app and email notifications for contract events
  - Notifications sent to organization members on contract creation
  - Notifications sent on contract status changes
  - Email notification templates ready for document uploads

### Project Management
- **Client Projects** - Organize mockups by client, campaign, or initiative
- **Project Status** - Active, Completed, or Archived status tracking
- **Color Coding** - Custom color labels for visual organization (8 preset colors)
- **Mockup Assignment** - Link mockups to projects for easy grouping
- **Contract Linking** - Link projects to contracts for customer onboarding ⭐️ NEW
- **Project Detail Pages** - Dedicated views with mockup galleries and search
- **Thumbnail Previews** - Up to 4 mockup thumbnails on project cards
- **Permission Controls** - Only creator or admin can edit/delete projects

### Workflow Templates & User-Level Approval System ⭐️ ENHANCED in v3.6
- **Reusable Workflows** - Create multi-stage approval templates (1-10 stages)
- **Color-Coded Stages** - 7 colors for visual workflow organization
- **Stage-Based Reviewers** - Assign specific reviewers to each workflow stage
- **Individual Approval Tracking** - Every reviewer's approval tracked separately ⭐️ NEW
- **All-Must-Approve Logic** - ALL assigned reviewers must approve before advancing ⭐️ NEW
- **Approval Progress Display** - Real-time "X of Y approved" counters ⭐️ NEW
- **Quick Approve** - One-click approval from dashboard or detail page ⭐️ NEW
- **Project Owner Final Approval** - Owner must sign off after all stages complete ⭐️ NEW
- **Approval Timeline** - Complete chronological history of all approvals ⭐️ NEW
- **Automatic Stage Initialization** - Progress tracking starts when mockup assigned to project
- **Sequential Progression** - Mockups advance stage-by-stage (1 → 2 → 3)
- **Approve or Request Changes** - Reviewers can approve or send back for revisions
- **Change Request Reset** - Sending back resets mockup to Stage 1 for revision
- **Email Notifications** - Auto-sent at every stage transition and approval milestone
- **Live Workflow Board** - Kanban-style view of mockups progressing through stages
- **Reviewer Dashboard** - Centralized "My Stage Reviews" page for pending approvals
- **Full Audit Trail** - Track who reviewed, when, and what they said (individual level)
- **Default Workflows** - Auto-assign workflows to new projects
- **Admin Management** - Centralized workflow creation and editing (admin-only)
- **Workflow Archive** - Archive old workflows while preserving history

### Mockup Designer
- **Interactive Canvas** powered by Konva.js for precise control
- **Drag & Drop** logo placement with live preview
- **Position Controls** (arrow keys, presets, numeric input)
- **Size Controls** with aspect ratio lock
- **Grid Overlay** for alignment
- **Template Backgrounds** from custom library
- **High-Resolution Export** (2x pixel ratio, with/without annotations)
- **Zoom & Pan** (25%-400% zoom, mouse wheel + buttons)

### Collaboration System ⭐️
- **Visual Annotations** with 7 drawing tools:
  - 📍 Pin markers
  - ➡️ Arrows
  - ⭕ Circles
  - ▢ Rectangles
  - ✏️ Freehand drawing
  - 📝 Text annotations
  - 🖱️ Select tool (pan & move annotations)
- **Comments** linked to annotations with numbered badges
- **Hover Linking** - hover over comment to highlight annotation on canvas
- **Movable Annotations** - creators can reposition annotations after drawing
- **Color Picker** with vibrant preset palette (green default)
- **Adjustable Stroke Width** (1-20px, presets: 1, 3, 5, 8, 12)

### Review Workflow
- **Request Feedback** from organization members
- **Multi-Select Reviewers** with optional invitation message
- **Email Notifications** via SendGrid
- **Review Status Tracking** (pending → viewed → approved/changes_requested)
- **Approval/Rejection** with notes
- **Reviewer Dashboard** showing all pending reviews

### Resolution & Audit Trail
- **Comment Resolution** with resolution notes
- **Track Who Resolved** comments with timestamp
- **Hide Resolved Annotations** (hover to preview)
- **Reopen Resolved Comments** if needed
- **Edit History** tracked in JSONB with full audit trail
- **Soft Delete** for comments (never lose feedback history)
- **Original Text Preservation** for audit compliance

### Organization & Folders
- **Multi-Tenant Architecture** with complete data isolation
- **Clerk Organizations** for team management
- **Personal Folders** with up to 5 levels of nesting
- **Org-Shared Folders** for admin-created shared workspaces
- **Smart Unsorted Folder** for unorganized mockups
- **Folder Actions** (create, rename, delete, share)
- **Move Mockups** between folders with inline selector
- **Real-Time Counts** on folders
- **Search Within Folders** for scoped discovery

### Platform Integrations ⭐️ NEW in v4.1.0
- **Figma Plugin Integration** - Send Figma frames directly for approval
  - Direct frame upload from Figma plugin
  - **Import from Figma UI** - Browse and import frames directly from Library page ⭐️ NEW
  - **Figma Status Badge** - Display approval status in asset lists ⭐️ NEW
  - **Figma Metadata Display** - Show Figma file/node information in asset details ⭐️ NEW
  - **Integrations Tab** - Centralized integration management in Settings ⭐️ NEW
  - Real-time status sync (approved/pending/rejected)
  - Comment sync between Figma and Aiproval
  - Automatic version detection
  - Project mapping based on Figma file organization
- **Public Share Pages** - External reviewers without accounts
  - JWT-based secure share links
  - Progressive identity capture (view → comment → approve)
  - Password protection option
  - Link expiration controls (time or use-based)
  - Branded review experience
  - Full audit trail with captured identity
  - Analytics tracking for share link usage
- **Gmail Add-on Integration** - Send approval requests from Gmail
  - Send for approval directly from Gmail compose
  - Attachments upload as new mockups
  - Quick approve/reject buttons in email
  - Automatic feedback ingestion from replies
  - Thread tracking (link emails to assets)
- **Slack Integration** - Real-time notifications and quick actions
  - Real-time notifications for approval requests, stage progression, comments
  - Slash commands (`/aiproval status`, `/aiproval pending`, `/aiproval share`)
  - Interactive message buttons (Approve/Request Changes/View Details)
  - Daily/weekly digest summaries
  - Channel-based project mapping
- **Drive/Dropbox Import** - Import existing folder structures
  - Magic import wizard with preview
  - Mapping rules (folders → projects, files → assets)
  - Duplicate detection
  - Batch processing with progress tracking
  - Ongoing sync options (one-time, periodic, real-time)
- **Comparison/Presentation Mode** - Side-by-side comparison and presentation tools
  - Side-by-side view (2-4 mockups)
  - Overlay/onion skin version comparison
  - Timeline view (version history)
  - Grid view (all options)
  - Full-screen presentation mode
  - Keyboard navigation (arrow keys)
  - Presenter notes (private)
  - Live voting/polling
  - Export to PDF/PowerPoint


---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15.5.5 (App Router + Turbopack)
- **UI Library**: React 19.1.0
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Canvas**: Konva.js 10.0.2 + React-Konva 19.0.10
- **Icons**: Lucide React 0.546.0

### Backend & Services
- **Authentication**: Clerk 6.33.7 (multi-tenant organizations)
- **Database**: Supabase PostgreSQL 2.75.0
- **Storage**: Supabase Storage (3 buckets: logos, templates, mockups)
- **Realtime**: Supabase Realtime (for collaboration updates)
- **Email**: SendGrid 8.1.0 (review notifications)
- **External APIs**:
  - Brandfetch (logo search)
  - Figma API (plugin integration)
  - Gmail API (add-on integration)
  - Slack API (notifications and commands)
  - Google Drive API (import integration)
  - Dropbox API (import integration)

### Infrastructure
- **Build Tool**: Turbopack (Next.js 15)
- **Deployment**: Vercel-ready
- **Node Version**: 18+

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Clerk account (free tier works)
- Brandfetch API key
- SendGrid API key (optional, for email notifications)

### Installation

```bash
# Clone the repository
git clone https://github.com/jay-chalkstep/contentpackage.git
cd contentpackage

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Fill in your environment variables (see below)
# Then run database migrations (see Database Setup section)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## ⚙️ Environment Variables

Create `.env.local` in the project root with the following variables:

```bash
# Clerk Authentication (get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Supabase (get from https://supabase.com/dashboard)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... # For API routes

# Brandfetch API (get from https://brandfetch.com)
NEXT_PUBLIC_BRANDFETCH_API_KEY=your_brandfetch_key

# SendGrid (optional, for email notifications)
SENDGRID_API_KEY=SG.your_sendgrid_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Clerk Webhook (for user/client assignment automation)
CLERK_WEBHOOK_SECRET=whsec_... # Get from Clerk Dashboard > Webhooks

# Platform Integrations (optional)
# Figma Integration
FIGMA_CLIENT_ID=your_figma_client_id
FIGMA_CLIENT_SECRET=your_figma_client_secret
FIGMA_WEBHOOK_SECRET=your_figma_webhook_secret

# Gmail Integration
GMAIL_CLIENT_ID=your_gmail_client_id
GMAIL_CLIENT_SECRET=your_gmail_client_secret
GMAIL_WEBHOOK_SECRET=your_gmail_webhook_secret

# Slack Integration
SLACK_CLIENT_ID=your_slack_client_id
SLACK_CLIENT_SECRET=your_slack_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret

# Google Drive Integration
GOOGLE_DRIVE_CLIENT_ID=your_drive_client_id
GOOGLE_DRIVE_CLIENT_SECRET=your_drive_client_secret

# Dropbox Integration
DROPBOX_CLIENT_ID=your_dropbox_client_id
DROPBOX_CLIENT_SECRET=your_dropbox_client_secret

# Integration Encryption (required for OAuth token storage)
INTEGRATION_ENCRYPTION_KEY=your_32_byte_hex_key # Generate with: openssl rand -hex 32

# JWT Secret (required for public share links)
JWT_SECRET=your_jwt_secret # Generate with: openssl rand -hex 32

# DocuSign Integration (optional, currently disabled - see below)
# DOCUSIGN_INTEGRATION_KEY=your_integration_key
# DOCUSIGN_USER_ID=your_user_id
# DOCUSIGN_ACCOUNT_ID=your_account_id
# DOCUSIGN_RSA_PRIVATE_KEY=base64_encoded_private_key
# DOCUSIGN_API_BASE_URL=https://demo.docusign.net/restapi
```

---

## 📝 DocuSign Integration (Future)

DocuSign integration is currently **disabled** due to package compatibility issues with Next.js/Turbopack. The integration code is preserved and can be re-enabled in the future.

### To Re-enable DocuSign Integration:

1. **Install the package:**
   ```bash
   npm install docusign-esign
   ```

2. **Uncomment the imports** in the following files:
   - `lib/docusign/client.ts` - Uncomment line 9: `import { ApiClient, OAuth, Configuration } from 'docusign-esign';`
   - `lib/docusign/envelopes.ts` - Uncomment line 9: `import { EnvelopesApi, EnvelopeDefinition, Document, Signer, Tabs, Recipients, SignHereTab } from 'docusign-esign';`

3. **Uncomment the implementation code** in both files:
   - Replace all `throw new Error(...)` statements with the commented-out implementation code
   - Remove the `/* Uncomment when docusign-esign is available: */` comment blocks

4. **Configure environment variables** (see above):
   - `DOCUSIGN_INTEGRATION_KEY`
   - `DOCUSIGN_USER_ID`
   - `DOCUSIGN_ACCOUNT_ID`
   - `DOCUSIGN_RSA_PRIVATE_KEY` (Base64 encoded)
   - `DOCUSIGN_API_BASE_URL` (demo or production)

5. **Test the integration:**
   - The `send-for-signature` API endpoint will automatically use DocuSign when configured
   - Check `app/api/contracts/[id]/documents/[docId]/send-for-signature/route.ts` for usage

**Note:** The `docusign-esign` package has known compatibility issues with Next.js 15 and Turbopack. You may need to:
- Use dynamic imports for DocuSign code
- Configure Next.js to handle it as an external dependency
- Or wait for package updates that resolve the compatibility issues

---

## 🗄️ Database Setup

Run these migrations **in order** in your Supabase SQL Editor:

### Migration Order

1. **`supabase/01_initial_schema.sql`**
   - Creates base tables: brands, logo_variants, card_templates, card_mockups
   - Sets up Row-Level Security (RLS) policies
   - Creates initial indexes

2. **`supabase/02_brand_centric.sql`**
   - Migrates to brand-centric data model
   - Adds brand_colors and brand_fonts tables
   - Updates relationships and constraints

3. **`supabase/03_storage_setup.sql`**
   - Configures storage buckets (logos, card-templates, card-mockups)
   - Sets up storage RLS policies
   - Enables public access for read operations

4. **`supabase/04_folder_organization.sql`**
   - Creates folders table with hierarchy support
   - Adds folder_id to card_mockups
   - Adds created_by to mockups, templates, brands
   - Creates folder depth validation (max 5 levels)
   - ⚠️ Note: Attempted to create indexes on organization_id but column didn't exist (fixed in migration 12)

5. **`supabase/05_collaboration.sql`**
   - Creates mockup_comments table
   - Creates mockup_reviewers table
   - Sets up collaboration RLS policies
   - Enables Realtime for collaboration

6. **`supabase/06_comment_audit_trail.sql`**
   - Adds resolution tracking (resolved_by, resolved_at, resolution_note)
   - Adds soft delete fields (deleted_at, deleted_by)
   - Adds edit_history JSONB column
   - Adds original_comment_text for audit trail
   - Creates performance indexes

7. **`supabase/07_projects.sql`**
   - Creates projects table with status enum
   - Adds project_id to card_mockups
   - Creates project status tracking (active, completed, archived)
   - Sets up color customization and client metadata
   - Creates performance indexes for project queries

8. **`supabase/08_workflows.sql`**
   - Creates workflow_stage_color enum
   - Creates workflows table with JSONB stages
   - Creates project_stage_reviewers table
   - Adds workflow_id to projects
   - Sets up multi-stage approval workflow system
   - Creates unique constraints for stage reviewers

9. **`supabase/09_stage_progress.sql`** ⭐️ NEW in v3.0
   - Creates stage_status enum (pending, in_review, approved, changes_requested)
   - Creates mockup_stage_progress table
   - Auto-initialization trigger when mockup assigned to workflow project
   - Helper functions: advance_to_next_stage(), reset_to_first_stage()
   - Performance indexes for stage tracking
   - Email notification tracking

10. **`supabase/10_reviewer_dashboard.sql`**
   - Creates view for pending reviews dashboard
   - Adds reviewer performance indexes
   - Optimizes stage progress queries

11. **`supabase/12_fix_brands_multi_tenancy.sql`** ⭐️ CRITICAL FIX in v3.4.1
   - Adds missing organization_id column to 6 tables (brands, card_mockups, card_templates, logo_variants, brand_colors, brand_fonts)
   - Fixes failed indexes from migration 04 that referenced non-existent column
   - Drops global unique constraint on brands.domain
   - Adds composite unique constraint (domain, organization_id) for true multi-tenancy
   - Recreates all failed indexes with proper organization_id support
   - Enables true multi-tenant data isolation across all brand-related tables

12. **`supabase/13_terminology_cleanup.sql`** ⭐️ NEW in v3.5.0
   - Renames card_mockups → assets
   - Renames card_templates → templates
   - Renames mockup_id → asset_id in related tables (mockup_stage_progress)
   - Creates backward compatibility views with INSTEAD OF triggers
   - Updates indexes and constraints to match new names
   - Includes migration tracking table

13. **`supabase/14_fix_security_definer_views.sql`** ⭐️ NEW in v3.5.0
   - Recreates card_mockups and card_templates views with SECURITY INVOKER
   - Fixes security definer warnings that blocked service role access
   - Updates folder_mockup_counts view to use new assets table name

14. **`supabase/15_fix_migration_history_rls.sql`** ⭐️ NEW in v3.5.0
   - Enables RLS on migration_history table
   - Creates policies for service role full access
   - Allows authenticated users to read migration history

15. **`supabase/16_fix_function_search_paths.sql`** ⭐️ NEW in v3.5.0
   - Sets explicit search_path on all trigger functions
   - Fixes security warnings about implicit search paths
   - Secures functions against schema manipulation attacks

16. **`supabase/17_fix_stage_progress_trigger.sql`** ⭐️ CRITICAL FIX in v3.5.1
   - Updates initialize_mockup_stage_progress() to use asset_id instead of mockup_id
   - Updates advance_to_next_stage() to use asset_id
   - Updates reset_to_first_stage() to use asset_id
   - Fixes "column mockup_id does not exist" error when assigning mockups to workflow projects

17. **`supabase/18_user_level_approvals.sql`** ⭐️ MAJOR FEATURE in v3.6.0
   - Creates mockup_stage_user_approvals table for individual approval tracking
   - Adds approvals_required and approvals_received columns to mockup_stage_progress
   - Adds final approval columns to assets table (final_approved_by, final_approved_at, final_approval_notes)
   - Adds pending_final_approval status to stage_status enum
   - Creates 7 database functions for approval logic:
     - count_stage_reviewers() - Counts reviewers per stage
     - check_stage_approval_complete() - Verifies all approvals received
     - increment_stage_approval_count() - Increments approval counter
     - record_final_approval() - Records project owner final approval
     - Updated initialize_mockup_stage_progress() - Sets approval counts
     - Updated advance_to_next_stage() - Handles final approval state
     - Updated reset_to_first_stage() - Resets approval counts
   - Enables granular approval tracking with full audit trail
   - Requires ALL reviewers to approve before stage advances
   - Project owner final approval required after all stages complete

18. **`supabase/fix_approval_counts.sql`** ⭐️ UTILITY in v3.6.0
   - Fixes "0 of 0 approved" display for existing assets
   - Updates approvals_required counts for pre-migration assets
   - Diagnostic and verification queries included
   - Run after migration 18 to fix existing data

19. **`supabase/19_fix_templates_columns.sql`** ⭐️ NEW in v3.7.0
   - Fixes template column references
   - Updates template-related queries

20. **`supabase/20_remove_ai_features.sql`** ⭐️ NEW in v3.7.0
   - Removes AI features for simplification
   - Cleans up AI-related tables and functions

21. **`supabase/21_notifications.sql`** ⭐️ NEW in v3.8.0
   - Creates notifications table with notification_type enum
   - Supports approval requests, comments, stage progress, final approvals, and changes requested
   - Includes RLS policies for organization-scoped access
   - Creates helper function for unread notification count
   - Performance indexes for fast queries

22. **`supabase/22_user_preferences.sql`** ⭐️ NEW in v3.8.0
   - Creates user_preferences table for storing user settings
   - Notification preferences (email and in-app) with JSONB storage
   - Display preferences (theme, layout)
   - RLS policies for user-scoped access
   - One preference record per user per organization

23. **`supabase/23_contracts_module.sql`** ⭐️ NEW in v4.0.0
   - Complete contracts module schema
   - Clients, contracts, documents, email mockups, payment methods tables

24. **`supabase/24_contract_documents_storage.sql`** ⭐️ NEW in v4.0.0
   - Storage bucket setup for contract documents

25. **`supabase/25_client_ein_and_user_association.sql`** ⭐️ NEW in v4.0.0
   - Client EIN field and hierarchy support
   - User-client association system

26. **`supabase/26_asset_types.sql`** ⭐️ NEW in v4.0.0
   - Asset type enum for different asset categories

27. **`supabase/27_contract_notification_types.sql`** ⭐️ NEW in v4.0.0
   - Contract-related notification types

28. **`supabase/28_integrations_foundation.sql`** ⭐️ NEW in v4.1.0
   - Shared infrastructure for all platform integrations
   - Integration credentials storage (encrypted OAuth tokens)
   - Integration events tracking
   - Integration analytics

29. **`supabase/29_public_sharing.sql`** ⭐️ NEW in v4.1.0
   - Public share links for external reviewers
   - Public reviewers identity capture
   - Public share analytics

30. **`supabase/30_figma_integration.sql`** ⭐️ NEW in v4.1.0
   - Figma OAuth credentials storage
   - Figma sync events tracking
   - Figma metadata on assets

31. **`supabase/31_gmail_integration.sql`** ⭐️ NEW in v4.1.0
   - Gmail OAuth credentials storage
   - Gmail thread tracking
   - Gmail feedback events

32. **`supabase/32_slack_integration.sql`** ⭐️ NEW in v4.1.0
   - Slack workspace integration storage
   - Slack channel-project mapping
   - Slack notification events tracking

33. **`supabase/33_cloud_storage_import.sql`** ⭐️ NEW in v4.1.0
   - Cloud storage OAuth credentials (Drive/Dropbox)
   - Import job tracking
   - Import mapping rules

34. **`supabase/34_presentation_mode.sql`** ⭐️ NEW in v4.1.0
   - Presentation session management
   - Presentation participants tracking
   - Presentation voting/polling

### Storage Buckets

Create these buckets in Supabase Dashboard → Storage:

- **`logos`** (public) - Logo image files
- **`card-templates`** (public) - Template background images
- **`card-mockups`** (public) - Generated mockup exports

Then run the policies from `03_storage_setup.sql` to secure them.

---

## 🎨 Collaboration Features Deep Dive

Asset Studio's collaboration system is designed for **visual feedback directly on mockup designs**.

### How It Works

1. **Create Mockup** in the designer
2. **Request Feedback** by inviting organization members
3. **Reviewers Receive Email** with link to mockup
4. **Visual Annotations** drawn directly on the mockup canvas
5. **Comments Linked** to annotations with numbered badges (1, 2, 3...)
6. **Hover to Highlight** - hover comment to see annotation location
7. **Approve or Request Changes** with notes
8. **Resolve Comments** when feedback is addressed
9. **Track History** - full audit trail of all edits and resolutions

### Annotation Tools

- **Pin (📍)**: Click to place a marker
- **Arrow (➡️)**: Drag to draw directional arrow
- **Circle (⭕)**: Drag to draw circular highlight
- **Rectangle (▢)**: Drag to draw box around area
- **Freehand (✏️)**: Draw custom shapes freely
- **Text (📝)**: Click to add text label
- **Select (🖱️)**: Pan canvas when zoomed OR drag annotations to reposition

### Advanced Features

- **Movable Annotations**: Comment creators can reposition their annotations using select tool
- **Hide Resolved**: Resolved annotations auto-hide from canvas but reappear on hover
- **Color Coding**: 10 vibrant colors with green default for high visibility
- **Stroke Width Presets**: Quick access to 1px, 3px, 5px, 8px, 12px
- **Zoom Controls**: Integrated in toolbar (25%-400% with mouse wheel support)
- **Numbered Badges**: Annotations numbered 1, 2, 3... matching sidebar comments
- **Bi-Directional Hover**: Hover annotation → highlight comment OR hover comment → highlight annotation

### Resolution Workflow

1. Creator or reviewer marks comment as **Resolved**
2. Optional **resolution note** explains what was changed
3. **Annotation hides** from canvas (keeps it clean)
4. **Hover to preview** where the resolved feedback was
5. **Reopen if needed** - creator can unresolve comments
6. **Complete audit trail** tracks who resolved and when

---

## 📁 Project Structure

```
asset-studio/
├── app/                              # Next.js App Router
│   ├── (dashboard)/                  # Dashboard layout routes
│   │   ├── mockups/[id]/            # Mockup detail with collaboration
│   │   ├── mockup-library/          # Mockup grid with folders
│   │   ├── card-designer/           # Canvas mockup designer
│   │   ├── projects/                # Project management
│   │   │   ├── page.tsx            # Projects list
│   │   │   └── [id]/page.tsx       # Project detail with workflow board
│   │   ├── my-stage-reviews/        # ⭐️ NEW: Reviewer dashboard
│   │   ├── search/                  # Logo search (Brandfetch)
│   │   ├── library/                 # Saved logos library
│   │   ├── reviews/                 # My pending reviews
│   │   └── admin/                   # Admin settings
│   │       ├── workflows/           # Workflow template management
│   │       └── users/               # User management
│   ├── api/                          # API Routes
│   │   ├── comments/[id]/           # Comment CRUD + resolve/unresolve
│   │   ├── mockups/[id]/            # Mockup, comments, reviewers
│   │   │   └── stage-progress/     # ⭐️ NEW: Stage progress tracking
│   │   │       └── [stage_order]/  # ⭐️ NEW: Approve/request changes
│   │   ├── projects/                # Project CRUD
│   │   │   ├── [id]/               # Individual project operations
│   │   │   │   ├── mockups/        # Project mockups with progress
│   │   │   │   └── reviewers/      # Stage reviewer management
│   │   ├── reviews/                 # ⭐️ NEW: Review endpoints
│   │   │   └── my-stage-reviews/   # ⭐️ NEW: User's pending stage reviews
│   │   ├── workflows/               # Workflow CRUD (admin only)
│   │   │   └── [id]/               # Individual workflow operations
│   │   ├── folders/                 # Folder management
│   │   ├── org/members/             # Clerk organization members
│   │   ├── brandfetch/              # Brandfetch proxy
│   │   └── upload/                  # File upload handling
│   ├── sign-in/                     # Clerk auth pages
│   ├── sign-up/
│   └── page.tsx                     # Landing page
│
├── components/                       # React Components
│   ├── collaboration/               # Annotation & review components
│   │   ├── MockupCanvas.tsx        # Konva canvas with annotations
│   │   ├── AnnotationToolbar.tsx   # Drawing tools + zoom controls
│   │   ├── CommentsSidebar.tsx     # Comments & reviewers panel
│   │   ├── RequestFeedbackModal.tsx # Reviewer invitation
│   │   └── ResolveCommentModal.tsx  # Resolution note modal
│   ├── approvals/                   # ⭐️ NEW: Approval workflow components
│   │   ├── ApprovalStatusBanner.tsx # Current stage approval progress
│   │   ├── ApprovalTimelinePanel.tsx # Complete approval history
│   │   └── FinalApprovalBanner.tsx  # Project owner final approval
│   ├── projects/                    # Project management components
│   │   ├── ProjectCard.tsx         # Project card display
│   │   ├── ProjectSelector.tsx     # Project assignment dropdown
│   │   ├── NewProjectModal.tsx     # Project creation dialog
│   │   ├── WorkflowBoard.tsx       # ⭐️ NEW: Kanban workflow board
│   │   ├── StageStatusPill.tsx     # ⭐️ NEW: Stage status indicators
│   │   └── StageActionModal.tsx    # ⭐️ NEW: Approve/request changes
│   ├── workflows/                   # Workflow components
│   │   ├── StageBuilder.tsx        # Interactive stage editor
│   │   └── WorkflowModal.tsx       # Workflow creation/editing dialog
│   ├── folders/                     # Folder organization components
│   ├── DashboardLayout.tsx          # Main layout wrapper
│   ├── SidebarSimple.tsx            # Collapsible navigation sidebar
│   └── Toast.tsx                    # Notification system
│
├── lib/                              # Utilities & Config
│   ├── supabase/                    # Supabase clients
│   │   ├── client.ts               # Browser client
│   │   └── server.ts               # Server client (service role)
│   ├── email/                       # Email integration
│   │   ├── sendgrid.ts             # SendGrid config
│   │   ├── collaboration.ts         # Collaboration email templates
│   │   ├── stage-notifications.ts   # Stage workflow emails
│   │   └── approval-notifications.ts # ⭐️ NEW: User-level approval emails
│   └── hooks/                       # Custom React hooks
│
├── supabase/                         # Database Migrations
│   ├── 01_initial_schema.sql
│   ├── 02_brand_centric.sql
│   ├── 03_storage_setup.sql
│   ├── 04_folder_organization.sql
│   ├── 05_collaboration.sql
│   ├── 06_comment_audit_trail.sql
│   ├── 07_projects.sql
│   ├── 08_workflows.sql
│   ├── 09_stage_progress.sql        # Active approval workflow
│   ├── 10_reviewer_dashboard.sql
│   ├── 12_fix_brands_multi_tenancy.sql
│   ├── 13_terminology_cleanup.sql
│   ├── 14_fix_security_definer_views.sql
│   ├── 15_fix_migration_history_rls.sql
│   ├── 16_fix_function_search_paths.sql
│   ├── 17_fix_stage_progress_trigger.sql
│   ├── 18_user_level_approvals.sql  # ⭐️ NEW: User-level approval tracking
│   └── fix_approval_counts.sql      # ⭐️ NEW: Utility to fix existing assets
│
├── documentation/                    # Project Documentation
│   ├── CHANGELOG.md                 # Version history
│   ├── APPROVAL_SYSTEM.md           # ⭐️ NEW: Approval system documentation
│   ├── COLLABORATION_SPEC.md        # Collaboration design spec
│   └── COLLABORATION_IMPLEMENTATION.md # Implementation notes
│
└── public/                          # Static Assets
```

---

## 🤖 For AI Coding Assistants

**Context for AI Partners**: This project was built collaboratively with Claude Code and is designed to be AI-assistant-friendly.

### Key Architectural Decisions

1. **Clerk Auth over Supabase Auth**
   - Better multi-tenant organization support
   - Simpler role management (admin vs member)
   - RLS policies rely on Clerk user IDs passed via API routes

2. **API Routes for Data Access**
   - Direct Supabase client queries blocked by RLS (Clerk JWT format mismatch)
   - All data access routed through Next.js API routes
   - API routes use `supabaseServer` with service role key to bypass RLS

3. **Gmail-style Three-Panel Layout**
   - Consistent GmailLayout component across all pages
   - Collapsible context panels for better space utilization
   - NavRail navigation always present for easy access

4. **Konva.js for Canvas**
   - Needed precise control over annotation positioning
   - Export functionality requires access to stage as image data
   - React-Konva provides React component interface

5. **JSONB for Annotation Data**
   - Konva shape JSON stored directly in database
   - Flexible schema for different annotation types
   - Position stored separately as percentage coordinates

### Common Gotchas

- **Next.js 15 Async Params**: All route params must be awaited (`const { id } = await context.params`)
- **RLS Policies**: Never query Supabase directly from client - always use API routes
- **Realtime Subscriptions**: RLS blocks them with Clerk auth - use polling or API webhooks instead
- **Image Exports**: Must temporarily reset zoom/pan before exporting Konva stage

### Where to Find Specs

- **Collaboration System**: `documentation/COLLABORATION_SPEC.md` (original design)
- **Implementation Details**: `documentation/COLLABORATION_IMPLEMENTATION.md`
- **Version History**: `documentation/CHANGELOG.md` (all features by version)

---

## 💻 Development

### Running Locally

```bash
npm run dev        # Start dev server with Turbopack
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

### Making Changes

1. **Database Changes**: Create new migration in `supabase/` folder
2. **New Features**: Update CHANGELOG.md with details
3. **Version Bump**: Follow semantic versioning in `package.json`
4. **Commit Messages**: Use conventional commits format

### Testing Collaboration Features

1. Create a test organization in Clerk
2. Invite multiple test users
3. Create a mockup and request feedback
4. Test annotation tools, comments, and resolution workflow
5. Verify email notifications (if SendGrid configured)

---

## 🚀 Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jay-chalkstep/contentpackage)

#### Step 1: Connect Repository
1. Click the deploy button above
2. Connect your GitHub repository to Vercel
3. Select the branch to deploy (main or feature branch)

#### Step 2: Configure Environment Variables

**⚠️ IMPORTANT for Vercel**: Environment variables must be configured for the correct environment scope:

1. Go to **Settings → Environment Variables** in your Vercel project
2. Add each variable and **enable for the appropriate environments**:
   - ✅ **Production** - For main/master branch deployments
   - ✅ **Preview** - For feature branch deployments (REQUIRED if using branches!)
   - ✅ **Development** - For local development with Vercel CLI

**Required Variables**:
```
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Database
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# APIs
NEXT_PUBLIC_BRANDFETCH_API_KEY

# Email (optional)
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
```

#### Step 3: Deploy
- Vercel will automatically build and deploy your application
- Build typically takes 2-3 minutes
- Check build logs for any errors

### Troubleshooting Vercel Deployments

#### Common Issues and Solutions

**1. "supabaseUrl is required" Build Error**
- **Cause**: Environment variables not available during build
- **Solution**: Already fixed in v3.2.1 with lazy initialization

**2. Runtime Error: "NEXT_PUBLIC_SUPABASE_URL is not set"**
- **Cause**: Environment variables not configured in Vercel
- **Solution**: Add all variables in Vercel dashboard and enable for correct environment

**3. Feature Branch Not Working**
- **Cause**: Environment variables only set for "Production" environment
- **Solution**: Edit each variable and enable "Preview" environment

### Post-Deployment Checklist

#### Database Setup
- [ ] Run all 17 database migrations in Supabase (in order!)
- [ ] Run fix_approval_counts.sql if you have existing assets
- [ ] Create 3 storage buckets (logos, card-templates, card-mockups)
- [ ] Set up storage policies

#### Core Features Testing
- [ ] Test sign-in/sign-up flow
- [ ] Create test organization
- [ ] Upload logo and template
- [ ] Create mockup in designer

#### Workflow Testing
- [ ] Create workflow template with 3+ stages
- [ ] Create test project and assign workflow
- [ ] Assign stage reviewers to project
- [ ] Test mockup workflow progression
- [ ] Verify email notifications work

#### Collaboration Testing
- [ ] Add visual annotations
- [ ] Post comments
- [ ] Test comment resolution
- [ ] Verify real-time updates

---

## 📚 Version History

See [CHANGELOG.md](./documentation/CHANGELOG.md) for detailed version history.

### Recent Versions

- **v4.1.0** (2025-01-XX) - 🎉 **MAJOR FEATURE** - Platform Integrations - Figma plugin, public share pages, Gmail add-on, Slack integration, Drive/Dropbox import, presentation mode
- **v4.0.0** (2025-01-XX) - 🎉 **MAJOR RELEASE** - Contracts Module - Complete contract lifecycle management with document versioning, email mockups, payment methods
- **v3.8.0** (2025-01-XX) - 🎉 **MAJOR FEATURE** - Notifications System & Settings Modal - In-app notifications with dropdown panel, comprehensive settings modal with preferences/account/org management, consolidated navigation
- **v3.7.2** (2025-01-XX) - 🐛 **Critical Bugfixes** - Fixed annotation visibility issues by correcting coordinate transformation, and improved permission enforcement for annotations and comments
- **v3.7.1** (2025-01-XX) - 🐛 **Critical Bugfixes** - Fixed project loading and metrics display issues by using correct Supabase client in API routes and proper response format handling
- **v3.7.0** (2025-11-09) - 🧹 **Code Quality** - Removed AI features for simplification and stability, updated documentation, component extraction and organization improvements
- **v3.6.0** (2025-10-28) - 🎉 **MAJOR FEATURE** - User-Level Approval Tracking & Final Approval System - Individual reviewer tracking, all-must-approve logic, project owner final approval, approval timeline, quick approve, 4 new email templates, comprehensive documentation
- **v3.5.1** (2025-10-28) - 🐛 **Critical Bugfixes** - Column name mismatches after migration 13, stage progress trigger fixes, templates API fix, server-side mockup save
- **v3.5.0** (2025-10-28) - 🚀 **Database Modernization** - Terminology cleanup, table renaming, backward compatibility views, security fixes
- **v3.4.1** (2025-10-28) - 🐛 **CRITICAL FIX** - Multi-tenancy bug affecting 6 tables, added missing organization_id columns, fixed unique constraint, recreated failed indexes
- **v3.4.0** (2025-10-27) - 🎨 **Project List UX** - Client-centric display, cleaner layout, improved column alignment, "Add Assets" button
- **v3.3.0** (2025-10-26) - 🎨 **UI/UX Excellence** - Gmail-style layout, brand-centric terminology, improved navigation and context panels
- **v3.2.1** (2025-10-25) - 🐛 **Critical Fixes** - Fixed Vercel deployment issues, lazy initialization for Supabase clients, AIProvider context initialization
- **v3.2.0** (2025-10-25) - 🤖 **AI Features Release** - Phase 1 AI integration with visual tagging, accessibility analysis, semantic search
- **v3.1.x** (2025-01-25) - Various UX improvements and workflow board optimizations
- **v3.0.0** (2025-01-25) - 🎉 **MAJOR RELEASE** - Active approval workflow system (Phase 3)
- **v2.4.0** (2025-01-25) - Workflow templates system (Phase 2), mockup-project assignment, bug fixes
- **v2.3.0** (2025-01-24) - Projects feature (Phase 1), client organization system

---

## 📋 To-Do / Future Features

### Admin-Controlled Project/Client Visibility
**Status**: Planned for next session

**Feature Description**:
Add admin-level ability to assign client/project visibility, allowing granular control over which clients can see which projects.

**Requirements**:
- Client-role users should see projects associated with their assigned client
- If assigned to a child client, they should only see that child client's projects (not parent)
- Admins should be able to assign multiple clients to a project (many-to-many relationship)
- Visibility assignments should supplement or override the default `client_id` relationship

**Implementation Considerations**:
- Create `project_client_visibility` junction table (project_id, client_id)
- Add admin UI for assigning clients to projects (project detail page or client detail page)
- Update project filtering logic to check both `client_id` and visibility assignments
- Consider whether child clients should inherit visibility from parent clients
- Determine if visibility assignments override or supplement the default `client_id` relationship

**Questions to Resolve**:
1. Should visibility assignments override or supplement the default `client_id`?
2. Should child clients inherit visibility from parent clients?
3. Where should this be managed in the UI? (Project detail page, client detail page, or both?)

---

## 🔗 Links & Resources

- **Repository**: [https://github.com/jay-chalkstep/contentpackage](https://github.com/jay-chalkstep/contentpackage)
- **Issue Tracker**: [GitHub Issues](https://github.com/jay-chalkstep/contentpackage/issues)
- **Documentation**: [./documentation](./documentation)
- **Changelog**: [CHANGELOG.md](./documentation/CHANGELOG.md)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) by Vercel
- [Clerk](https://clerk.com/) for authentication
- [Supabase](https://supabase.com/) for database & storage
- [Konva.js](https://konvajs.org/) for canvas rendering
- [Brandfetch](https://brandfetch.com/) for logo data
- [SendGrid](https://sendgrid.com/) for email delivery
- [Claude Code](https://claude.com/claude-code) as AI development partner

---

**Aiproval** - Professional brand asset management and collaborative mockup review platform
