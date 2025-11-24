# Changelog

All notable changes to CardMock will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.5.1] - 2025-10-28

### 🎨 UI/UX Refinements - Streamlined Template Management

This patch release optimizes the admin templates interface by consolidating panels and removing redundant UI elements for a cleaner, more focused user experience.

### ✨ Added

#### Combined Template Details Panel
- **New TemplateDetailsPanel Component**: Unified panel combining preview and properties
  - **Top Section**: Large template image preview with shadow and file info
  - **Details Section**: Template metadata (name, file type, size, upload date, ID)
  - **Actions Section**: Download and Delete buttons at bottom
  - **Width**: 400px (increased from 320px for better preview display)
  - **Single Scroll Context**: Seamless flow from preview to details to actions

### 🔄 Changed

#### Admin Templates Layout Optimization
- **Reduced Panel Count**: Streamlined from 5 panels to 4 panels total
  - **Before**: Nav Rail | Context | Grid | Preview | Properties (5 panels)
  - **After**: Nav Rail | Context | Grid | Combined Details (4 panels)
- **Improved Information Hierarchy**: Preview, details, and actions in logical vertical flow
- **Better Space Utilization**: Single 400px panel instead of two separate panels

#### Mockup Library Cleanup
- **Removed "Upload Template" Button**: Eliminated redundant template upload button
  - Template uploads now exclusively through Admin > Templates
  - Maintains "Upload Brand" button for mockup creation workflow
  - Cleaner context panel with focused functionality
- **Code Cleanup**: Removed unused `CreditCard` icon import

### 🐛 Fixed

- **Navigation Consistency**: Removed duplicate template upload access point
- **Admin Tool Organization**: All template management now centralized in admin section
- **User Confusion**: Eliminated conflicting upload buttons across different pages

### 📦 Bundle Size

- **Admin Templates**: `17.9 kB` (optimized from 18.1 kB)
- **Mockup Library**: `17.7 kB` (optimized from 17.8 kB)
- **Total Improvement**: ~300 B reduction across affected pages

### 🏗️ Architecture

#### New Component
- `/components/templates/TemplateDetailsPanel.tsx` - Unified preview + properties panel (~200 lines)

#### Updated Components
- `/app/(dashboard)/admin/templates/page.tsx` - Uses combined panel
- `/app/(dashboard)/mockup-library/page.tsx` - Removed template upload button

#### Removed Redundancy
- Eliminated separate preview and properties panel definitions
- Consolidated template management UI patterns

### 🎯 Benefits

- **Simplified Layout**: Fewer panels mean less visual complexity
- **Better UX Flow**: Natural top-to-bottom reading pattern (preview → details → actions)
- **Consistent Admin Experience**: All template operations in dedicated admin section
- **Reduced Cognitive Load**: One decision point for template uploads instead of two
- **Easier Maintenance**: Single component instead of coordinating two separate panels

---

## [3.5.0] - 2025-10-28

### 🎨 Template Management Overhaul - Admin-Only Four-Panel Layout

This release completely migrates template management to a dedicated admin-only section with a modern four-panel layout, providing a superior UX for managing card templates.

### ✨ Added

#### Admin Templates Section
- **New Admin Templates Page**: `/admin/templates` with comprehensive four-panel layout
  - **Context Panel (200px)**: Search bar, upload button, sort options (date/name), template statistics
  - **Grid Panel (flexible)**: Responsive 2-column grid of template cards with thumbnails
  - **Preview Panel (flexible)**: Large full-size template preview
  - **Properties Panel (320px)**: Template details, actions, and metadata
- **Admin-Only Access**: Only users with `org:admin` role can access template management
- **Template Navigation**: Added "Templates" to admin nav rail with LayoutTemplate icon
- **Four-Panel Layout Component**: New reusable `FourPanelLayout.tsx` component
  - Supports 4 content areas: context, grid, preview, properties
  - Configurable panel widths (fixed or flexible)
  - Collapsible panels for responsive design

#### Template Components
- **TemplateCard**: Grid card component with:
  - Template thumbnail with hover effects
  - File type, size, and upload date display
  - Selection state with blue border and checkmark
  - Click to select and preview
- **TemplatePreview**: Large preview panel with:
  - Full-size template image display
  - File format and size info
  - Clean centered layout
- **TemplateProperties**: Properties panel with:
  - Inline name editing (click edit icon)
  - Template ID, file type, size, upload date
  - Download button (blue)
  - Delete button (red) with confirmation
- **TemplateUploadModal**: Modal overlay for uploading with:
  - Drag-and-drop interface
  - File validation (PNG, JPG, SVG, WebP, GIF up to 10MB)
  - Live preview before upload
  - Template guidelines display
  - Success/error handling

#### Enhanced Features
- **Search & Filter**: Real-time search by template name
- **Sorting Options**: Sort by upload date (newest first) or template name (A-Z)
- **Template Statistics**: Live count of total templates and filtered results
- **Selection Management**: Click to select, preview in large panel, edit in properties panel
- **Toast Notifications**: Success/error feedback for all operations
- **Empty States**: Helpful messages when no templates exist or search returns no results

### 🔄 Changed

#### Page Redirects
- **`/card-upload` Redirect**: Now redirects to `/admin/templates`
  - Shows loading spinner with "Redirecting to Templates" message
  - Maintains backward compatibility for bookmarks/links
- **`/card-library` Redirect**: Now redirects to `/admin/templates`
  - Ensures consistent access point for template management
  - Non-admins are redirected to mockup library

#### Navigation Changes
- Removed templates from main navigation (was accessible at `/card-library`)
- Consolidated all template functionality under Admin section
- Improved information architecture for admin tools

### 🏗️ Architecture

#### New Components
- `/components/layout/FourPanelLayout.tsx` - Four-panel layout system
- `/components/templates/TemplateCard.tsx` - Grid card component
- `/components/templates/TemplatePreview.tsx` - Preview panel
- `/components/templates/TemplateProperties.tsx` - Properties panel with actions
- `/components/templates/TemplateUploadModal.tsx` - Upload modal

#### Updated Pages
- `/app/(dashboard)/admin/templates/page.tsx` - New admin templates page (18.1 kB)
- `/app/(dashboard)/card-upload/page.tsx` - Redirect page (606 B)
- `/app/(dashboard)/card-library/page.tsx` - Redirect page (607 B)
- `/components/navigation/NavRail.tsx` - Added Templates nav item

### 🎯 Benefits

- **Better Organization**: Templates now properly grouped with other admin tools
- **Improved UX**: Four-panel layout provides more context and better workflow
- **Access Control**: Admin-only access prevents unauthorized template modifications
- **Modern Interface**: Clean, responsive design with proper spacing and hierarchy
- **Enhanced Functionality**: Inline editing, better search/sort, comprehensive actions
- **Code Quality**: Reusable components, proper state management, TypeScript types

### 📦 Bundle Size

- Admin templates page: **18.1 kB** (254 kB First Load JS)
- Four-panel layout component: Shared across multiple admin pages
- Redirect pages optimized to **~600 B** each

---

## [3.4.0] - 2025-01-27

### 🎯 Admin Reporting & Workflow Enhancements

This release adds comprehensive admin reporting capabilities and visual workflow improvements for better project oversight and team collaboration.

### ✨ Added

#### Admin Reporting System
- **Project Reports Dashboard**: New admin-only reports page at `/admin/reports`
  - Group projects by owner/creator for team oversight
  - Real-time summary statistics (total projects, assets, active users)
  - Status filtering (All, Active, Completed, Archived)
  - Project metrics: days since creation, asset count, workflow progress, reviewer count
- **CSV Export**: One-click export to spreadsheet format
  - Includes all project data, user info, and metrics
  - Properly formatted with headers and quoted fields
- **Excel Export**: Professional formatted Excel files
  - Multi-row title header with styling
  - Summary statistics section
  - Color-coded headers and alternating row colors
  - Column auto-sizing for readability
  - Uses ExcelJS library (v4.4.0)
- **Admin Navigation**: Added "Reports" to admin nav rail with BarChart3 icon
- **API Endpoint**: `/api/admin/reports/projects` with org:admin role check

#### Workflow Improvements
- **Stage Reviewer Avatars**: Visual indication of assigned reviewers in workflow board
  - Display first 4 reviewer avatars in stage column headers
  - Overlapping avatar stack with profile photos from Clerk
  - Hover tooltips showing reviewer names
  - "+N" badge for additional reviewers
  - Click to expand popover with full reviewer list
  - Fallback to initials for users without profile photos
- **Medium Header Height**: Increased stage header height (py-4) for better visibility

#### UI & UX Enhancements
- **Gmail Layout for Mockup Detail**: Converted mockup editor to four-column layout
  - Fixed missing nav rail issue
  - Context panel: Mockup info and annotation tools
  - List view (center): Canvas with flexible width
  - Preview panel: Comments and AI tabs with fixed width
  - Action buttons moved to bottom of context panel
- **Project List Improvements**:
  - Removed date badge ("1 day ago") for cleaner look
  - Changed "mockups" terminology to "Assets" throughout
  - Removed duplicate project name from second line
  - Added column headers (Project, Status, Actions) for clarity
- **Flexible Panel Widths**: Added width control props to GmailLayout component
  - `listViewWidth` prop: 'fixed' or 'flex'
  - `previewWidth` prop: 'fixed' or 'flex'
  - Allows different pages to optimize for their content

### 🔧 Changed

- **ExcelJS Dependency**: Added v4.4.0 for professional Excel export functionality
- **Documentation Cleanup**: Removed references to "Filestage" competitor name

### 🐛 Fixed

- **Admin Role Check**: Fixed Clerk API integration in reports endpoint
  - Changed from non-existent `getOrganizationMembership()` to `getOrganizationMembershipList()`
  - Proper membership lookup by userId
- **Duplicate Client Declaration**: Removed duplicate `clerkClient()` call in reports API
- **Avatar Field Name**: Fixed `user_avatar` to `user_image_url` for Clerk profile photos

### 📊 Database

No schema changes in this release. All features use existing tables with proper API route access patterns.

---

## [3.2.0] - 2025-10-25

### 🤖 AI-Powered Features (Phase 1)

This release introduces comprehensive AI capabilities to CardMock, enabling automated visual analysis, semantic search, accessibility checking, and intelligent organization suggestions.

### ✨ Added

#### AI Analysis & Tagging
- **Automated Visual Tagging**: AI automatically extracts and categorizes visual elements from mockups
  - Visual tags (style, composition, layout)
  - Color tags (color schemes, tones)
  - Composition tags (balance, symmetry, hierarchy)
  - Brand detection (logos, brand elements)
  - Object recognition (specific elements in designs)
- **Text Recognition (OCR)**: Automatic text extraction from mockup images using Google Vision API
- **Color Palette Extraction**: AI identifies dominant, accent, and complete color palettes with hex values
- **Confidence Scoring**: All AI predictions include confidence levels (0-1 scale)
- **Analyze with AI Button**: One-click AI analysis from mockup detail page

#### Accessibility Analysis
- **WCAG Compliance Checking**: Automated accessibility analysis with WCAG level detection (A, AA, AAA)
- **Contrast Ratio Analysis**: Calculate color contrast ratios for text readability
- **Readability Scoring**: Score mockup readability on 0-100 scale
- **Issue Detection**: Identify accessibility issues by severity (error, warning, info)
- **Fix Suggestions**: AI provides actionable recommendations for improving accessibility
- **AccessibilityScore Component**: Expandable/compact display with detailed issue breakdown

#### Semantic Search
- **Natural Language Search**: Find mockups using plain English queries
  - "blue backgrounds with minimal text"
  - "high contrast designs"
  - "mockups with logos"
- **Vector Embeddings**: OpenAI text-embedding-3-small generates 1536-dimension embeddings
- **Hybrid Search**: Combines vector similarity with full-text search for best results
- **Visual Similarity Search**: Find mockups with similar visual characteristics
- **AISearchBar Component**: Search mode toggle (AI/Exact/Visual) with keyboard shortcut (Cmd+K)
- **AISearchResults Component**: Display results with relevance scores and match explanations
- **Recent Searches**: Automatic tracking of search history
- **Example Queries**: Suggested search queries to help users get started

#### Intelligent Organization
- **Folder Suggestions**: AI recommends best folders for organizing mockups based on content
- **Confidence Bars**: Visual indicators showing AI confidence in suggestions
- **Reasoning Display**: Explanations for why folders were suggested
- **Feedback Loop**: Thumbs up/down to improve AI suggestions over time
- **FolderSuggestions Component**: Interactive folder recommendations with one-click organization

#### UI Components
- **10 New AI Components**:
  1. `TagDisplay` - Collapsible sections for AI-extracted tags and metadata
  2. `AccessibilityScore` - WCAG compliance display with issues and suggestions
  3. `AISearchBar` - Natural language search with mode switching
  4. `AISearchResults` - Search results with relevance scoring
  5. `FolderSuggestions` - AI-powered folder recommendations
  6. `SimilarMockupsModal` - Side panel for discovering similar mockups
  7. `AIBadgeOverlay` - Compact AI indicators for grid views
  8. `CanvasAIAssistant` - Real-time AI assistance during mockup editing
  9. `AIActivityFeed` - Real-time feed of AI processing activities
  10. `AIOnboardingTour` - Interactive spotlight tour for AI features

- **5 New UI Primitives**:
  - `Badge` - Reusable badge component with AI gradient variant
  - `ConfidenceBar` - Animated progress bars for confidence scores
  - `AIIndicator` - Sparkle badges showing AI processing status
  - `ColorSwatch` - Clickable color display with copy-to-clipboard
  - `LoadingSkeleton` - Shimmer animations for loading states

#### State Management
- **AIContext**: Global AI state with localStorage persistence
  - Search mode (AI/Exact/Visual)
  - Recent searches history
  - Onboarding completion status
  - Processing queue tracking

#### Database & Infrastructure
- **pgvector Extension**: Vector similarity search support
- **New Columns on card_mockups**:
  - `ai_metadata` (JSONB) - Complete AI analysis results
  - `ai_tags` (text[]) - Quick tag filtering array
  - `search_vector` (tsvector) - Full-text search index
  - `embedding` (vector[1536]) - Semantic search embeddings
  - `last_analyzed_at` (timestamp) - Track analysis freshness
- **IVFFlat Index**: Fast vector similarity search with cosine distance
- **RPC Functions**:
  - `search_mockups_hybrid()` - Combined vector + text search
  - `find_similar_mockups()` - Visual similarity queries
- **Migration 11**: Complete AI features schema (`supabase/11_ai_features.sql`)

#### API Routes
- **POST /api/ai/analyze**: Analyze mockup with Google Vision + OpenAI
- **POST /api/ai/search**: Semantic search with hybrid scoring
- **POST /api/ai/similar**: Find visually similar mockups
- **POST /api/ai/suggest-folder**: AI-powered folder recommendations
- **PATCH /api/ai/suggest-folder**: Submit feedback on suggestions

#### Integration
- **Mockup Detail Page**: New "AI Insights" tab alongside comments
  - Tabbed interface for Comments vs AI Insights
  - Integrated TagDisplay, AccessibilityScore components
  - "Find Similar Mockups" button
  - AI onboarding tour integration
- **Enhanced Search**: AI search mode available across all search interfaces
- **Smart Organization**: Folder suggestions during mockup creation and editing

### 🛠️ Technical Improvements
- **OpenAI Integration**: text-embedding-3-small for embeddings
- **Google Vision API**: Image analysis and OCR
- **Type Safety**: Comprehensive TypeScript interfaces in `/types/ai.ts`
- **Performance**: Debounced AI requests, optimistic UI updates
- **Error Handling**: Graceful fallbacks for AI service failures

### 📦 Dependencies Added
- `openai` - OpenAI API client
- `axios` - HTTP client for external API calls
- `lodash` - Utility functions for data processing
- `p-limit` - Concurrency control for batch operations
- `@types/lodash` (dev) - TypeScript definitions

### 🎨 UI/UX Enhancements
- Purple/blue gradients for AI-related features
- Sparkle icons (✨) to indicate AI functionality
- Confidence bars with color-coded scoring (red→yellow→green)
- Interactive onboarding tour with spotlight highlights
- Toast notifications for AI operations
- Loading skeletons with AI indicators

### 📝 Documentation
- Updated README with AI features overview
- Added AI prerequisites (OpenAI, Google Vision API)
- Added environment variable documentation
- Updated tech stack documentation
- Added migration 11 to setup guide

### 🔒 Security
- API keys secured in environment variables
- Service role key used for backend AI operations
- Organization-scoped AI data access
- RLS policies enforced on all AI metadata

---

## [3.1.8] - 2025-10-25

### 🎨 UX Improvements

- **Stage Reviewers Default State**: Stage reviewers section now defaults to collapsed state for cleaner project detail pages

---

## [2.4.0] - 2025-01-25

### 🔄 Workflow Templates System (Phase 2)

This release completes the Projects feature with **Workflow Templates** - reusable multi-stage approval sequences that can be assigned to projects. This enables teams to standardize their review and approval workflows across client engagements.

### ✨ Added

#### Workflow Template Management
- **Admin Workflow Builder**: Create reusable workflow templates with multiple stages
- **Multi-Stage Support**: Define 1-10 approval stages per workflow
- **Color-Coded Stages**: 7 color options for visual organization
  - Yellow (Design/Draft), Green (Approved), Blue (Review)
  - Purple (Client Review), Orange (Changes), Red (Rejected), Gray (On Hold)
- **Default Workflows**: Mark workflows as default for auto-assignment to new projects
- **Archive Workflows**: Archive old workflows while preserving historical data
- **Stage-Based Reviewers**: Assign specific reviewers to each workflow stage
- **Workflow Preview**: Visual stage flow display in project creation

#### Workflow Administration
- **Admin Workflows Page** (`/admin/workflows`)
  - Grid layout showing all workflow templates
  - Create, edit, archive, and delete workflows
  - Search workflows by name
  - Filter by archived/active status
  - Stage count and project usage badges
- **StageBuilder Component**: Interactive stage editor with drag-to-reorder
- **WorkflowModal**: Full-featured workflow creation/editing dialog
- **Workflow Assignment**: Select workflow when creating projects
- **Project Integration**: Workflows displayed on project cards and detail pages

#### Mockup-to-Project Assignment
- **ProjectSelector Component**: Dropdown for assigning mockups to projects
- **Mockup Library Integration**: "Assign to Project" button in mockup library
- **Unassign Support**: Option to remove mockup from project
- **Active Projects Only**: Selector shows only active (non-archived) projects
- **Visual Project Indicators**: Color bars and client names in selector

#### Database Schema
- **New Table**: `workflows` with JSONB stages array
- **New Table**: `project_stage_reviewers` for stage-based reviewer assignments
- **Enum Type**: `workflow_stage_color` with 7 color options
- **Foreign Key**: `projects.workflow_id` references workflows table
- **Unique Constraint**: Prevents duplicate reviewers per stage
- **Cascade Behavior**: Deleting workflow clears project assignments
- **Reviewer Cleanup**: Changing project workflow clears existing stage reviewers

#### API Routes
- `GET /api/workflows` - List workflows with filters (include_archived)
- `POST /api/workflows` - Create workflow (admin only)
- `GET /api/workflows/[id]` - Get single workflow
- `PATCH /api/workflows/[id]` - Update workflow (admin only)
- `DELETE /api/workflows/[id]` - Delete workflow (admin only)
- `GET /api/projects/[id]/reviewers` - List stage reviewers for project
- `POST /api/projects/[id]/reviewers` - Add reviewer to stage
- `DELETE /api/projects/[id]/reviewers` - Remove reviewer from stage
- `PATCH /api/mockups/[id]` - Updated to support project assignment

#### UI Components
- **StageBuilder.tsx**: Visual stage editor with color picker and ordering
- **WorkflowModal.tsx**: Workflow creation/editing with stage builder
- **ProjectSelector.tsx**: Reusable project assignment dropdown
- **Updated NewProjectModal**: Workflow selection with default pre-fill
- **Updated ProjectCard**: Workflow badge showing stage count
- **Updated SidebarSimple**: Added Workflows admin navigation link

### 🔧 Changed

- **Project Creation**: Now includes optional workflow assignment
- **Project Update API**: Changing workflow clears existing stage reviewers
- **Projects List API**: Now includes `mockup_previews` for thumbnail display
- **Admin Navigation**: Added "Workflows" link with Workflow icon
- **TypeScript Types**: Added `Workflow`, `WorkflowStage`, `WorkflowStageColor`, `ProjectStageReviewer`

### 🐛 Fixed

- **Project Mockups API**: Corrected Supabase foreign key join syntax
  - Fixed: `logo:logo_variants!logo_id` (was `logo:logo_id`)
  - Fixed: `template:card_templates!template_id` (was `template:template_id`)
  - Resolved 500 errors when fetching project mockups
- **Missing Mockup Thumbnails**: Projects list now fetches mockup previews
  - Fixed "No mockups yet" showing even when mockups assigned
  - Project cards now display up to 4 thumbnail previews correctly
- **Mockup Assignment UI**: Added missing interface for assigning mockups to projects

### 📝 Technical Details

**New Files**:
- `supabase/08_workflows.sql` - Database migration for workflow system
- `app/api/workflows/route.ts` - Workflows list and create API
- `app/api/workflows/[id]/route.ts` - Individual workflow CRUD API
- `app/api/projects/[id]/reviewers/route.ts` - Stage reviewers management API
- `components/workflows/StageBuilder.tsx` - Interactive stage editor
- `components/workflows/WorkflowModal.tsx` - Workflow creation/editing dialog
- `components/projects/ProjectSelector.tsx` - Project assignment dropdown
- `app/(dashboard)/admin/workflows/page.tsx` - Workflow management page

**Modified Files**:
- `app/api/projects/route.ts` - Added mockup_previews to list response, workflow_id support
- `app/api/projects/[id]/route.ts` - Added workflow JOIN, workflow_id update with reviewer cleanup
- `app/api/projects/[id]/mockups/route.ts` - Fixed Supabase join syntax
- `app/api/mockups/[id]/route.ts` - Added project_id assignment support
- `app/(dashboard)/mockup-library/page.tsx` - Added project assignment UI
- `components/projects/NewProjectModal.tsx` - Added workflow selection
- `components/projects/ProjectCard.tsx` - Added workflow badge display
- `components/SidebarSimple.tsx` - Added Workflows admin link
- `lib/supabase.ts` - Added workflow-related TypeScript types

**Database Changes**:
- New enum type: `workflow_stage_color` (7 values)
- New table: `workflows` with 10 fields including JSONB stages
- New table: `project_stage_reviewers` with 8 fields
- New column: `projects.workflow_id` (nullable UUID)
- New indexes: 6 performance indexes for workflows and reviewers
- New triggers: `update_workflows_updated_at` for timestamp management
- New constraints: Unique reviewer per stage, validated stage_order

**Key Features**:
- Admin-only workflow management (org:admin role required)
- JSONB-based stage storage for flexibility
- Default workflow auto-selection in project creation
- Stage-based reviewer assignments with validation
- Color-coded visual workflow stages
- Organization-scoped: All workflows isolated by `organization_id`
- Backward compatible: Projects work without workflows

### 🔄 Database Migration Required

**Before using this version**, you must run the database migration:

1. Open Supabase SQL Editor
2. Execute `supabase/08_workflows.sql`
3. Verify tables created successfully:
   ```sql
   SELECT * FROM workflows;
   SELECT * FROM project_stage_reviewers;
   ```

The migration is **backward compatible** - all existing projects will continue to work. Projects without workflows remain fully functional.

### 🎯 What's Next (Phase 3 Roadmap)

Future enhancements planned for Workflows:
- **Workflow Board View**: Kanban-style board with stage columns
- **Mockup Stage Assignment**: Move mockups between workflow stages
- **Stage Completion Tracking**: Visual progress indicators per stage
- **Email Notifications**: Notify reviewers when mockups enter their stage
- **Approval Status**: Track approved/rejected status per stage
- **Workflow Analytics**: Time in stage, bottleneck identification
- **Conditional Stages**: Skip stages based on criteria
- **Stage Comments**: Stage-level notes and discussions
- **Workflow Templates**: Industry-specific workflow presets

---

## [2.3.0] - 2025-01-24

### 📁 Projects Feature (Phase 1)

This release introduces **Projects** - a new organizational layer for managing mockups by client engagement. Projects act as containers to group related mockups together, making it easier to organize work by client, campaign, or initiative.

### ✨ Added

#### Project Management System
- **Create Projects**: New project creation with name, client name, description, status, and custom color
- **Project Status Types**: Three status options for workflow management
  - **Active**: Currently in progress projects
  - **Completed**: Finished projects
  - **Archived**: Historical projects for reference
- **Color Customization**: Choose from 8 preset colors for visual organization
  - Blue (#3B82F6), Purple (#A855F7), Pink (#EC4899), Green (#10B981)
  - Orange (#F59E0B), Red (#EF4444), Indigo (#6366F1), Teal (#14B8A6)
- **Visual Mockup Previews**: Project cards display up to 4 thumbnail previews
- **Mockup Count Badges**: Real-time count of mockups per project

#### Projects List Page (`/projects`)
- **Grid Layout**: Clean card-based layout showing all projects
- **Search Functionality**: Search projects by name, client name, or description
- **Status Filtering**: Filter projects by Active, Completed, or Archived status
- **Quick Actions**: Edit and delete projects from card menu
- **Empty States**: Helpful guidance when no projects exist or no results found

#### Project Detail Page (`/projects/[id]`)
- **Project Overview**: Header with name, client, description, status, and color indicator
- **Mockup Gallery**: Grid view of all mockups assigned to the project
- **Mockup Search**: Search within project mockups
- **Mockup Actions**: View, download, and delete mockups directly from project view
- **Back Navigation**: Easy return to projects list

#### Database Schema
- **New Table**: `projects` with full metadata support
- **Status Enum**: `project_status` type ('active', 'completed', 'archived')
- **Mockup Association**: `project_id` column added to `card_mockups` table
- **Cascade Handling**: ON DELETE SET NULL ensures mockups preserved when project deleted
- **Performance Indexes**: Optimized queries for organization_id, status, and project_id
- **RLS Policies**: Secure access through API routes only

#### API Routes
- `GET /api/projects` - List all projects with mockup counts and previews
- `POST /api/projects` - Create new project with validation
- `GET /api/projects/[id]` - Get single project with full details
- `PATCH /api/projects/[id]` - Update project (name, client, description, status, color)
- `DELETE /api/projects/[id]` - Delete project (mockups preserved, unassigned)
- `GET /api/projects/[id]/mockups` - List all mockups for a project
- `PATCH /api/mockups/[id]` - Updated to support project_id assignment

#### UI Components
- **NewProjectModal**: Full-featured modal for creating projects
  - Required project name field (max 100 characters)
  - Optional client name and description
  - Status dropdown (defaults to 'active')
  - Color picker with 8 preset colors
  - Form validation and error handling
- **ProjectCard**: Reusable project card component
  - Color indicator bar on left edge
  - Project name and client name display
  - Status badge with color coding
  - Up to 4 mockup thumbnail previews
  - Mockup count and creation date
  - Action menu for edit/delete

### 🔧 Changed

- **Sidebar Navigation**: Added "Projects" item with Briefcase icon
- **Mockup API**: Extended to support project assignment via `project_id` field
- **TypeScript Types**: Added `Project`, `ProjectStatus` interfaces to `lib/supabase.ts`

### 🐛 Fixed

- **Sidebar Positioning**: Fixed sidebar overlapping header - now starts below header at 73px top offset
- **RLS Policy**: Corrected projects table RLS policy from `USING (false)` to `USING (true)` to allow API access
  - Original restrictive policy blocked all database operations
  - Updated to match folders pattern: authentication handled at API route level with Clerk

### 📝 Technical Details

**New Files**:
- `supabase/07_projects.sql` - Database migration for projects feature
- `lib/supabase.ts` - Added Project and ProjectStatus TypeScript types
- `app/api/projects/route.ts` - Projects list and create API
- `app/api/projects/[id]/route.ts` - Individual project CRUD API
- `app/api/projects/[id]/mockups/route.ts` - Project mockups listing API
- `components/projects/NewProjectModal.tsx` - Project creation modal
- `components/projects/ProjectCard.tsx` - Project card component
- `app/(dashboard)/projects/page.tsx` - Projects list page
- `app/(dashboard)/projects/[id]/page.tsx` - Project detail page

**Modified Files**:
- `app/api/mockups/[id]/route.ts` - Added project_id support for assignment
- `components/SidebarSimple.tsx` - Added Projects navigation link

**Database Changes**:
- New enum type: `project_status`
- New table: `projects` with 10 fields
- New column: `card_mockups.project_id` (nullable UUID)
- New indexes: 5 performance indexes for projects and mockup queries
- New trigger: `update_projects_updated_at` for timestamp management

**Key Features**:
- Organization-scoped: All projects isolated by `organization_id`
- Permission-based: Only project creator or org admin can edit/delete
- Backward compatible: Existing mockups work without projects
- Nullable association: Mockups can exist without project assignment
- Soft delete: Deleting project unassigns mockups (doesn't delete them)

### 🔄 Database Migration Required

**Before using this version**, you must run the database migration:

1. Open Supabase SQL Editor
2. Execute `supabase/07_projects.sql`
3. Fix the RLS policy (if you ran the original migration):
   ```sql
   DROP POLICY IF EXISTS "No direct access to projects" ON projects;
   CREATE POLICY "Allow all for authenticated users in org"
     ON projects FOR ALL USING (true);
   ```
4. Verify tables and columns created successfully

The migration is **backward compatible** - all existing data will continue to work.

**Note**: The initial migration file had an overly restrictive RLS policy that has been corrected in documentation. If you encounter "Failed to create project" errors, run step 3 above.

### 🎯 What's Next (Phase 2 Roadmap)

Future enhancements planned for Projects:
- **Multi-column Kanban Layout**: Drag-and-drop between project status columns
- **Bulk Operations**: Assign multiple mockups to a project at once
- **Project Selector in Mockup Library**: Quick-assign dropdown in mockup cards
- **Project Editing Modal**: In-place editing without navigation
- **Advanced Filtering**: Filter by date range, creator, mockup count
- **Project Templates**: Save project configurations as templates
- **Project Analytics**: Time tracking, completion rates, mockup velocity
- **Project Sharing**: Share project URLs with clients for review
- **Export Project**: Download all mockups as ZIP archive

---

## [2.2.0] - 2025-01-24

### 🎨 UI Enhancements & Rebranding

This release introduces a collapsible sidebar for maximum canvas space and rebrands the platform to **CardMock** with an emphasis on collaboration and validation workflows.

### ✨ Added

#### Collapsible Icon Sidebar
- **Toggle Functionality**: Collapse sidebar to 64px (icon-only) or expand to 256px (full labels)
- **Extra Canvas Space**: Gain ~200px horizontal space when collapsed
- **Icon Tooltips**: Hover tooltips on navigation icons when collapsed
- **Persistent State**: User preference saved in localStorage across sessions
- **Smooth Animations**: 300ms transitions following modern design tool patterns (Figma, Linear, VS Code)
- **SidebarContext**: New React Context for managing sidebar collapse state globally
- **Dynamic Layouts**: Dashboard and root layouts adjust margins based on sidebar state
- **Default Collapsed**: Sidebar defaults to collapsed for maximum canvas space

#### Rebranding to CardMock
- **New Name**: Rebranded from "Asset Studio" to "CardMock"
- **New Tagline**: "Collaborate and Validate"
- **Clickable Branding**: Header and sidebar branding link to homepage
- **Updated Copy**: Emphasis on collaboration and validation workflows
- **Hover Effects**: Interactive visual feedback on branding elements

### 🔧 Changed

- **Sidebar Width**: Dynamic width based on collapsed state (64px ↔ 256px)
- **Main Content Margin**: Adjusts dynamically (ml-16 ↔ ml-64) for smooth transitions
- **Navigation Display**: Icons-only mode with tooltips when collapsed
- **Accordion Behavior**: Auto-collapses when sidebar is collapsed
- **Organization Switcher**: Adapts to icon-only mode in collapsed state

### 📝 Technical Details

**New Files**:
- `lib/contexts/SidebarContext.tsx` - Sidebar state management with localStorage

**Modified Files**:
- `components/Header.tsx` - CardMock branding + clickable homepage link
- `components/SidebarSimple.tsx` - Collapsible UI logic + tooltips
- `app/layout.tsx` - SidebarProvider wrapper
- `app/(dashboard)/layout.tsx` - Dynamic margin logic based on sidebar state
- `app/page.tsx` - Updated homepage branding and tagline
- `documentation/README.md` - Updated branding throughout
- `documentation/CHANGELOG.md` - Updated project name

**Key Features**:
- Default state: Collapsed (prioritize canvas space)
- localStorage key: `asset-studio-sidebar-collapsed`
- Transition duration: 300ms
- Mobile behavior: Unchanged (slide in/out)

---

## [2.1.0] - 2025-01-23

### 🎨 Enhanced Collaboration Features

This release completes the visual collaboration system with zoom controls, visual annotation linking, and real-time updates.

### ✨ Added

#### Zoom and Pan Controls
- **Zoom Range**: 25% to 400% with 25% increments
- **Mouse Wheel Zoom**: Scroll to zoom in/out, centered on cursor position
- **Zoom Buttons**: In-canvas UI controls for zoom in, zoom out, reset, and fit to screen
- **Live Zoom Percentage**: Real-time display of current zoom level
- **Pan with Select Tool**: Click-drag to pan around canvas when zoomed in
- **Smart Cursor**: Changes to grab/grabbing icons when panning

#### Visual Annotation-Comment Linking
- **Numbered Badges**: Sequential numbers (1, 2, 3...) on canvas annotations
- **Matching Comment Numbers**: Same numbers displayed in sidebar comments
- **Hover Highlighting**: Hover over comment → highlights annotation on canvas
- **Reverse Hover**: Hover over annotation → highlights comment in sidebar
- **Visual Feedback**: Thicker strokes, pulsing circles, background colors on hover
- **Color Coordination**: Badge colors match annotation colors

#### Real-Time Updates
- **Immediate Comment Display**: New comments appear instantly without page refresh
- **Auto-Refresh**: Comments refetch automatically after creation

### 🐛 Fixed

- **Rounded Corners**: Card templates now render with proper rounded corners (2.5% radius)
- **Comments Not Persisting**: Fixed RLS policy blocking by routing through API endpoints
- **Annotations Not Displaying**: Changed from direct Supabase queries to API route calls
- **Export Scale**: Zoom level no longer affects exported mockup resolution

### 🔧 Changed

- **Removed Realtime Subscriptions**: Replaced with polling for better reliability with Clerk Auth
- **API-First Architecture**: All comment/reviewer queries now use API routes instead of direct Supabase client
- **Canvas Coordinate System**: Annotations now support zoom transformations

### 📝 Technical Details

**Files Modified**:
- `components/collaboration/MockupCanvas.tsx` - Zoom controls, numbered badges, hover handlers
- `components/collaboration/CommentsSidebar.tsx` - Comment numbers, hover highlighting
- `app/(dashboard)/mockups/[id]/page.tsx` - Hover state management, refetch logic
- `components/KonvaCanvas.tsx` - Rounded corner rendering

**Database**: No schema changes (fully compatible with v2.0.0)

---

## [2.0.0] - 2025-01-22

### 🎉 Major Release: Folder Organization System

This major release introduces a comprehensive folder-based organization system for mockups, along with significant improvements to multi-tenancy, mobile experience, and Next.js 15 compatibility.

### ✨ New Features

#### Folder Organization System
**The headline feature of v2.0.0** - A complete workspace organization system for managing mockups.

- **Personal Folders**: Users can create their own folder hierarchy to organize mockups
- **Nested Folders**: Support for up to 5 levels of folder nesting with automatic depth validation
- **Org-Shared Folders**: Admin users can create organization-wide shared folders
- **Two-Panel Library Layout**: New sidebar + grid layout for intuitive folder navigation
- **Smart Unsorted Folder**: Virtual folder automatically shows mockups not in any folder
- **Folder Actions**: Right-click context menus for create, rename, delete, and share operations
- **Move Mockups**: Inline folder selector to move mockups between folders
- **Folder Counts**: Real-time mockup count badges on folders
- **Search Within Folders**: Search functionality scoped to selected folder

**Database Changes**:
- New migration: `04_folder_organization.sql`
- New table: `folders` with support for hierarchy and org sharing
- Added `created_by` (Clerk user ID) to `card_mockups`, `card_templates`, `brands`
- Added `folder_id` reference to `card_mockups`
- Full backward compatibility - existing mockups work without migration

**UI Components**:
- `FolderTree`: Hierarchical folder navigator with expand/collapse
- `CreateFolderModal`: Folder creation with validation
- `RenameFolderModal`: Rename folders with duplicate checking
- `DeleteFolderModal`: Delete with cascade warnings and mockup preservation
- `FolderSelector`: Dropdown selector for assigning folders

**API Routes**:
- `GET /api/folders` - List user's folders (personal + shared)
- `POST /api/folders` - Create new folder
- `PATCH /api/folders/[id]` - Rename folder or toggle org sharing
- `DELETE /api/folders/[id]` - Delete folder (mockups moved to unsorted)
- `PATCH /api/mockups/[id]` - Move mockup to folder
- `DELETE /api/mockups/[id]` - Delete mockup with storage cleanup

#### Organization-Scoped Data Isolation
- **Multi-Tenant Architecture**: Complete data isolation between organizations
- **Organization Filtering**: All queries automatically filtered by `organization_id`
- **Organization Switcher**: Clerk's OrganizationSwitcher integrated in sidebar
- **Admin Role Support**: Organization admin vs member role enforcement
- **Secure RLS Policies**: Row-level security at database level

### 🔧 Improvements

#### Next.js 15 Compatibility
- Updated all API routes to support Next.js 15's async `params`
- Fixed async `auth()` calls throughout the application
- Resolved Lucide React icon prop compatibility issues
- Successfully compiling with Next.js 15.5.5 and Turbopack

#### Mobile Responsiveness
- **Comprehensive Mobile UI**: Full responsive design for all screens
- **Fixed Sidebar**: Desktop sidebar stays fixed, mobile slides in/out
- **Hamburger Menu**: Relocated to header for better mobile UX
- **Overflow Fixes**: Resolved horizontal scroll issues on mobile
- **Touch-Friendly**: Larger touch targets and spacing for mobile users
- **Sticky Header**: Improved header behavior with user name display

#### User Experience
- **Auto-Navigation**: After logo upload, automatically redirects to library view
- **Collapsible Navigation**: Accordion-style navigation in sidebar
- **Authentication Pages**: Clean auth pages without sidebar/header
- **User Profile**: Display user name and photo in header
- **Toast Notifications**: Consistent success/error feedback

### 🐛 Bug Fixes

- Fixed Brandfetch logo save to include `organization_id` in brands and variants
- Fixed 404 errors in upload redirects (now correctly points to `/search`)
- Fixed duplicate "Organization Settings" page in admin section
- Fixed admin page authentication for Next.js 15
- Fixed hamburger button z-index for proper mobile visibility
- Fixed various admin page import and async issues

### 📦 Dependencies

- **Next.js**: 15.5.5 (with Turbopack)
- **React**: 19.1.0
- **@clerk/nextjs**: ^6.33.7 (for authentication)
- **@clerk/themes**: ^2.4.28 (dark theme support)
- **@supabase/supabase-js**: ^2.75.0
- **konva**: ^10.0.2 (canvas mockup editor)
- **react-konva**: ^19.0.10
- **lucide-react**: ^0.546.0 (icons)
- **Tailwind CSS**: ^4

### 🗄️ Database Migrations

**Required for v2.0.0**:
```sql
-- Run in Supabase SQL Editor:
-- 1. supabase/01_initial_schema.sql (if not already run)
-- 2. supabase/02_brand_centric.sql (if not already run)
-- 3. supabase/03_storage_setup.sql (if not already run)
-- 4. supabase/04_folder_organization.sql (NEW in v2.0.0)
```

**Migration 04 adds**:
- `folders` table with hierarchy support
- `created_by` field to existing tables
- `folder_id` link from mockups to folders
- Indexes for performance
- Folder depth validation (max 5 levels)
- Helper view for mockup counts

**⚠️ Important**: Migration 04 is **backward compatible**. Existing mockups without `folder_id` appear in the "Unsorted" folder. No data loss or breaking changes.

### 🔄 Upgrade Instructions

1. **Pull latest code**:
   ```bash
   git pull origin main
   git checkout v2.0.0
   npm install
   ```

2. **Run database migration**:
   - Open Supabase SQL Editor
   - Execute `supabase/04_folder_organization.sql`

3. **Build and deploy**:
   ```bash
   npm run build
   # Deploy to your hosting platform
   ```

4. **Test new features**:
   - Create folders in Mockup Library
   - Save new mockups to folders
   - Move existing mockups to organize them

### 📝 Breaking Changes

**None!** This release is fully backward compatible. All existing mockups, templates, and brands continue to work exactly as before.

### 🎯 What's Next (v2.1.0 Roadmap)

Potential features for the next release:
- Drag-and-drop mockup organization
- Bulk mockup operations (move, delete)
- Folder color coding
- Export folder as ZIP
- Mockup version history
- Folder templates
- Enhanced search across folders

---

## [1.1.0] - 2024-10-21

### Added
- Organization-scoped data features
- Multi-tenant support with Clerk Organizations
- Initial folder structure planning

### Changed
- Improved organization switcher UI
- Enhanced admin permission handling

---

## [1.0.1] - 2024-10-19

### Fixed
- Brand-centric data model migration issues
- Storage bucket policy refinements

---

## [1.0.0] - 2024-10-18

### 🎉 Initial Stable Release

**Asset Studio** - Logo search, brand asset management, and mockup creation tool.

#### Core Features

**Logo Search & Management**:
- Brandfetch API integration for company logo search
- Search by domain name or company name
- Multiple logo variants (SVG, PNG, light/dark themes)
- Brand color palette extraction
- Font information capture
- Save logos to personal library

**Brand Library**:
- Personal brand collection
- Brand-centric data model (one brand → multiple logo variants)
- Logo variant management
- Brand colors and fonts storage
- Organization-based data isolation

**Mockup Designer**:
- Interactive canvas-based designer using Konva.js
- Drag-and-drop logo placement
- Position controls (arrows, presets, numeric input)
- Size controls with aspect ratio lock
- Grid overlay for precise alignment
- High-resolution export (2x pixel ratio)
- Template background selection

**Template Management**:
- Upload custom templates
- Template library with organization filtering
- Card template support (business cards, badges, etc.)

**Authentication & Multi-Tenancy**:
- Clerk authentication integration
- Organization support with role-based access
- Admin vs user permissions
- Organization switcher
- Secure sign-in/sign-up flows

**Database & Storage**:
- Supabase PostgreSQL database
- Supabase Storage for file hosting
- Row-level security (RLS) policies
- Three storage buckets: logos, card-templates, card-mockups
- Brand-centric schema with proper relationships

**User Interface**:
- Modern, clean design with Tailwind CSS
- Responsive layout (desktop-first)
- Sidebar navigation
- Toast notifications for user feedback
- Modal-based workflows

#### Database Schema (v1.0.0)

**Tables**:
- `brands` - Company/brand information
- `logo_variants` - Multiple logo files per brand
- `brand_colors` - Color palettes
- `brand_fonts` - Typography information
- `card_templates` - Design templates
- `card_mockups` - Generated mockup data

**Migrations**:
1. `01_initial_schema.sql` - Base tables and RLS
2. `02_brand_centric.sql` - Brand-centric restructuring
3. `03_storage_setup.sql` - Storage bucket policies

---

## Project Overview

**CardMock** (formerly Asset Studio / Logo Finder) is a comprehensive collaboration and validation platform for design review and approval workflows. Built for design teams, marketing departments, and agencies who need to:

- **Search & Save**: Find company logos via Brandfetch API and save to personal library
- **Organize**: Manage brand assets with full color and font metadata
- **Create**: Design mockups using an interactive canvas editor
- **Collaborate**: Share assets within organizations with role-based access
- **Scale**: Multi-tenant architecture supporting unlimited organizations

**Technology Stack**:
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Canvas**: Konva.js + React-Konva
- **Auth**: Clerk (with organization support)
- **Database**: Supabase (PostgreSQL + Storage)
- **Build**: Turbopack
- **Deployment**: Vercel-ready

**Key Differentiators**:
- Brand-centric data model (not just individual logos)
- Organization-based multi-tenancy
- Folder organization for workspace management
- Interactive mockup designer with live preview
- Automatic asset metadata extraction
- Full backward compatibility across versions

---

## Version History Summary

- **v2.4.0** (2025-01-25) - Workflow Templates System (Phase 2), Mockup Assignment UI, Bug Fixes
- **v2.3.0** (2025-01-24) - Projects Feature (Phase 1) - Client Engagement Organization
- **v2.2.0** (2025-01-24) - Collapsible Sidebar UI, CardMock Rebranding
- **v2.1.0** (2025-01-23) - Collaboration Enhancements, Visual Linking
- **v2.0.0** (2025-01-22) - Folder Organization System, Next.js 15, Mobile UX
- **v1.1.0** (2024-10-21) - Organization-scoped data, multi-tenancy
- **v1.0.1** (2024-10-19) - Bug fixes and schema improvements
- **v1.0.0** (2024-10-18) - Initial stable release

---

## Contributing

When submitting changes:
1. Update this CHANGELOG.md
2. Bump version in package.json (follow semantic versioning)
3. Create git tag for releases
4. Document any database migrations required

---

## Links

- **Repository**: https://github.com/jay-chalkstep/cardmock
- **Issue Tracker**: https://github.com/jay-chalkstep/cardmock/issues
- **Documentation**: See README.md and SETUP_GUIDE.md

---

*Maintained by the CardMock team*
