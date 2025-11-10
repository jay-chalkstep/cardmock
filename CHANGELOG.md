# Changelog

All notable changes to **Aiproval** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.1.1] - 2025-01-XX

### 🐛 Fixed

#### Projects Module Performance & Error Handling
- **Removed N+1 Query Problem**: Eliminated verification loop that was making individual API calls for each project
  - Removed unnecessary project verification in `projects/page.tsx` that caused 404 errors in console
  - Removed async verification in `ProjectListItem.tsx` before navigation
  - Projects page now trusts API response instead of re-verifying each project
- **Optimized API Endpoint**: Improved `/api/projects` endpoint performance
  - Client-role users now filter projects at database level using `IN` query instead of JavaScript filtering
  - Reduced query complexity and improved response times
  - Early return for client users with no contracts (empty array)
- **Improved Error Handling**: Detail page already handles missing projects gracefully
  - Navigation now direct without pre-verification
  - Errors handled at appropriate level (detail page for 404s)

### 🔄 Changed

- **Projects Page**: Simplified `fetchProjects` function - removed verification loop
- **Project List Item**: Removed async verification before navigation - now navigates directly
- **Projects API**: Optimized database query filtering for client-role users

### 📊 Performance Impact

- **Eliminated N+1 Queries**: Removed N additional API calls per project list load
- **Reduced Network Traffic**: No more individual project verification requests
- **Faster Page Load**: Direct navigation without verification delays
- **Cleaner Console**: No more 404 errors from verification attempts

---

## [4.1.0] - 2025-01-XX

### 🚀 **MAJOR RELEASE - Platform Integrations**

Complete platform integration system bringing approvals into existing design and communication tools, enabling external reviewers without accounts, and providing powerful presentation tools for stakeholder reviews.

### Added

#### Platform Integrations ⭐️ NEW
- **Figma Plugin Integration** - Send Figma frames directly for approval
  - OAuth 2.0 authentication with Figma
  - Direct frame upload from Figma plugin
  - Real-time status sync (approved/pending/rejected)
  - Comment sync between Figma and Aiproval (bidirectional)
  - Automatic version detection
  - Project mapping based on Figma file organization
  - Figma metadata storage (file_id, node_ids, file_url, version_key)
  - **Figma Integration Settings Page** - Connect/disconnect Figma account ⭐️ NEW
  - **Figma Import UI** - Import frames directly from Figma files ⭐️ NEW
    - "Import from Figma" button in Library page assets tab
    - Multi-step import wizard (File Selection → Frame Selection → Import Settings)
    - Browse Figma files by file key
    - Select multiple frames to import
    - Assign to project and folder during import
    - Automatic frame export and asset creation
  - **Figma Status Badge** - Display approval status in asset lists ⭐️ NEW
    - Shows Figma approval status (approved/pending/changes_requested) in asset list items
    - Automatically fetches status for assets with Figma metadata
  - **Figma Metadata Display** - Show Figma file/node information in asset details ⭐️ NEW
    - Displays Figma file ID, node IDs, and file URL
    - "Open in Figma" link to view source file
    - Shows last modified date
    - Appears in asset detail sidebar when Figma metadata exists
  - **Integrations Tab in Settings** - Centralized integration management ⭐️ NEW
    - New "Integrations" tab in Settings modal
    - Quick access to Figma integration settings
    - Shows "Coming Soon" for other integrations (Gmail, Slack, Drive/Dropbox)

- **Public Share Pages** - External reviewers without account creation
  - JWT-based secure share links with expiration
  - Progressive identity capture (view → comment → approve)
  - Password protection option
  - Link expiration controls (time-based or use-based)
  - Branded review experience (org logo/colors)
  - Session persistence via secure cookies
  - Full audit trail with captured identity
  - **Public Review Canvas** - Full annotation and commenting capabilities ⭐️ NEW
  - **Identity Capture Modal** - Progressive identity collection ⭐️ NEW
  - **Public Share Settings** - Generate and manage share links ⭐️ NEW
  - **Public Share Analytics** - Track share link usage and engagement ⭐️ NEW

- **Gmail Add-on Integration** - Send approval requests from Gmail
  - OAuth 2.0 authentication with Google Workspace
  - Send for approval directly from Gmail compose
  - Attachments upload as new mockups
  - Recipients added as reviewers automatically
  - Embedded review links in emails
  - Quick approve/reject buttons in email
  - Automatic feedback ingestion from replies
  - Thread tracking (link emails to assets)
  - **Gmail Connect Button** - OAuth connection component ⭐️ NEW

- **Slack Integration** - Real-time notifications and quick actions
  - OAuth 2.0 workspace installation
  - Real-time notifications for:
    - New approval requests
    - Stage progression
    - Comments/feedback
    - Final approvals
  - Slash commands:
    - `/aiproval status [project]` - Check approval status
    - `/aiproval pending` - List pending reviews
    - `/aiproval share [mockup]` - Share for quick feedback
  - Interactive message buttons (Approve/Request Changes/View Details)
  - Daily/weekly digest summaries
  - Channel-based project mapping
  - **Slack Install Button** - Workspace installation component ⭐️ NEW

- **Drive/Dropbox Magic Import** - Import existing folder structures
  - OAuth for Google Drive and Dropbox
  - Import wizard with preview
  - Mapping rules:
    - Level 1 folders → Clients
    - Level 2 folders → Projects
    - Level 3+ folders → Aiproval folders
    - File naming patterns → Asset metadata
    - Modified dates → Version history
  - Duplicate detection
  - Batch processing with progress tracking
  - Ongoing sync options (one-time, periodic, real-time)
  - **Cloud Storage Connect Button** - OAuth connection component ⭐️ NEW

- **Comparison/Presentation Mode** - Side-by-side comparison and presentation tools
  - Comparison views:
    - Side-by-side (2-4 mockups)
    - Overlay/onion skin (version comparison)
    - Timeline view (version history)
    - Grid view (all options)
  - Presentation features:
    - Full-screen presentation mode
    - Keyboard navigation (arrow keys)
    - Presenter notes (private)
    - Live voting/polling
    - Annotation toggle
    - Export to PDF/PowerPoint (placeholder)
  - Meeting tools:
    - Screen share optimization
    - Participant cursor tracking
    - Live approval capture during meeting
    - Meeting recording (optional, placeholder)
    - Auto-generated meeting summary (placeholder)
  - **Create Presentation Modal** - Create presentation sessions ⭐️ NEW
  - **Comparison View** - Side-by-side, grid, timeline views ⭐️ NEW
  - **Presentation Mode** - Full-screen presentation with keyboard navigation ⭐️ NEW
  - **Voting Panel** - Live voting/polling component ⭐️ NEW

#### Shared Infrastructure ⭐️ NEW
- **Integration Credentials Storage** - Encrypted OAuth token storage
  - AES-256-GCM encryption for all OAuth tokens
  - Automatic token refresh before expiration
  - Secure credential management
- **Integration Events Tracking** - Activity logging for all integrations
  - Success/error/pending status tracking
  - Error message logging
  - Payload storage for debugging
- **Integration Analytics** - Usage metrics for all integrations
  - Event type tracking
  - Metadata storage
  - Organization-scoped analytics
- **OAuth Flow Helpers** - Standardized OAuth 2.0 flow management
  - Initiate OAuth flow
  - Handle OAuth callback
  - Refresh OAuth tokens
  - Revoke OAuth tokens
- **Webhook Signature Verification** - Secure webhook handling
  - Slack signature verification
  - Gmail signature verification
  - Figma signature verification
  - Timestamp validation (prevent replay attacks)
- **Rate Limiting** - Per-integration rate limiting
  - Figma: 100 requests/minute
  - Gmail: 20 requests/minute
  - Slack: 50 requests/minute
  - Drive/Dropbox: 100 requests/minute
- **JWT Token Management** - Secure public share links
  - Token generation with expiration
  - Token verification
  - Token decoding
- **Public Session Management** - Anonymous reviewer sessions
  - Session creation and persistence
  - Identity capture and storage
  - Session cookie management

#### Database Schema
- **Migration 28** - Integrations Foundation
  - `integration_credentials` table - Encrypted OAuth token storage
  - `integration_events` table - Activity tracking
  - `integration_analytics` table - Usage metrics
- **Migration 29** - Public Sharing
  - `public_share_links` table - Share link management
  - `public_reviewers` table - Identity capture
  - `public_share_analytics` table - Usage tracking
  - `assets.public_share_enabled` column
- **Migration 30** - Figma Integration
  - `figma_integrations` table - OAuth credentials
  - `figma_sync_events` table - Sync tracking
  - `assets.figma_metadata` JSONB column
- **Migration 31** - Gmail Integration
  - `gmail_integrations` table - OAuth credentials
  - `gmail_threads` table - Thread tracking
  - `gmail_feedback_events` table - Feedback tracking
- **Migration 32** - Slack Integration
  - `slack_integrations` table - Workspace credentials
  - `slack_channels` table - Channel-project mapping
  - `slack_notification_events` table - Notification tracking
- **Migration 33** - Cloud Storage Import
  - `cloud_storage_integrations` table - OAuth credentials
  - `import_jobs` table - Import job tracking
  - `import_mappings` table - Folder mapping rules
- **Migration 34** - Presentation Mode
  - `presentation_sessions` table - Session management
  - `presentation_participants` table - Participant tracking
  - `presentation_votes` table - Voting/polling

#### API Routes
- **Public Share API** (`/api/public/share/[token]`) - Public share link access
- **Public Share Management** (`/api/assets/[id]/share`) - Create/revoke share links
- **Public Share Analytics** (`/api/assets/share/[linkId]/analytics`) - Analytics data
- **Figma Integration API** (`/api/integrations/figma`) - OAuth, upload, status, sync
  - `/api/integrations/figma/files` - Fetch user's Figma files
  - `/api/integrations/figma/files/[fileKey]` - Get frames from a Figma file
  - `/api/integrations/figma/files/[fileKey]/frames/[nodeId]/export` - Export frame as image
  - `/api/integrations/figma/import` - Import selected frames as assets
- **Gmail Integration API** (`/api/integrations/gmail`) - OAuth, send-approval
- **Slack Integration API** (`/api/integrations/slack`) - OAuth, events, commands, interactive, notify
- **Cloud Storage API** (`/api/integrations/cloud-storage/[provider]`) - OAuth, import, sync
- **Presentation API** (`/api/presentations`) - Create, list, get, delete sessions
- **Presentation Actions** (`/api/presentations/[id]/vote`, `/api/presentations/[id]/join`) - Voting and participation

#### Components
- **Integration Components** - FigmaConnectButton, FigmaStatusBadge, FigmaMetadataDisplay, FigmaImportModal, GmailConnectButton, SlackInstallButton, CloudStorageConnectButton
- **UI Integration** - FigmaStatusBadge integrated into asset list items (MockupListItem)
- **UI Integration** - FigmaMetadataDisplay integrated into asset detail sidebar (MockupDetailSidebar)
- **UI Integration** - Integrations tab added to Settings modal (SettingsModal)
- **Public Share Components** - PublicReviewCanvas, IdentityCaptureModal, PublicShareSettings, PublicShareAnalytics
- **Presentation Components** - CreatePresentationModal, ComparisonView, PresentationMode, VotingPanel
- **Settings Pages** - Figma integration settings page

#### Utilities
- **Integration Utilities** (`lib/integrations/`) - OAuth, webhooks, rate-limit, encryption, status, figma
- **Public Utilities** (`lib/public/`) - JWT, session management

### Technical

#### New Dependencies
- `jsonwebtoken` - JWT token generation/validation
- `bcryptjs` - Password hashing for share links
- `@types/jsonwebtoken` - TypeScript types
- `@types/bcryptjs` - TypeScript types

#### New Files
- `supabase/28_integrations_foundation.sql` - Shared infrastructure
- `supabase/29_public_sharing.sql` - Public share links
- `supabase/30_figma_integration.sql` - Figma integration
- `supabase/31_gmail_integration.sql` - Gmail integration
- `supabase/32_slack_integration.sql` - Slack integration
- `supabase/33_cloud_storage_import.sql` - Drive/Dropbox import
- `supabase/34_presentation_mode.sql` - Presentation mode
- `lib/integrations/encryption.ts` - OAuth credential encryption
- `lib/integrations/oauth.ts` - OAuth flow helpers
- `lib/integrations/webhooks.ts` - Webhook signature verification
- `lib/integrations/rate-limit.ts` - Rate limiting
- `lib/integrations/status.ts` - Integration status tracking
- `lib/integrations/figma.ts` - Figma API helper functions
- `lib/public/jwt.ts` - JWT token management
- `lib/public/session.ts` - Public session management
- `app/(public)/share/[token]/page.tsx` - Public review page
- `app/api/public/share/[token]/*` - Public share API routes
- `app/api/assets/[id]/share/route.ts` - Share link management
- `app/api/integrations/figma/*` - Figma integration API routes
- `app/api/integrations/figma/files/*` - Figma file browsing and import routes
- `app/api/integrations/figma/import/route.ts` - Frame import endpoint
- `app/api/integrations/gmail/*` - Gmail integration API routes
- `app/api/integrations/slack/*` - Slack integration API routes
- `app/api/integrations/cloud-storage/[provider]/*` - Cloud storage API routes
- `app/api/presentations/*` - Presentation API routes
- `components/integrations/*` - Integration UI components
- `components/integrations/FigmaImportModal.tsx` - Figma import wizard modal
- `components/public/*` - Public share components
- `components/presentation/*` - Presentation components
- `app/(dashboard)/settings/integrations/figma/page.tsx` - Figma settings page

#### Updated Files
- `middleware.ts` - Added public share routes to public route matcher
- `package.json` - Updated version to 4.1.0, added new dependencies
- `app/(dashboard)/library/page.tsx` - Added "Import from Figma" button and modal integration
- `app/(dashboard)/mockups/[id]/page.tsx` - Added figma_metadata to asset query
- `components/lists/MockupListItem.tsx` - Added FigmaStatusBadge display
- `components/mockups/MockupDetailSidebar.tsx` - Added FigmaMetadataDisplay
- `components/settings/SettingsModal.tsx` - Added Integrations tab with Figma link
- `lib/supabase.ts` - Added figma_metadata to CardMockup interface

### Migration Notes

- **Database Migrations Required**: Run migrations 28-34 in order
- **Environment Variables**: Add integration OAuth credentials and secrets (see README)
- **Encryption Key**: Generate `INTEGRATION_ENCRYPTION_KEY` for OAuth token storage
- **JWT Secret**: Generate `JWT_SECRET` for public share links
- **OAuth Setup**: Configure OAuth apps for each platform (Figma, Gmail, Slack, Drive, Dropbox)

---

## [4.0.0] - 2025-01-XX

### 🚀 **MAJOR RELEASE - Contracts Module**

Complete transformation of the platform into a comprehensive customer onboarding, collaboration, and approval record system with full contract management capabilities.

### Fixed

#### Build & Dependencies
- **Fixed build errors** - Resolved all TypeScript and module resolution errors
  - Fixed missing `svix` package dependency for Clerk webhook integration
  - Fixed missing `NewContractModal` export in contracts components
  - Fixed `const` reassignment error in contracts API route
  - Fixed duplicate function definitions in auth utilities
  - Fixed TypeScript type errors in Project interface and notification function calls
  - Fixed naming conflicts with global `document` object in DocumentViewer component
- **DocuSign Integration** - Temporarily disabled due to package compatibility issues
  - DocuSign integration code preserved with clear comments for future re-enablement
  - All DocuSign-related functions return helpful error messages when called
  - See README for instructions on re-enabling DocuSign integration

### Added

#### Contracts Module ⭐️ NEW
- **Contracts Tab** - New navigation item for contract management
- **Client Management** - Full CRUD operations for clients
  - Create, edit, and delete clients
  - Client details (name, email, phone, address, notes)
  - Client-contract relationship tracking
  - **Client List Page** - Full list view with search and filtering ⭐️ NEW
  - **Client Detail Page** - Comprehensive client view with tabs (Overview, Contracts, Projects) ⭐️ NEW
  - **Edit Client Modal** - Edit client information inline ⭐️ NEW
- **Contract Management** - Complete contract lifecycle management
  - Create new contracts and amendments
  - Contract status tracking (draft, pending_signature, signed, amended, expired, voided)
  - Contract types (new contract, amendment)
  - Contract linking to projects
  - Auto-generated contract numbers
- **Document Versioning** - Word document upload and version control
  - Upload Word documents (.docx, .doc)
  - Automatic version tracking
  - Version history with timestamps
  - Current version marking
  - Document metadata (file name, size, mime type)
  - **Document Management UI** - Upload, view, download, and delete documents ⭐️ NEW
- **Email Mockups** - Visual email template creation and approval
  - Create email mockups with HTML content
  - Client branding integration
  - Email mockup approval workflow
  - Link to contracts and projects
  - **Email Mockup Editor** - Full-featured HTML editor with preview mode ⭐️ NEW
    - Variable insertion (client_name, activation_link, etc.)
    - Image and link tag insertion
    - Client branding selector (colors, fonts, logos)
    - Edit/Preview toggle
  - **Email Mockup List** - Display and manage email mockups ⭐️ NEW
  - **Email Mockup Preview** - Full-screen preview modal ⭐️ NEW
- **Payment Methods** - Flexible payment method approvals
  - Support for multiple payment types (prepaid cards, checks, Amazon cards, custom)
  - Flexible JSONB schema for payment details
  - Payment method approval workflow
  - Link to contracts
  - **Payment Method Management UI** - Add, view, and delete payment methods ⭐️ NEW
- **Contract Detail Page** - Comprehensive contract view
  - Tabbed interface (Overview, Documents, Email Mockups, Payment Methods, Assets, Comments)
  - Contract information display
  - Status tracking
  - Related entities view
  - **Documents Tab** - Upload, view, download, and delete contract documents ⭐️ NEW
  - **Email Mockups Tab** - Create, edit, preview, and delete email mockups ⭐️ NEW
  - **Payment Methods Tab** - Add, view, and delete payment methods ⭐️ NEW
  - **Assets Tab** - View assets linked to contract ⭐️ NEW
  - **Comments Tab** - Add and view contract comments (UI ready) ⭐️ NEW

#### Database Schema
- **Migration 23** - Complete contracts module schema
  - `clients` table - Core client entity
  - `contracts` table - Contract management
  - `contract_documents` table - Document storage and versioning
  - `contract_document_versions` table - Version history with AI diff summaries
  - `email_mockups` table - Email template storage
  - `payment_methods` table - Payment method approvals
  - Foreign key relationships to projects and assets
  - Comprehensive indexes for performance

#### API Routes
- **Client API** (`/api/clients`) - Full CRUD operations
- **Contract API** (`/api/contracts`) - Full CRUD operations with filtering
- **Document API** (`/api/contracts/[id]/documents`) - Upload and version management
- **Email Mockup API** (`/api/email-mockups`) - Full CRUD operations
- **Payment Methods API** (`/api/contracts/[id]/payment-methods`) - Payment method management
- **AI Diff API** (`/api/contracts/documents/[docId]/diff`) - Document comparison (placeholder)
- **DocuSign API** (`/api/contracts/[id]/documents/[docId]/send-for-signature`) - E-signature integration (placeholder)
- **DocuSign Webhook** (`/api/webhooks/docusign`) - Webhook handler (placeholder)

#### Notifications Integration ⭐️ NEW
- **Contract Notifications** - In-app and email notifications for contract events
  - Contract creation notifications to organization members
  - Contract status change notifications
  - Document upload notifications (email templates ready)
  - Non-blocking notification system (won't break main flow if notifications fail)
  - Email notification templates for contract events

#### Components
- **Client Components** - NewClientModal, EditClientModal for client management
- **Contract Components** - NewContractModal for contract creation
- **Email Mockup Components** - EmailMockupEditor, EmailMockupList, EmailMockupPreview
- **Contracts List Page** - Full list view with search and filters
- **Contract Detail Page** - Comprehensive contract view with tabs
- **Client List Page** - Full list view with search and filtering
- **Client Detail Page** - Comprehensive client view with tabs

#### TypeScript Types
- **Contract Types** - Complete type definitions in `lib/supabase.ts`
  - `ContractStatus`, `ContractType`, `DocuSignStatus`
  - `EmailMockupStatus`, `PaymentMethodStatus`
  - `Client`, `Contract`, `ContractDocument`, `ContractDocumentVersion`
  - `EmailMockup`, `PaymentMethod` interfaces

### Technical

#### New Files
- `supabase/23_contracts_module.sql` - Database migration
- `supabase/24_contract_documents_storage.sql` - Storage bucket setup
- `app/(dashboard)/contracts/page.tsx` - Contracts list page
- `app/(dashboard)/contracts/[id]/page.tsx` - Contract detail page
- `app/(dashboard)/clients/page.tsx` - Clients list page
- `app/(dashboard)/clients/[id]/page.tsx` - Client detail page
- `app/api/clients/route.ts` - Client API routes
- `app/api/clients/[id]/route.ts` - Client detail API routes
- `app/api/contracts/route.ts` - Contract API routes
- `app/api/contracts/[id]/route.ts` - Contract detail API routes
- `app/api/contracts/[id]/documents/route.ts` - Document upload API
- `app/api/contracts/[id]/documents/[docId]/route.ts` - Document management API
- `app/api/contracts/[id]/documents/[docId]/versions/route.ts` - Version management API
- `app/api/contracts/documents/[docId]/diff/route.ts` - AI diff API
- `app/api/contracts/[id]/documents/[docId]/send-for-signature/route.ts` - DocuSign API
- `app/api/email-mockups/route.ts` - Email mockup API routes
- `app/api/email-mockups/[id]/route.ts` - Email mockup detail API routes
- `app/api/contracts/[id]/payment-methods/route.ts` - Payment methods API routes
- `components/clients/NewClientModal.tsx` - Client creation modal
- `components/clients/EditClientModal.tsx` - Client editing modal
- `components/email-mockups/EmailMockupEditor.tsx` - Email mockup editor component
- `components/email-mockups/EmailMockupList.tsx` - Email mockup list component
- `components/email-mockups/EmailMockupPreview.tsx` - Email mockup preview component
- `components/email-mockups/index.ts` - Email mockup component exports
- `components/clients/index.ts` - Client component exports
- `components/contracts/NewContractModal.tsx` - Contract creation modal
- `components/contracts/index.ts` - Contract component exports
- `lib/email/contract-notifications.ts` - Contract notification system
- `app/api/webhooks/docusign/route.ts` - DocuSign webhook handler

#### Updated Files
- `components/navigation/NavRail.tsx` - Added Contracts tab with FileText icon
- `lib/supabase.ts` - Added contract-related types and interfaces
- `app/(dashboard)/contracts/page.tsx` - Contracts list with search and filters, added link to clients
- `app/api/contracts/route.ts` - Added notification integration for contract creation
- `app/api/contracts/[id]/route.ts` - Added notification integration for contract status changes

### Future Enhancements (Placeholders)

#### AI Document Diff
- AI-powered document comparison (OpenAI/Anthropic integration needed)
- Human-readable diff summaries
- Automatic change detection

#### DocuSign Integration
- Full DocuSign API integration (SDK installation needed)
- Envelope creation and management
- Signature status tracking
- Webhook verification and processing

#### Email Mockup Editor
- Rich text editor for email content
- Image upload and management
- Client branding selector
- Email preview (desktop/mobile)

#### Document Viewer
- Word document preview
- Version comparison UI
- Diff visualization

### Migration Notes

- **Database Migration Required**: Run `supabase/23_contracts_module.sql` before using contracts module
- **Storage Bucket Required**: Create `contract-documents` bucket in Supabase Storage
- **Clerk Role Setup**: Configure "Client" role in Clerk organization settings for external stakeholder access
- **Environment Variables**: DocuSign and AI service API keys needed for full functionality

---

## [3.9.0] - 2025-01-XX

### 🎨 **MAJOR UI/UX REDESIGN - Navigation & Library Reorganization**

Complete redesign of application navigation and library structure to better serve creators and reviewers, with improved discoverability of key features and streamlined workflows.

### Added

#### Home/Dashboard Page
- **New Home Page** (`/`) - Overview dashboard for both user types
  - **For Creators**: Recent projects, quick create actions, recent assets
  - **For Reviewers**: Pending reviews count, urgent items
  - **Shared**: Recent activity, notifications
  - **Quick Actions**: Direct access to create projects and assets
  - **Stats Cards**: Visual overview of pending reviews, active projects, and quick actions

#### Global Search
- **Persistent Search Bar** - Always-visible search in header (Cmd+K / Ctrl+K)
- **Unified Search API** - Search across Projects, Brands, Templates, and Assets
- **Command Palette Style** - Modal search interface with keyboard navigation
- **Categorized Results** - Results grouped by type with icons
- **Quick Navigation** - Click result to navigate directly to item
- **Recent Searches** - Search history support (future enhancement)

#### Library Reorganization
- **New Library Page** (`/library`) - Unified library with tabbed interface
  - **Assets Tab** - All created mockups/assets with folder organization
  - **Brands Tab** - Brand library with search and upload actions
  - **Templates Tab** - Template library (admin-uploaded templates)
  - **Tab Navigation** - Clear separation of content types
  - **Query Param Support** - Deep linking with `/library?tab=brands`
  - **Shared Search** - Search functionality across all tabs

### Changed

#### Navigation Structure
- **New Navigation Order**: Home → Projects → My Reviews → Library → Designer
- **Renamed Routes**:
  - "Reviews" → "My Reviews" (clearer for reviewers)
  - "Gallery" → "Library" (more professional terminology)
- **Home Route** - Added Home as first navigation item
- **Library Route** - Replaces Gallery with tabbed interface
- **Backward Compatibility** - Gallery route still works, redirects to Library

#### Creation Flow
- **Create Asset Button** - Prominent button in project detail page
- **Project Pre-Selection** - Designer accepts `projectId` query param
- **Improved Project Selection** - Better UI for selecting project when creating assets
- **Contextual Creation** - Create assets directly from project context

#### Search Integration
- **Consolidated Search** - Standalone search page functionality integrated into global search
- **Library Integration** - Search brands functionality available in Library > Brands tab
- **Upload Flow** - Upload redirects to Library > Brands tab after completion

### Improved

#### Reviewer Experience
- **Better Filtering** - Enhanced filtering by project and stage in My Reviews
- **Status Indicators** - Clear visual indicators for what needs attention
- **Quick Actions** - Quick approve functionality from list view
- **Approval History** - Enhanced visibility of approval history in ReviewPreview

#### Link Updates
- **Updated Internal Links** - All `/gallery` links updated to `/library`
- **Search Links** - All `/search` links updated to use global search or Library
- **Redirect Updates** - All redirects updated to use new structure
- **Backward Compatibility** - Old routes still work where needed

### Technical

#### New Components
- `components/search/GlobalSearch.tsx` - Global search component
- `components/dashboard/DashboardOverview.tsx` - Dashboard overview (future enhancement)
- `app/(dashboard)/library/page.tsx` - New unified library page
- `app/(dashboard)/page.tsx` - New home/dashboard page
- `app/api/search/route.ts` - Unified search API endpoint

#### Updated Components
- `components/navigation/NavRail.tsx` - New navigation structure
- `components/layout/AppHeader.tsx` - Added global search bar
- `app/(dashboard)/designer/page.tsx` - Project query param support
- `app/(dashboard)/projects/[id]/page.tsx` - Create Asset button
- `app/(dashboard)/my-stage-reviews/page.tsx` - Enhanced filtering

### Migration Notes

- **Gallery Route**: `/gallery` still works but redirects to `/library?tab=assets`
- **Search Route**: `/search` functionality now in global search (Cmd+K) or Library > Brands
- **Brands Route**: `/brands` still accessible but Library > Brands tab is preferred
- **Navigation**: All internal links updated to new structure

---

## [3.8.0] - 2025-01-XX

### 🎉 **MAJOR FEATURE - Notifications System & Settings Modal**

Added comprehensive in-app notification system and settings management modal, consolidating user preferences, account settings, and organization management into a unified interface.

### Added

#### Notifications System
- **In-App Notifications** - Real-time notification system with dropdown panel accessible from header bell icon
- **Notification Types** - Support for 6 notification types:
  - Approval requests (when assigned as reviewer)
  - Approval received (progress updates)
  - Comments (new comments on assets)
  - Stage progress (stage advancement)
  - Final approval (all stages complete)
  - Changes requested (reviewer requests changes)
- **Unread Badge** - Visual indicator in header showing unread notification count
- **Notification Panel** - Dropdown panel with:
  - List of notifications grouped by date
  - Unread indicators with visual styling
  - Click to navigate to related asset/project
  - Mark as read on click
  - "Mark all as read" button
  - "View all notifications" link (future: dedicated page)
- **Real-Time Updates** - Polling system checks for new notifications every 30 seconds
- **Notification History** - Persistent storage in database for full notification history
- **Auto-Creation** - Notifications automatically created when:
  - User is assigned as reviewer
  - Stage advances to next stage
  - Comments are added
  - Approvals are recorded
  - Final approval is given
  - Changes are requested

#### Settings Modal
- **Comprehensive Settings Interface** - Modal with tabbed navigation:
  - **Preferences Tab** - User preferences for notifications and display
  - **Account Tab** - Integrated Clerk UserProfile for profile management
  - **Organization Tab** - Integrated Clerk OrganizationProfile for admin users (admin only)
  - **Help & Support Tab** - Documentation links and support resources
- **Notification Preferences** - Granular control over email and in-app notifications:
  - Email notifications (approval requests, comments, stage progress, etc.)
  - In-app notifications (same types)
  - Individual toggles for each notification type
- **Display Preferences** - Theme selection (light, dark, system)
- **User Preferences API** - RESTful API for fetching and updating preferences
- **Database Storage** - User preferences stored in database with RLS policies

#### Navigation Consolidation
- **Removed Users Tab** - User management moved from admin nav to Settings modal
- **Updated Admin Nav** - Cleaner navigation with Workflows, Reports, and Templates only
- **Backward Compatibility** - `/admin/users` page shows redirect message

### Database Changes

#### Migration 21: Notifications System
- Created `notifications` table with:
  - `notification_type` enum (6 types)
  - User and organization scoping
  - Read/unread status tracking
  - Related asset and project links
  - Metadata JSONB for additional context
- RLS policies for organization-scoped access
- Performance indexes for fast queries
- Helper function for unread notification count

#### Migration 22: User Preferences
- Created `user_preferences` table with:
  - Notification preferences (JSONB)
  - Display preferences (theme, layout)
  - User and organization scoping
- RLS policies for user-scoped access
- One preference record per user per organization

### Technical Details

#### API Endpoints
- `GET /api/notifications` - Fetch notifications with pagination
- `GET /api/notifications/unread-count` - Get unread count for badge
- `POST /api/notifications/[id]/read` - Mark notification as read
- `POST /api/notifications/read-all` - Mark all notifications as read
- `GET /api/user/preferences` - Fetch user preferences (creates defaults if missing)
- `POST /api/user/preferences` - Update user preferences

#### Components
- `components/notifications/NotificationsPanel.tsx` - Notification dropdown panel
- `components/settings/SettingsModal.tsx` - Settings modal with tabs
- Updated `components/layout/AppHeader.tsx` - Integrated notifications and settings
- Updated `components/navigation/NavRail.tsx` - Removed Users tab

#### Utilities
- `lib/utils/notifications.ts` - Helper functions for creating notifications
- Integrated notification creation into:
  - Stage progress route
  - Approve route
  - Comments route
  - Final approve route

### Changed

- **Admin Navigation** - Removed "Users" tab (moved to Settings)
- **Header** - Replaced placeholder notification count with real-time unread count
- **Header** - Replaced placeholder settings dropdown with Settings modal
- **User Management** - Moved from `/admin/users` page to Settings modal

### Files Added

- `supabase/21_notifications.sql`
- `supabase/22_user_preferences.sql`
- `app/api/notifications/route.ts`
- `app/api/notifications/[id]/read/route.ts`
- `app/api/notifications/read-all/route.ts`
- `app/api/notifications/unread-count/route.ts`
- `app/api/user/preferences/route.ts`
- `components/notifications/NotificationsPanel.tsx`
- `components/notifications/index.ts`
- `components/settings/SettingsModal.tsx`
- `components/settings/index.ts`
- `lib/utils/notifications.ts`

### Files Modified

- `components/layout/AppHeader.tsx` - Integrated notifications and settings
- `components/navigation/NavRail.tsx` - Removed Users tab
- `app/api/mockups/[id]/stage-progress/[stage_order]/route.ts` - Added notification creation
- `app/api/mockups/[id]/approve/route.ts` - Added notification creation
- `app/api/mockups/[id]/comments/route.ts` - Added notification creation
- `app/api/mockups/[id]/final-approve/route.ts` - Added notification creation
- `app/(dashboard)/admin/users/page.tsx` - Updated to show redirect message

---

## [3.7.2] - 2025-01-XX

### 🐛 **Critical Bugfixes - Annotation Visibility & Permission Enforcement**

Fixed critical bugs that prevented annotations from being visible when drawing and improved permission enforcement for annotations and comments.

### Fixed

#### Search Page Map Error
- **Undefined Array Access** - Fixed "Cannot read properties of undefined (reading 'map')" error in search page
  - Error: TypeError when rendering brand search results
  - Root cause: `brandData.logos`, `logoGroup.formats`, and `brandData.colors` could be undefined when API response structure differs
  - Fix: Added fallback empty arrays (`|| []`) for all `.map()` calls on potentially undefined arrays
  - Impact: Search page now handles edge cases gracefully without crashing
  - Files modified: `app/(dashboard)/search/page.tsx`

#### Brand Fetch API Response Parsing
- **Incorrect Response Structure Handling** - Fixed brand fetch not displaying results
  - Error: Search results not appearing after successful API call
  - Root cause: API returns `{ success: true, data: {...} }` but frontend was using entire response object as data
  - Fix: Extract `result.data` from API response structure and properly handle error responses
  - Impact: Brand search now correctly displays results and shows proper error messages
  - Files modified: `app/(dashboard)/search/page.tsx`, `app/(dashboard)/test-brandfetch/page.tsx`

#### Workflow API Response Parsing
- **Incorrect Response Structure Handling** - Fixed workflows not displaying in admin page and project modals
  - Error: Workflows not appearing after successful API call
  - Root cause: API returns `{ success: true, data: { workflows: [...] } }` but frontend was using entire response object
  - Fix: Extract `result.data.workflows` from API response structure and properly handle error responses
  - Impact: Workflows now correctly display in admin page, new project modal, and edit project modal
  - Files modified: `app/(dashboard)/admin/workflows/page.tsx`, `components/projects/NewProjectModal.tsx`, `components/projects/EditProjectModal.tsx`

#### Template API Response Parsing
- **Incorrect Response Structure Handling** - Fixed templates not displaying in designer and admin pages
  - Error: Templates not appearing after successful API call
  - Root cause: API returns `{ success: true, data: { templates: [...] } }` but frontend was using entire response object
  - Fix: Extract `result.data.templates` from API response structure and properly handle error responses
  - Impact: Templates now correctly display in designer page and admin templates page
  - Files modified: `app/(dashboard)/designer/page.tsx`, `app/(dashboard)/admin/templates/page.tsx`

#### Project API Response Parsing
- **Incorrect Response Structure Handling** - Fixed projects not displaying in gallery and designer pages
  - Error: Projects not appearing after successful API call
  - Root cause: API returns `{ success: true, data: { projects: [...] } }` but frontend was using entire response object
  - Fix: Extract `result.data.projects` from API response structure and properly handle error responses
  - Impact: Projects now correctly display in gallery page and designer page
  - Files modified: `app/(dashboard)/gallery/page.tsx`, `app/(dashboard)/designer/page.tsx`

#### Reports API Response Parsing
- **Incorrect Response Structure Handling** - Fixed reports not displaying in admin reports page
  - Error: Report data not appearing after successful API call
  - Root cause: API returns `{ success: true, data: { reportData: [...], summary: {...} } }` but frontend was using entire response object
  - Fix: Extract `result.data.reportData` and `result.data.summary` from API response structure and properly handle error responses
  - Impact: Reports now correctly display with summary statistics and project data
  - Files modified: `app/(dashboard)/admin/reports/page.tsx`

#### Reviews API Response Parsing
- **Incorrect Response Structure Handling** - Fixed reviews not displaying in reviews page
  - Error: Reviews not appearing after successful API call
  - Root cause: API returns `{ success: true, data: { projects: [...] } }` but frontend was using entire response object
  - Fix: Extract `result.data.projects` from API response structure and properly handle error responses
  - Impact: Reviews now correctly display with pending mockups awaiting review
  - Files modified: `app/(dashboard)/my-stage-reviews/page.tsx`

#### Annotation Visibility Issue
- **Coordinate Transformation** - Fixed annotations not appearing when using annotation tools
  - Error: Annotations were drawn but not visible on canvas
  - Root cause: Pointer coordinates from `getPointerPosition()` were not transformed to account for stage scale and position
  - Fix: Added coordinate transformation in `handleMouseDown` and `handleMouseMove` to convert container coordinates to stage coordinates
  - Uses `getRelativePointerPosition()` if available, otherwise manually transforms: `(pointerPos - stagePosition) / scale`
  - Impact: Annotations now appear correctly at the clicked location, even when canvas is zoomed or panned

#### Permission Enforcement Improvements
- **API Route Permission Checks** - Enhanced permission enforcement in comment creation endpoint
  - Improved reviewer status checking with proper error handling
  - Added logging for permission denials
  - Better error messages explaining why permission was denied
  - Handles edge cases (mockups without projects, errors during reviewer checks)
  - Impact: Only creators and assigned reviewers can create comments/annotations

- **Frontend Permission Checking** - Improved reviewer status detection
  - Added try-catch error handling for reviewer queries
  - Better handling of cases where mockup has no project
  - More robust error recovery
  - Impact: Frontend correctly identifies who can annotate

- **UI Permission Feedback** - Added visual feedback for users without annotation permissions
  - Added warning message in sidebar when user can't annotate
  - Disabled annotation tools (except select) when user lacks permission
  - Disabled color picker and stroke width controls when disabled
  - Added tooltips explaining why tools are disabled
  - Impact: Users get clear feedback about their annotation permissions

### Changed

#### Annotation Toolbar
- **Added `disabled` prop** - AnnotationToolbar now accepts `disabled` prop to disable tools
- **Select tool always enabled** - Select tool remains enabled for panning even when annotations are disabled
- **Visual feedback** - Disabled tools show reduced opacity and cursor-not-allowed

#### MockupDetailSidebar
- **Added `canAnnotate` prop** - Component now receives and displays permission status
- **Warning message** - Shows yellow warning banner when user can't annotate

### Technical Details

#### Files Modified
- `components/collaboration/MockupCanvas.tsx` - Fixed coordinate transformation for annotations
- `app/api/mockups/[id]/comments/route.ts` - Enhanced permission checks and error handling
- `app/(dashboard)/mockups/[id]/page.tsx` - Improved reviewer status checking
- `components/mockups/MockupDetailSidebar.tsx` - Added permission feedback UI
- `components/collaboration/AnnotationToolbar.tsx` - Added disabled state support

#### Coordinate Transformation Formula
```typescript
// Transform container coordinates to stage coordinates
const stagePos = {
  x: (pointerPos.x - stagePosition.x) / scale,
  y: (pointerPos.y - stagePosition.y) / scale
};
```

#### Permission Rules
- **Creators**: Can always annotate and comment on their own assets
- **Reviewers**: Can annotate and comment if assigned as reviewer for the project (any stage)
- **Others**: Cannot annotate or comment; tools are disabled with clear messaging

### Impact
- ✅ **Annotations Now Visible** - Annotations appear correctly when drawing, regardless of zoom/pan state
- ✅ **Proper Permission Enforcement** - Only creators and reviewers can create annotations/comments
- ✅ **Clear User Feedback** - Users see why they can't annotate and which tools are disabled
- ✅ **Better Error Handling** - More robust permission checks with proper error recovery

---

## [3.7.1] - 2025-01-XX

### 🐛 **Critical Bugfixes - Project Loading & Metrics Display**

Fixed critical bugs that prevented projects from loading when clicked and metrics from displaying in the metrics pane.

### Fixed

#### Project Not Found Issue
- **API Route Supabase Client** - Fixed `/api/projects/[id]/route.ts` using client-side `supabase` instead of server-side `supabaseServer`
  - Error: Projects returned "not found" when clicking on active projects
  - Root cause: Client-side Supabase client doesn't have proper authentication context in server-side API routes
  - Fix: Replaced all instances of `supabase` with `supabaseServer` in the API route
  - Impact: Projects now load correctly when clicked from the projects list

#### Metrics Not Loading
- **Response Format Handling** - Fixed frontend components not properly extracting data from API responses
  - Error: Metrics pane showed "No metrics available" even when data existed
  - Root cause: API routes use `successResponse()` which wraps data in `{ success: true, data: {...} }` format
  - Fix: Updated all frontend components to extract data from `result.data?.property` instead of `result.property`
  - Components fixed:
    - `app/(dashboard)/projects/[id]/page.tsx` - Project detail page
    - `components/projects/ProjectMetrics.tsx` - Individual project metrics
    - `components/projects/ActiveProjectsOverview.tsx` - Aggregated metrics overview
  - Impact: Metrics now display correctly in the metrics pane

### Technical Details

#### Files Modified
- `app/api/projects/[id]/route.ts` - Changed all `supabase` imports and calls to `supabaseServer`
- `app/(dashboard)/projects/[id]/page.tsx` - Fixed response data extraction for project, mockups, and reviewers
- `components/projects/ProjectMetrics.tsx` - Fixed metrics response data extraction
- `components/projects/ActiveProjectsOverview.tsx` - Fixed aggregated metrics response data extraction

#### Root Causes
1. **Server-side API routes must use `supabaseServer`** - Client-side `supabase` uses anon key and relies on RLS, which doesn't work correctly in server-side API routes where we manually verify permissions
2. **Consistent response format** - All API routes use `successResponse()` helper which wraps data in `{ success: true, data: {...} }`, but frontend components weren't consistently extracting from the `data` property

### Impact
- ✅ **Projects Load Correctly** - Clicking on active projects now successfully loads project details
- ✅ **Metrics Display** - Metrics pane now shows project metrics and aggregated overview correctly
- ✅ **Consistent API Pattern** - All project API routes now use `supabaseServer` consistently
- ✅ **Proper Response Handling** - Frontend components now correctly handle the standardized API response format

---

## [3.7.0] - 2025-11-09

### Removed

#### AI Features Removal
- **Removed all AI-powered features** for simplification and stability
  - Removed automated visual tagging
  - Removed text recognition (OCR)
  - Removed color palette extraction
  - Removed accessibility analysis
  - Removed semantic search
  - Removed visual similarity search
  - Removed folder suggestions
  - Removed AI onboarding tour
- **Database Changes**
  - Dropped `mockup_ai_metadata` table
  - Dropped `folder_suggestions` table
  - Dropped `search_queries` table
  - Removed pgvector extension (if not used elsewhere)
- **Code Cleanup**
  - Removed all AI API routes (`/api/ai/*`)
  - Removed all AI components (`components/ai/*`)
  - Removed all AI library functions (`lib/ai/*`)
  - Removed AI hooks (`useAIMetadata`)
  - Removed AI types (`types/ai.ts`)
  - Removed AI context (`AIContext`)
  - Removed OpenAI package dependency

---

## [3.6.0] - 2025-10-28

### 🎉 **MAJOR FEATURE - User-Level Approval Tracking & Final Approval System**

Complete overhaul of the approval workflow system to track individual reviewer approvals instead of aggregate stage approvals. All assigned reviewers must now approve before a stage advances, with project owners giving final approval after all stages complete.

### Added

#### Database Layer (Migration 18)
- **New Table: `mockup_stage_user_approvals`**
  - Tracks each individual reviewer's approval/rejection per stage
  - Unique constraint ensures one approval per user per stage per asset
  - Stores reviewer details (user_id, user_name, user_email, user_image_url)
  - Records action type ('approve' or 'request_changes') with optional notes
  - Indexed for performance on asset_id, project_id, user_id, and stage_order

- **Enhanced `mockup_stage_progress` Table**
  - Added `approvals_required` column (count of assigned reviewers)
  - Added `approvals_received` column (count of completed approvals)
  - Enables progress tracking (e.g., "2 of 3 approved")

- **Enhanced `assets` Table**
  - Added `final_approved_by` column (project owner user_id)
  - Added `final_approved_at` timestamp
  - Added `final_approval_notes` for owner's final comments

- **New Stage Status: `pending_final_approval`**
  - Added to `stage_status` enum
  - Set when all workflow stages complete, awaiting owner sign-off

- **Seven New Database Functions**
  - `count_stage_reviewers(project_id, stage_order)` - Counts reviewers assigned to a stage
  - `check_stage_approval_complete(asset_id, stage_order)` - Verifies all reviewers have approved
  - `increment_stage_approval_count(asset_id, stage_order)` - Atomically increments approval count
  - `record_final_approval(asset_id, user_id, user_name, notes)` - Records owner's final approval
  - Updated `initialize_mockup_stage_progress()` - Now sets approvals_required count
  - Updated `advance_to_next_stage()` - Handles final approval state when reaching last stage
  - Updated `reset_to_first_stage()` - Resets approval counts

#### API Layer
- **POST `/api/mockups/[id]/approve`** - Individual reviewer approval endpoint
  - Verifies user is assigned reviewer for current stage
  - Prevents duplicate approvals (one per user per stage)
  - Records approval in mockup_stage_user_approvals table
  - Increments approval count
  - Auto-advances to next stage when all reviewers approve
  - Sets `pending_final_approval` status after last stage

- **POST `/api/mockups/[id]/final-approve`** - Project owner final approval endpoint
  - Restricted to project creator or organization admin
  - Only available when status is `pending_final_approval`
  - Records final approval in assets table
  - Marks asset as fully approved

- **GET `/api/mockups/[id]/approvals`** - Approval data endpoint
  - Fetches all user approvals grouped by stage
  - Returns progress summary with approval counts per stage
  - Includes final approval data if present
  - Returns chronological approval timeline

#### UI Components
- **`ApprovalStatusBanner`** - Current stage approval progress display
  - Shows "X of Y approved" with progress bar
  - Lists all reviewers with status icons (✓ approved, ⏱ pending, ✗ changes requested)
  - Approve / Request Changes buttons for assigned reviewers
  - Shows if current user has already approved
  - Collapsible design with stage color coding
  - Integrated into mockup detail page context panel

- **`ApprovalTimelinePanel`** - Complete approval history view
  - Chronological timeline of all approvals across all stages
  - User avatars, names, and relative timestamps
  - Stage badges with workflow colors
  - Visual distinction between approve and request-changes actions
  - Displays reviewer notes
  - Special section for final approval with crown icon
  - Stage progress summary at bottom
  - Accessible via "Approvals" tab in mockup detail page

- **`FinalApprovalBanner`** - Owner approval interface
  - Crown icon with purple/blue gradient styling
  - Shows total stages completed
  - Optional notes input for owner's final comments
  - "Give Final Approval" button with gradient design
  - "What happens next?" helper text
  - Collapsible design
  - Only visible to project owner when all stages complete

- **Enhanced `ReviewListItem`** - Quick approve from dashboard
  - Added "Quick Approve" button to review list items
  - Shows "Approved" badge after user approves
  - Loading state during approval submission
  - Prevents duplicate approvals
  - Integrated into My Stage Reviews dashboard

- **Updated `StageStatusPill`**
  - Added `pending_final_approval` status configuration
  - Purple color scheme with crown icon (👑)
  - Label: "Pending Final Approval"

#### Email Notifications (4 New Templates)
- **User Approval Progress Notification**
  - Sent to other pending reviewers when someone approves
  - Shows progress bar with approval counts
  - Encourages completion of pending reviews
  - Direct link to mockup

- **Stage Complete Notification**
  - Sent to next stage reviewers when previous stage completes
  - Shows stage progression (Stage 1 ✓ → Stage 2)
  - Confirms all previous reviewers approved
  - Direct link to review

- **Final Approval Needed Notification**
  - Sent to project owner when all stages complete
  - Crown icon with premium styling
  - Emphasizes owner's final authority
  - Shows all X stages completed
  - Direct link to give final approval

- **Final Approval Complete Notification**
  - Sent to all stakeholders (creator, reviewers, collaborators)
  - Celebration styling with checkmark list
  - Confirms asset ready for production
  - Shows approval by project owner
  - Direct link to view approved asset

#### Documentation
- **`documentation/APPROVAL_SYSTEM.md`** - Comprehensive 600+ line documentation
  - Complete system overview and architecture
  - Database schema details with code examples
  - All database functions with signatures
  - API endpoint reference with request/response examples
  - UI component documentation with props
  - Email notification specifications
  - Workflow examples for common scenarios
  - Setup instructions and troubleshooting guide
  - TypeScript interface reference
  - Future enhancement ideas

- **`supabase/fix_approval_counts.sql`** - Utility script
  - Fixes "0 of 0 approved" issue for existing assets
  - Diagnostic queries to identify affected records
  - UPDATE statement to fix approval counts
  - Verification queries
  - Alternative re-initialization method
  - Usage notes and troubleshooting

### Changed

#### Workflow Logic (Breaking Change)
- **"All Must Approve" replaces "Any One Reviewer"**
  - Previously: Any single reviewer could advance a stage
  - Now: ALL assigned reviewers must approve before stage advances
  - More rigorous approval process
  - Better audit trail with individual accountability

- **Project Owner Final Approval Required**
  - Previously: Assets were "approved" after last workflow stage
  - Now: Assets enter `pending_final_approval` status
  - Project owner must explicitly give final sign-off
  - Owner's approval is the definitive authorization

- **Request Changes Resets Approval Counts**
  - When any reviewer requests changes, stage resets
  - All approval counts reset to 0
  - Process starts over from current stage
  - Ensures all reviewers re-approve after changes

#### UI Updates
- **Removed AI Insights Tab** (per user request)
  - Removed from mockup detail page right panel
  - Kept "Analyze with AI" button in context panel
  - Streamlined focus on Comments and Approvals

- **Removed Timestamps from Review List** (per user request)
  - Removed "about X hours" display
  - Cleaner, more compact review list items

### Fixed

- **Missing `Check` Icon Import**
  - Added Check icon to mockups/[id]/page.tsx imports
  - Fixed Vercel build error: "Cannot find name 'Check'"

- **Missing `pending_final_approval` Status**
  - Added status configuration to StageStatusPill component
  - Fixed TypeScript error: "Property 'pending_final_approval' does not exist"

- **Missing `Sparkles` Icon Import**
  - Re-added Sparkles icon for "Analyze with AI" button
  - Fixed build error after AI tab removal

- **Migration 18 Parameter Naming Conflict**
  - Added DROP FUNCTION before CREATE OR REPLACE
  - Fixed PostgreSQL error 42P13: "cannot change name of input parameter"
  - Function parameter renamed from p_mockup_id to p_asset_id

### Migration Required

**⚠️ IMPORTANT**: Migration 18 must be run before approval system will work

```sql
-- Run in Supabase SQL Editor
supabase/18_user_level_approvals.sql
```

**Post-Migration Fix** (for existing assets):
```sql
-- Run after migration 18 to fix "0 of 0 approved" display
supabase/fix_approval_counts.sql
```

### Technical Implementation Phases

1. **Phase 1-3: Database & API** (Backend foundation)
   - Created migration 18 with new tables and columns
   - Added 7 database functions
   - Created 3 new API endpoints
   - Updated TypeScript interfaces

2. **Phase 4-5: UI Components** (Approval interfaces)
   - Built ApprovalStatusBanner, ApprovalTimelinePanel, FinalApprovalBanner
   - Integrated into mockup detail page with state management
   - Added "Approvals" tab to right panel

3. **Phase 6: Dashboard Integration** (Quick approve)
   - Enhanced ReviewListItem with quick approve button
   - Wired up approval tracking in MyStageReviewsPage
   - Added approved state management

4. **Phase 7: Email Notifications** (Communication)
   - Created approval-notifications.ts module
   - Implemented 4 notification types
   - Professional HTML templates with responsive design

5. **Phase 8: Documentation** (Knowledge base)
   - Comprehensive APPROVAL_SYSTEM.md
   - Fix utility script for existing assets
   - Complete API and component reference

### Deployment Notes

1. Run migration 18 in Supabase
2. Run fix_approval_counts.sql for existing assets
3. Configure SendGrid (email notifications)
4. Deploy to Vercel (environment variables required)
5. Test complete approval workflow end-to-end

### Breaking Changes

- **Approval Logic Change**: Assets now require ALL reviewers to approve (not just one)
- **Final Approval Required**: Project owner must give final approval after all stages
- **API Changes**: New endpoints required for approval functionality
- **Database Schema**: Migration 18 adds new tables and columns

### Known Issues

- Existing assets show "0 of 0 approved" until fix_approval_counts.sql is run
- Email notifications require SendGrid API key configuration
- Final approval only available to project creator or org admin

---

## [3.5.1] - 2025-10-28

### 🐛 **Critical Bugfixes - Column Name Mismatches After Migration 13**

Fixed multiple critical bugs caused by incomplete column renaming after the database modernization in v3.5.0.

### Fixed

#### Templates API
- **Column name error** - Fixed templates API using wrong column name for ordering
  - Error: `column templates.name does not exist`
  - Fix: Changed `.order('name')` to `.order('template_name')` in `/api/templates/route.ts`
  - Template loading now works correctly

#### Asset Save Functionality
- **Column name mismatch** - Fixed asset save attempting to use new column names on old schema
  - Migration 13 renamed table `card_mockups` → `assets` but didn't rename columns
  - Code incorrectly tried to use: `name`, `brand_id`, `preview_url`, `canvas_data`
  - Table actually has: `mockup_name`, `logo_id`, `mockup_image_url`, `logo_x/y/scale`
  - Reverted to use correct original column names
  - Asset saving now works correctly

#### Stage Progress Trigger
- **Orphaned column reference** - Fixed trigger functions still referencing old column name
  - Migration 13 renamed `mockup_id` → `asset_id` in `mockup_stage_progress` table
  - Trigger function `initialize_mockup_stage_progress()` still used `mockup_id`
  - Error: `column "mockup_id" does not exist`
  - Created migration 17 to update three trigger functions:
    - `initialize_mockup_stage_progress()` - Auto-creates progress when mockup assigned to project
    - `advance_to_next_stage()` - Moves mockup to next workflow stage
    - `reset_to_first_stage()` - Resets mockup back to stage 1
  - Workflow assignment now works correctly

#### Server-Side API Architecture
- **Client-side Supabase issues** - Moved mockup save to server-side API route
  - Client-side Supabase had environment variables baked into JS bundle at build time
  - Created `/api/mockups` POST endpoint for server-side saves
  - Server-side routes use runtime environment variables (always correct)
  - Prevents stale environment variable issues in deployed builds

### Added

#### Database Migration
- **Migration 17** (`supabase/17_fix_stage_progress_trigger.sql`)
  - Updates trigger functions to use `asset_id` instead of `mockup_id`
  - Fixes workflow assignment failures
  - Must be run manually in Supabase dashboard

#### API Routes
- **POST /api/mockups** - Server-side mockup save endpoint
  - Handles image upload to Supabase Storage
  - Saves mockup metadata to database
  - Uses correct environment variables at runtime
  - Includes comprehensive error logging

#### Documentation
- **FIX_STAGE_PROGRESS_TRIGGER.md** - Migration instructions for trigger fix

### Technical Details

#### Root Causes
1. **Incomplete migration** - Migration 13 renamed tables but not columns, causing schema assumptions to be wrong
2. **TypeScript interfaces misleading** - Modern interfaces defined ideal column names that didn't match actual schema
3. **Trigger not updated** - Migration 13 renamed columns in one table but didn't update dependent trigger functions
4. **Build-time env vars** - `NEXT_PUBLIC_*` variables baked into JS bundle, causing wrong Supabase URL in client code

#### Files Modified
- `app/api/templates/route.ts` - Fixed column name in ORDER BY
- `app/(dashboard)/designer/page.tsx` - Changed to use `/api/mockups` endpoint, added detailed error logging
- `app/api/mockups/route.ts` - New server-side save endpoint

#### Files Added
- `supabase/17_fix_stage_progress_trigger.sql` - Trigger function fixes
- `FIX_STAGE_PROGRESS_TRIGGER.md` - Migration documentation

### Deployment Instructions

1. **Migration 17 required** - Must run in Supabase dashboard SQL editor
   - Fixes workflow assignment errors
   - Updates three trigger functions to use `asset_id`
2. **Redeploy application** - Vercel will rebuild with updated code
   - Templates now load correctly
   - Asset saving now works
   - Server-side mockup saves prevent env var issues

---

## [3.5.0] - 2025-10-28

### 🚀 **MAJOR UPDATE - Database Modernization & Terminology Cleanup (Partially Complete)**

Major database modernization implementing new terminology and preparing for Next.js 15 features. This release completes Phase 1 (Routes) and partially implements Phase 2 (Terminology) and Phase 3 (Database) of the v3.5.0 modernization plan.

### ✅ Completed

#### Phase 1: Critical Route Fixes & Navigation (100% Complete)
- **Routes renamed successfully:**
  - `/app/(dashboard)/card-designer/` → `/app/(dashboard)/designer/`
  - `/app/(dashboard)/mockup-library/` → `/app/(dashboard)/gallery/`
  - Created `/app/(dashboard)/brands/`
  - Deleted old routes: `/card-library/` and `/card-upload/`
- **Navigation updated:** NavRail correctly points to new routes
- **Icon fix:** Replaced invalid `Gallery` icon with `Images` from lucide-react

#### Phase 3: Database Migration (Partial - 30% Complete)
- **Migration 13 created** (`supabase/13_terminology_cleanup.sql`)
  - Renames `card_mockups` table to `assets`
  - Renames `card_templates` table to `templates`
  - Renames columns: `mockup_count` → `asset_count`, `mockup_id` → `asset_id`
  - Creates backward compatibility views with INSTEAD OF triggers
  - Updates all indexes and constraints to match new names
  - Includes migration tracking table
- **TypeScript types updated** (`lib/supabase.ts`)
  - Added new interfaces: `Asset`, `Template`, `AssetWithProgress`, `AssetAIMetadata`
  - Deprecated old interfaces but kept for compatibility
  - Updated storage bucket constants
- **Database queries updated:**
  - Updated all dashboard pages to use new table names
  - Updated 16 API route files to use `assets` and `templates`
  - Updated utility libraries (`lib/folders.ts`)
  - Build tested and passing

### ⚠️ In Progress / Incomplete

#### Phase 2: Terminology Standardization (15% Complete)
- Component renaming NOT completed (LogoCard, BrandDetailModal still exist)
- Variable renaming NOT done (selectedLogo, mockups still used)
- Component organization incomplete (no barrel exports)

#### Phase 4-7: Not Started
- Next.js 15 modernization (Server Components, Server Actions)
- Component organization
- Error handling & UX improvements
- Documentation updates

### Changed

#### Database
- Table `card_mockups` → `assets` (with compatibility view)
- Table `card_templates` → `templates` (with compatibility view)
- All related columns and foreign keys updated

#### TypeScript
- New modern interfaces with deprecated aliases for backward compatibility
- Updated storage bucket constants with aliases

#### API Routes
- All 16 API routes updated to use new table names
- Folder utility functions updated

### Technical Notes
- **Database compatibility:** Views with triggers ensure existing code continues working
- **TypeScript compatibility:** Old interfaces deprecated but still available
- **Build status:** Successful with all changes
- **Migration rollback:** Instructions included in migration file

### Next Steps
- Complete terminology cleanup in UI components
- Implement Next.js 15 Server Components
- Add Server Actions for data operations
- Complete component reorganization
- Add loading/error states

---

## [3.4.1] - 2025-10-28

### 🐛 **CRITICAL FIX - Multi-Tenancy Bug for All Brand-Related Tables**

Fixed a critical multi-tenancy bug that affected multiple tables and prevented true multi-tenant data isolation.

### Fixed

#### Database Schema Issues
- **Missing organization_id column on 6 tables** - Added the missing `organization_id` column to:
  - `brands` - Main brand storage
  - `card_mockups` - Mockup records
  - `card_templates` - Template backgrounds
  - `logo_variants` - Logo files and variants
  - `brand_colors` - Brand color palettes
  - `brand_fonts` - Brand typography
  - This column was referenced throughout the application code and in migration 04 indexes but was never actually created
  - Migration 04 created indexes referencing `organization_id` but the column didn't exist, causing silent failures
- **Global unique constraint** - Removed the global unique constraint on `brands.domain` column only
  - Old constraint: `brands_domain_key UNIQUE (domain)` - prevented ANY organization from saving a duplicate domain
  - This incorrectly blocked different organizations from saving the same brand (e.g., Nike, Spotify)
- **Multi-tenant constraint** - Added new composite unique constraint on `(domain, organization_id)`
  - New constraint: `brands_domain_organization_key UNIQUE (domain, organization_id)`
  - Allows different organizations to independently save and manage the same brand
  - Prevents duplicate brands within the same organization (as intended)
- **Failed indexes recreated** - Recreated all indexes from migration 04 that originally failed
  - Composite indexes on (created_by, organization_id) for mockups, templates, and brands
  - Individual organization_id indexes for all 6 affected tables

### Added

#### Database Migration
- **Migration 12** (`supabase/12_fix_brands_multi_tenancy.sql`)
  - Adds organization_id column to 6 tables (brands, card_mockups, card_templates, logo_variants, brand_colors, brand_fonts)
  - Drops global unique constraint on brands.domain
  - Adds composite unique constraint (domain, organization_id) for true multi-tenancy
  - Recreates all failed indexes from migration 04 with proper organization_id support
  - Creates additional organization_id indexes for query performance
  - Preserves existing data while fixing schema (with cleanup options)
  - Includes detailed comments, verification queries, and rollback instructions

#### Documentation
- **Testing Guide** (`supabase/12_TESTING_GUIDE.md`)
  - Step-by-step testing instructions for the migration
  - Verification queries to confirm schema changes across all 6 tables
  - Multi-tenant save testing procedures
  - Success criteria checklist
  - Rollback instructions if needed

### Impact

#### Before Fix
- ❌ Only ONE organization could save a brand domain (e.g., "nike.com")
- ❌ Second organization attempting to save the same brand would get error: `duplicate key value violates unique constraint "brands_domain_key"`
- ❌ Multi-tenancy was broken across all 6 brand-related tables
- ❌ organization_id column was referenced in code and indexes but didn't exist on any table
- ❌ Migration 04 indexes silently failed during creation
- ❌ Data inserts may have succeeded without organization isolation
- ❌ Queries couldn't filter by organization_id efficiently (no indexes)

#### After Fix
- ✅ Different organizations can independently save the same brand
- ✅ Example: Organization A can save Nike, Organization B can also save Nike
- ✅ Each organization maintains its own isolated data across all tables
- ✅ Duplicate prevention still works within the same organization
- ✅ True multi-tenant isolation for brands, mockups, templates, variants, colors, and fonts
- ✅ All indexes now exist and function properly for query performance
- ✅ Data is properly scoped to organizations going forward

### Technical Details

#### Root Cause
1. The `organization_id` column was assumed to exist on 6 tables but was never created
2. Migration 04 (line 23-25) created indexes referencing organization_id, but the column didn't exist
3. These index creations silently failed, leaving the database without proper multi-tenant indexes
4. The unique constraint on brands table was created without multi-tenancy in mind (domain-only instead of domain+organization_id)
5. Application code tried to insert organization_id throughout but the column didn't exist on any table
6. Data inserts may have silently failed or succeeded without organization_id, creating orphaned records

#### Files Added/Modified
- ✨ `supabase/12_fix_brands_multi_tenancy.sql` - New comprehensive migration
- ✨ `supabase/12_TESTING_GUIDE.md` - New testing documentation
- 📝 `CHANGELOG.md` - Version 3.4.1 documentation with detailed impact analysis
- 📝 `README.md` - Updated migration list and version history
- 📝 `package.json` - Version bump to 3.4.1

### Deployment Instructions

1. **Run Migration 12** in Supabase SQL Editor
   - Copy contents of `supabase/12_fix_brands_multi_tenancy.sql`
   - Paste into Supabase Dashboard → SQL Editor
   - Click "Run" to execute all statements
2. **Verify Schema Changes** using provided verification queries
   - Check all 6 tables have organization_id column
   - Verify composite unique constraint exists on brands table
   - Confirm all indexes were created successfully
3. **Test Multi-Tenant Saving** in two different organizations
   - Save same brand (e.g., Spotify) in Org 1 - should succeed
   - Switch to Org 2 and save Spotify again - should now succeed (previously failed)
   - Try saving Spotify again in Org 2 - should fail (duplicate within same org)
4. **Clean up legacy data** (optional, recommended for test environments)
   - Delete records without organization_id: `DELETE FROM brands WHERE organization_id IS NULL;`
   - Repeat for other tables if needed (mockups, templates, variants, colors, fonts)

---

## [3.4.0] - 2025-10-27

### 🎨 **Project List UX Improvements**

Minor UI refinements to improve project list readability and provide better project management workflow.

### Added
- **"Add Assets" button on project detail page** - Blue CTA button in header to navigate to mockup library for easy asset assignment

### Changed

#### Project List Display
- **Client-centric display** - Client name now shown as primary (bold) text with project name as secondary detail
- **Cleaner list layout** - Removed asset count and project icons from list rows for more compact, focused display
- **Improved column alignment** - Fixed header alignment for STATUS and ACTIONS columns
  - STATUS column: Added fixed `w-24` width
  - ACTIONS column: Added fixed `w-[120px]` width and removed right-align
  - Perfect vertical alignment between headers and content

### Technical
- Modified `components/lists/ProjectListItem.tsx` - Client name display, removed icon, fixed column widths
- Modified `components/lists/ListToolbar.tsx` - Column header alignment, removed icon space
- Modified `app/(dashboard)/projects/[id]/page.tsx` - Added "Add Assets" button

---

## [3.3.0] - 2025-10-26

### 🎨 **Major UI/UX Improvements Release**

Comprehensive UI refinements focusing on navigation consistency, improved user experience, and brand-focused terminology.

### Added

#### Navigation & Layout Improvements
- **GmailLayout integration across all pages** - Consistent three-panel layout throughout the app
- **NavRail on project detail pages** - Fixed missing navigation on project detail views
- **Context panel for Stage Reviewers** - Moved stage reviewers to collapsible side panel for better space usage
- **User full name display** - Shows first and last name in header for better user context
- **Brand Library quick access** - Added "View Library" button to mockup library context panel

#### UI Refinements
- **Workflow color legend repositioned** - Moved to top of workflow board for better visibility
- **Vertical stage reviewer layout** - Changed from horizontal to vertical stacking for better space efficiency
- **Search bar labeling** - Added "Filter or add:" label to project mockup search
- **Button consistency improvements** - Standardized button naming and ordering in context panels

### Changed

#### Terminology Updates
- **"Logo" → "Brand" throughout UI** - Comprehensive terminology change for consistency:
  - "Search Logos" → "Search Brands"
  - "Logo Library" → "Brand Library"
  - "Upload Logo" → "Upload Brand"
  - "logo variants" → "brand variants"
  - All related UI text updated to brand-centric language

### Fixed
- **Scrolling issues** - Fixed inability to scroll on search and project detail pages
- **Missing Library icon import** - Added missing import in mockup-library page
- **Duplicate UserButton** - Removed duplicate Clerk button from NavRail
- **Context panel positioning** - Fixed gap between NavRail and context panel

---

## [3.2.1] - 2025-10-25

### 🐛 **Critical Deployment & Runtime Fixes**

Fixed multiple deployment and runtime issues that prevented AI features from working in production on Vercel.

### Fixed

#### Deployment & Build Issues
- **Lazy initialization for Supabase clients** - Fixed "supabaseUrl is required" build errors
  - Both `/lib/supabase.ts` and `/lib/supabase-server.ts` now use lazy initialization
  - Prevents environment variable validation during build phase
  - Clients are only created when first accessed at runtime
  - Uses JavaScript Proxy pattern for backward compatibility

#### Runtime Errors
- **AIProvider context initialization** - Fixed "AI Provider not found within an AIProvider" error
  - Added AIProvider wrapper to dashboard layout
  - All AI components can now properly use the `useAI()` hook
  - Enables AI features on mockup detail pages

#### UI Component Fixes
- **Badge onClick functionality** - Wrapped Badge in button for proper click handling
- **ColorPalette null checks** - Added safety checks in TagDisplay component
- **Missing dependencies** - Added date-fns package for time formatting
- **Function name corrections** - Fixed incorrect function names from AIContext

### Vercel-Specific Fixes
- **Environment variable scoping** - Documentation for Production vs Preview environments
  - Vercel requires enabling variables for "Preview" scope for branch deployments
  - Fixed issue where feature branches couldn't access production-only variables
  - Clear instructions for Vercel dashboard configuration

### Technical Details
- Uses Proxy pattern to defer Supabase client initialization
- Maintains 100% backward compatibility with existing code
- No changes needed in API routes or components
- Build succeeds even without environment variables present

---

## [3.2.0] - 2025-10-25

### 🚀 **AI-Powered Features - Phase 1 Release**

Major release introducing comprehensive AI capabilities for intelligent mockup management, powered by OpenAI and Google Vision APIs.

### Added

#### Core AI Features

##### 🏷️ **Automated Visual Tagging**
- Google Vision API integration for automatic tag generation
- Extracts visual elements, composition, brands, and objects
- Confidence scoring (0-1 scale) for tag reliability
- Categories: Visual, Colors, Composition, Brands, Objects

##### 📝 **Text Recognition (OCR)**
- Automatic text extraction from mockup images
- Google Vision API-powered OCR
- Searchable extracted text stored in database

##### 🎨 **Color Palette Extraction**
- Identifies dominant, accent, and neutral colors
- Provides hex values and percentage distribution
- Visual color swatches in UI

##### ♿ **Accessibility Analysis**
- WCAG compliance level detection (A, AA, AAA)
- Contrast ratio analysis for text readability
- Readability scoring (0-100 scale)
- Issue severity classification (error/warning/info)
- Actionable improvement suggestions

##### 🔍 **Semantic Search**
- Natural language query understanding
- OpenAI text-embedding-3-small (1536-dimensional vectors)
- Hybrid search combining vector similarity and full-text search
- Search modes: AI (semantic), Exact (traditional), Visual (similarity)
- Keyboard shortcut: Cmd+K for quick access

##### 👁️ **Visual Similarity Search**
- Find mockups with similar visual characteristics
- Adjustable similarity threshold (50-100%)
- Real-time similarity percentage display
- "Find Similar" button on mockup detail pages

##### 📁 **Intelligent Folder Suggestions**
- AI-powered folder recommendations based on content
- Confidence scoring with explanations
- User feedback system (thumbs up/down)
- Learning from user decisions

##### 🎯 **Interactive Onboarding**
- Spotlight tour for new AI features
- 7-step guided introduction
- Skip option for experienced users
- Persistent completion tracking

#### Technical Infrastructure

##### Database Enhancements
- **pgvector extension** for vector similarity search
- **New tables**:
  - `mockup_ai_metadata` - Stores AI analysis results
  - `folder_suggestions` - Tracks AI recommendations
  - `search_queries` - Analytics and learning
- **IVFFlat index** for fast similarity search (lists=10)
- **RPC functions** for complex vector operations

##### API Endpoints
- `/api/ai/analyze` - Visual analysis and tagging
- `/api/ai/search` - Semantic search
- `/api/ai/similar` - Visual similarity search
- `/api/ai/suggest-folder` - Folder recommendations

##### UI Components
- **AISearchBar** - Advanced search with mode toggle
- **TagDisplay** - Visual tag presentation
- **AccessibilityScore** - WCAG compliance visualization
- **SimilarMockupsModal** - Similar mockup browser
- **ColorSwatch** - Color palette display
- **ConfidenceBar** - Confidence score visualization
- **AIOnboardingTour** - Feature introduction

#### Configuration
- AI models configurable via `/lib/ai/config.ts`
- Retry logic with exponential backoff
- Error handling and fallbacks
- Rate limiting awareness

### Environment Variables Required
```env
# AI Features (Required for v3.2.0+)
OPENAI_API_KEY=sk-proj-...
GOOGLE_VISION_API_KEY=AIza...
```

### Database Migration
- Run migration `11_ai_features.sql`
- Enables pgvector extension
- Creates AI-related tables and indexes
- Adds vector similarity RPC functions

### Performance
- Async processing for non-blocking UI
- Optimized vector indexing (IVFFlat)
- Caching for repeated searches
- Lazy loading of AI components

---

## [3.1.8] - 2025-10-25

### 🎨 **UX Improvement - Stage Reviewers Default Collapsed**

Improved project detail page initial load by collapsing the Stage Reviewers section by default to save vertical space.

### Changed

#### Stage Reviewers Component
- **Default state changed to collapsed** - Section now starts collapsed instead of expanded
  - Changed `useState(true)` → `useState(false)` on line 42
  - Saves additional vertical space on project detail page load
  - Users can still expand when needed by clicking the header
  - Aligns with v3.1.7's compact UI optimization goals

### Benefits
- ✅ **Cleaner initial view** - More focus on workflow board at first glance
- ✅ **Space savings** - Collapsed by default saves ~120px of vertical space
- ✅ **Progressive disclosure** - Show reviewer management only when needed
- ✅ **Consistent with optimization** - Continues the compact UI improvements from v3.1.6-3.1.7

---

## [3.1.7] - 2025-01-25

### 🎨 **Workflow Board Optimization & UI Cleanup**

Streamlined the project detail page by making workflow board cards more compact and removing redundant mockup listing.

### Changed

#### Workflow Board - Compact Cards
- **Reduced card width** - 320px (w-80) → 224px (w-56) for ~30% space savings
- **Smaller thumbnails** - Proportionally reduced while maintaining aspect-[3/2] ratio
- **Tighter spacing throughout**
  - Stage headers: px-4 py-3 → px-3 py-2
  - Card content: p-3 → p-2
  - Text sizes reduced to xs for better density
- **More mockups visible** - Can see more workflow stages and cards per screen

#### Stage Reviewers - Collapsible Section
- **Added chevron toggle** - ChevronDown/ChevronUp icons in header
- **Clickable header** - Entire header acts as collapse/expand button
- **Smooth transitions** - Stage cards show/hide with clean animation
- **Default expanded** - Opens expanded for easy access
- **Hover state** - Visual feedback on header for better UX

#### Project Detail Page - Removed Redundant Grid
- **Deleted mockup grid section** - No longer shows duplicate mockup listing at bottom
- **Cleaner page structure** - Only shows: Header → Stage Reviewers → Workflow Board
- **Code cleanup**
  - Removed unused state: `filteredMockups`
  - Removed unused functions: `handleDeleteMockup`, search filter effect
  - Removed unused imports: Download, Trash2, ExternalLink, Edit2, Calendar
- **Simple empty state** - Shows only when project has no workflow and no mockups
- **Bundle size reduction** - Project detail page: 6.86 kB → 6.38 kB

### Benefits
- ✅ **30% smaller workflow cards** - More content visible without scrolling
- ✅ **Collapsible reviewers** - Save space when not actively managing assignments
- ✅ **Eliminated redundancy** - Workflow board is now the single source of truth
- ✅ **Cleaner codebase** - Removed ~90 lines of unused code
- ✅ **Better focus** - Page dedicated to workflow progress, not general mockup browsing

---

## [3.1.6] - 2025-01-25

### 🎨 **Compact UI Redesign - Project Detail Page**

Major UX improvement that reduces header area by ~40% while improving information density and readability.

### Changed

#### Project Header - Very Compact Layout
- **Reduced vertical height** from ~120px to ~80px
- **Single-line project identity**
  - Compact title (text-xl instead of text-3xl)
  - Inline client name, workflow badge, status pill, and metadata
  - All key information visible without scrolling
- **Smart progress stats** - Auto-calculated from mockup data
  - "3 in review • 2 approved • 1 changes" display
  - Real-time aggregation of mockup workflow status
  - Only shows relevant stats (hides zeros)
- **Workflow badge** - Purple pill showing assigned workflow name
- **Compact date format** - "Oct 25" instead of "Created October 25, 2025"
- **Inline search** - Search input moved to same line as description
- **Better responsive behavior** - Wraps gracefully on smaller screens

#### Stage Reviewers - Horizontal Compact View
- **Reduced vertical height** from ~300px to ~120px
- **Compact header** - Single line (14px height) instead of multi-line section
- **Horizontal scrollable layout** - Stages in row instead of grid
- **Compact stage cards** - 224px width with minimal padding
- **Avatar stack display** - First 3 reviewers visible with "+N" badge
- **Smaller stage headers** - Reduced from medium to xs/sm text sizes
- **Efficient reviewer list** - Scrollable area within each card
- **Tighter spacing** - Reduced padding throughout (p-3 instead of p-6)

### Technical

#### Files Modified
- `app/(dashboard)/projects/[id]/page.tsx`
  - Added `progressStats` calculation (lines 155-175)
  - Added `formatCompactDate()` helper function
  - Redesigned header layout (lines 184-280)
  - Reduced padding: py-6 → py-3
  - Reduced title: text-3xl → text-xl
  - Inline metadata display with flex-wrap
- `components/projects/ProjectStageReviewers.tsx`
  - Compact header (lines 127-134)
  - Horizontal scrollable stage cards (lines 136-251)
  - Avatar stack implementation
  - Reduced card width: responsive grid → fixed 224px
  - Reduced text sizes: text-lg/text-sm → text-xs

### Benefits
- ✅ **~220px vertical space saved** - More content visible without scrolling
- ✅ **Better information density** - All key metrics at a glance
- ✅ **Improved workflow visibility** - Workflow name and progress stats prominent
- ✅ **Cleaner visual hierarchy** - Related items grouped inline
- ✅ **Faster comprehension** - Less eye movement, more efficient scanning
- ✅ **Responsive design** - Maintains usability on different screen sizes

---

## [3.1.5] - 2025-01-25

### 🐛 **Bugfix - Reviewer Display After Assignment**

Critical bugfix that fixes assigned reviewers not appearing in the UI due to API response property name mismatch.

### Fixed

#### Reviewer Data Fetching
- **ProjectStageReviewers Component** - Fixed property name mismatch in reviewer fetch
  - API returns: `{reviewers: [...]}`
  - Component was looking for: `{stage_reviewers: [...]}`
  - Changed component to use correct property name
  - Assigned reviewers now display immediately after assignment

#### Workflow Array Handling in POST
- **Add Reviewer Validation** - Fixed workflow data handling in POST endpoint
  - Added same array/object detection logic for workflows in POST endpoint
  - Prevents validation errors when adding reviewers
  - Ensures stage validation works correctly

### Technical

#### Root Cause
- GET `/api/projects/[id]/reviewers` returns `{reviewers: groupedReviewers}`
- Component `fetchStageReviewers()` was accessing `data.stage_reviewers`
- Property mismatch caused reviewers to never populate after fetch
- Reviewers were being saved to database but not displayed in UI

#### Solution
- Changed line 54 in ProjectStageReviewers.tsx: `data.stage_reviewers` → `data.reviewers`
- Added workflow array handling in POST endpoint (lines 146-147)

### Impact
- ✅ **Reviewers Display Correctly** - Assigned reviewers now show up in stage cards
- ✅ **Real-time Updates** - Reviewers appear immediately after assignment
- ✅ **Proper Validation** - Stage validation works when adding reviewers
- ✅ **Complete Feature** - Reviewer assignment now fully functional end-to-end

---

## [3.1.4] - 2025-01-25

### 🐛 **Bugfix - Organization Member Display**

Critical bugfix that fixes "undefined undefined" appearing in the reviewer selection dropdown by correcting the data structure mismatch between the API and UI component.

### Fixed

#### Member Data Structure
- **AddStageReviewerModal Interface** - Fixed mismatch between API response and component expectations
  - API returns: `{name, email, avatar, role}`
  - Component was expecting: `{firstName, lastName, emailAddresses[], imageUrl}`
  - Updated component to use correct property names from API
  - Reviewer names now display correctly in dropdown

### Technical

#### Root Cause
- The `/api/org/members` endpoint returns transformed member data
- The `AddStageReviewerModal` component was using Clerk's raw data structure
- Property name mismatches caused undefined values:
  - `firstName`/`lastName` → should be `name`
  - `emailAddresses[0].emailAddress` → should be `email`
  - `imageUrl` → should be `avatar`

#### Solution
- Updated `OrganizationMember` interface to match API response
- Updated all property references throughout the modal component
- Member dropdown now shows actual names instead of "undefined undefined"

### Impact
- ✅ **Reviewer Names Display** - Dropdown shows correct member names
- ✅ **Avatar Display** - Member avatars render properly in preview
- ✅ **Email Display** - Member emails show correctly in preview
- ✅ **Functional Reviewer Assignment** - Can now successfully assign reviewers to stages

---

## [3.1.3] - 2025-01-25

### 🐛 **Bugfix - Workflow Array Handling**

Critical bugfix that resolves `TypeError: Cannot read properties of undefined (reading '0')` when loading projects with workflows.

### Fixed

#### Workflow Data Type Handling
- **Array vs Object Handling** - Fixed Supabase JOIN returning workflow as array
  - Supabase `.select('*, workflows(*)')` can return data as array `[{...}]` or object `{...}`
  - Added logic to detect array and extract first element
  - Prevents undefined property access errors in UI
  - Now handles both array and object responses correctly

### Technical

#### Root Cause
- Supabase foreign key JOINs may return data as single-element array
- Previous fix assumed `workflows` would be an object
- UI tried to access `workflow.stages[0]` but workflow was actually `[{stages: [...]}]`
- This caused "Cannot read properties of undefined (reading '0')" errors

#### Solution
```typescript
const workflowData = Array.isArray(workflows) ? workflows[0] : workflows;
```

### Impact
- ✅ **Eliminates Console Errors** - No more TypeError when viewing projects
- ✅ **Workflow UI Renders** - ProjectStageReviewers and WorkflowBoard display correctly
- ✅ **Robust Data Handling** - Works regardless of Supabase response format

---

## [3.1.2] - 2025-01-25

### 🐛 **Bugfix - Workflow Data Display**

Critical bugfix that resolves workflow data not being visible in the UI due to a property naming mismatch between the API and frontend.

### Fixed

#### Workflow Data Loading
- **API Property Naming** - Fixed mismatch between API response and UI expectations
  - Supabase JOIN returned workflow data as `workflows` (table name)
  - TypeScript interface and UI expected `workflow` (singular)
  - API now properly renames `workflows` → `workflow` in response
  - This fix enables ProjectStageReviewers and WorkflowBoard to render correctly

### Technical

#### Root Cause
- Supabase query `.select('*, workflows(*)')` returns JOIN data using table name
- TypeScript `Project` interface defined property as `workflow?: Workflow`
- UI conditional checks like `{project?.workflow && ...}` evaluated to undefined
- Components (ProjectStageReviewers, WorkflowBoard) failed to render

#### Solution
- Added property renaming in `/api/projects/[id]/route.ts` GET handler
- Destructure `workflows` from response and rename to `workflow`
- Ensures API response matches TypeScript interface expectations

### Impact
- ✅ **Workflow Board Now Visible** - Kanban board displays for projects with workflows
- ✅ **Stage Reviewers Now Accessible** - UI for assigning reviewers now renders
- ✅ **Complete v3.1.1 Feature** - Reviewer assignment functionality now fully functional

---

## [3.1.1] - 2025-01-25

### 🎨 **Stage Reviewer Assignment UI**

This release completes the workflow system by adding the missing user interface for assigning reviewers to workflow stages at the project level. The backend API existed since v3.0.0, but there was no way for users to actually assign reviewers through the UI.

### Added

#### Stage Reviewer Management Components
- **ProjectStageReviewers Component** - Visual stage reviewer management interface
  - Grid layout showing all workflow stages with color coding
  - Display assigned reviewers per stage with avatars
  - Add/remove reviewer buttons per stage
  - Empty states for stages without reviewers
  - Real-time updates after reviewer changes
- **AddStageReviewerModal Component** - Modal for assigning reviewers to stages
  - Organization member selector dropdown
  - Stage context display (name, color, order)
  - Member preview with avatar and email
  - Validation and error handling
  - Loading states during submission

#### Integration
- **Project Detail Page Enhancement** - Added stage reviewer management section
  - Displays above workflow board when project has workflow
  - Shows all stages with assigned reviewers
  - Provides clear interface for team assignment
  - Refreshes project data after reviewer updates

### Changed
- **Project Detail Page** (`app/(dashboard)/projects/[id]/page.tsx`)
  - Now includes ProjectStageReviewers component
  - Better visual hierarchy (reviewers → workflow board → mockups)

### Technical

#### New Components
- `components/projects/ProjectStageReviewers.tsx` - Main reviewer management component
- `components/projects/AddStageReviewerModal.tsx` - Reviewer assignment modal

#### API Integration
- Uses existing `/api/projects/[id]/reviewers` endpoints:
  - GET - Fetch stage reviewers
  - POST - Add reviewer to stage
  - DELETE - Remove reviewer from stage
- Uses existing `/api/org/members` endpoint for organization member list

#### Features
- Stage color consistency throughout UI
- Organization member fetching from Clerk
- Optimistic UI updates
- Toast-style notifications
- Proper loading and error states

### Benefits
- ✅ **Complete Workflow Feature** - Users can now assign reviewers to stages (missing piece from v3.0.0)
- ✅ **Visual Stage Management** - Clear color-coded interface for each stage
- ✅ **Team Collaboration** - Easy assignment of organization members to review stages
- ✅ **Intuitive UX** - Add/remove reviewers directly from project detail page
- ✅ **Better Discoverability** - Reviewers visible and manageable alongside workflow board

---

## [3.1.0] - 2025-01-25

### 🎯 **Navigation Redesign & System Simplification**

This release removes the redundant ad-hoc reviewer system and introduces a completely redesigned navigation with improved information architecture and clearer grouping.

### Removed

#### Legacy Review System
- **Old Ad-Hoc Reviewer System** - Removed entire legacy review invitation system
  - Deleted `/reviews` page (old "My Reviews" dashboard)
  - Deleted reviewer invitation modal and API routes
  - Removed `mockup_reviewers` database table
  - Removed collaboration email templates for old system
  - Cleaned up mockup detail page (removed reviewer tab and invitation buttons)
  - Removed reviewer functionality from CommentsSidebar
- **Reason**: Redundant with new stage-based workflow approval system introduced in v3.0.0

### Changed

#### Navigation Redesign
- **Grouped Navigation Structure** - Complete sidebar redesign with logical hierarchy:
  - **Brand Assets** group
    - Logo Library (was "Search & Library")
    - Upload Logo
    - Template Library (was "Card Library")
    - Upload Template
  - **Mockups** group
    - Designer (was "Asset Designer")
    - Library (was "Mockup Library")
    - Projects
  - **Approvals** group
    - My Reviews (now points to `/my-stage-reviews` - stage-based workflow reviews only)
  - **Admin** group (unchanged)
    - Workflows
    - User Management
- **Collapsible Groups** - Each navigation group can be expanded/collapsed independently
- **Simplified Labels** - Shorter, clearer navigation labels (context provided by grouping)
- **Better Information Architecture** - Logical workflow progression: Assets → Mockups → Approvals

#### UI Improvements
- **CommentsSidebar** - Now comments-only (removed redundant reviewer tab)
- **Mockup Detail Page** - Cleaned up UI (removed old review request button)
- **Cleaner Icon Usage** - Removed unused icon imports throughout

### Technical

#### Database Migration
- **Migration 10** (`10_remove_old_review_system.sql`)
  - Drops `mockup_reviewers` table
  - Preserves `mockup_comments` table (still used for annotations)
  - Preserves `mockup_stage_progress` table (new workflow system)
  - Preserves `project_stage_reviewers` table (workflow stage assignments)

#### Files Deleted
- `app/(dashboard)/reviews/page.tsx`
- `app/api/mockups/[id]/reviewers/route.ts`
- `app/api/mockups/[id]/reviewers/[reviewerId]/route.ts`
- `components/collaboration/RequestFeedbackModal.tsx`
- `lib/email/collaboration.ts`

#### Files Modified
- `components/SidebarSimple.tsx` - Complete rewrite with grouped navigation
- `components/collaboration/CommentsSidebar.tsx` - Removed reviewer tab and related code
- `app/(dashboard)/mockups/[id]/page.tsx` - Removed reviewer state and invitation UI

### Benefits
- ✅ **Single Review System** - Only workflow-based stage reviews (no confusion)
- ✅ **Clearer Navigation** - Logical grouping makes features easier to find
- ✅ **Better UX** - Shorter labels, better context, cleaner UI
- ✅ **Reduced Complexity** - Removed redundant systems and code
- ✅ **Improved Workflow** - Natural progression through feature groups

---

## [3.0.0] - 2025-01-25

### 🎉 **MAJOR RELEASE - Active Approval Workflow System (Phase 3)**

This release transforms workflow templates from static configurations into a fully functional approval pipeline. Mockups now progress through multi-stage workflows with automatic tracking, reviewer assignments, and email notifications at every step.

### Added

#### Core Workflow Features
- **Stage Progress Tracking** - Automatic initialization when mockup assigned to workflow project
- **Sequential Stage Progression** - Mockups advance through stages (1 → 2 → 3...) sequentially
- **Approve/Request Changes Actions** - Reviewers can approve stages or send mockups back for revisions
- **Automatic Stage Advancement** - Approving a stage automatically moves to next stage and notifies reviewers
- **Change Request Reset** - Requesting changes resets mockup back to Stage 1 for revision
- **Stage Locking** - Only current `in_review` stage can be acted upon (prevents skipping stages)

#### UI Components
- **WorkflowBoard Component** - Kanban-style board showing mockups progressing through workflow stages
  - Color-coded columns per stage
  - Real-time status indicators
  - Mockup cards with thumbnails and stage progress
  - Empty states for stages with no mockups
- **StageStatusPill Component** - Visual status indicators with 4 states:
  - `pending` (gray) - Not yet reached
  - `in_review` (yellow) - Awaiting review
  - `approved` (green) - Stage completed
  - `changes_requested` (red) - Revisions needed
- **StageActionModal Component** - Two-tab modal for reviewers:
  - Approve tab with optional notes
  - Request Changes tab with required feedback
  - Warning about reset behavior on changes
- **Stage Action Banner** - Added to mockup detail page showing:
  - Current stage name and status
  - Approve/Request Changes buttons (for assigned reviewers)
  - Approved by badge (when stage completed)
  - Reviewer notes display

#### Pages & Routes
- **My Stage Reviews Dashboard** (`/my-stage-reviews`)
  - Centralized view of all pending stage reviews
  - Grouped by project
  - Stage badges with color coding
  - Direct links to review mockups
  - Empty state: "No pending reviews! 🎉"
- **Enhanced Project Detail Page**
  - Displays WorkflowBoard for projects with workflows
  - Shows mockup progress through stages
  - Live updates after stage actions

#### API Endpoints
- `GET /api/mockups/[id]/stage-progress` - Fetch stage progress with workflow details
- `POST /api/mockups/[id]/stage-progress/[stage_order]` - Approve or request changes
  - Validates reviewer permissions
  - Advances to next stage or resets to stage 1
  - Sends email notifications
- `GET /api/projects/[id]/mockups` - Enhanced to include stage progress data
  - Calculates `current_stage` and `overall_status` per mockup
  - Returns progress array with status for each stage
- `GET /api/reviews/my-stage-reviews` - Fetch pending reviews for current user
  - Returns projects with mockups awaiting review at user's assigned stages

#### Email Notifications
- **Stage Review Notification** - Sent when mockup reaches a reviewer's stage
  - Includes mockup name, project, stage details
  - CTA: "Review Now" button
- **Changes Requested Notification** - Sent to creator when changes requested
  - Includes reviewer feedback notes
  - Explains reset to Stage 1
- **All Stages Approved Notification** - Celebration email when final stage approved
  - Confirms completion through all stages
  - CTA: "View Approved Mockup"

#### Database
- **Migration 09** (`supabase/09_stage_progress.sql`)
  - `stage_status` enum: pending, in_review, approved, changes_requested
  - `mockup_stage_progress` table with full tracking
  - Auto-initialization trigger on mockup-project assignment
  - Helper functions:
    - `advance_to_next_stage(mockup_id, current_stage_order)` - Moves forward
    - `reset_to_first_stage(mockup_id)` - Resets on changes requested
  - Performance indexes on mockup_id, project_id, stage_order, status
  - Email notification tracking (sent timestamps)

#### TypeScript Types
- `StageStatus` type (pending | in_review | approved | changes_requested)
- `MockupStageProgress` interface
- `MockupWithProgress` helper type (extends CardMockup with progress data)
- `MockupStageProgressWithDetails` (includes workflow stage names/colors)

### Changed
- **Project Detail Page** - Now displays WorkflowBoard when project has workflow
- **Mockup Detail Page** - Shows stage action banner when mockup in workflow project
- **Sidebar Navigation** - Added "Stage Reviews" link for reviewer dashboard
- **Project Mockups API** - Enhanced to return stage progress with mockups

### Technical Details
- All stage transitions tracked with reviewer info, timestamps, and notes
- Stage progress auto-creates when mockup assigned to workflow project (via trigger)
- First stage set to `in_review`, others set to `pending`
- Email notifications queued but don't block API responses
- Optimistic UI updates for better UX
- Full audit trail preserved in database

### Performance Improvements
- Indexed queries on stage progress (mockup_id, project_id, stage_order)
- Batch email sending to avoid blocking
- Efficient JOIN queries for mockup + progress data

### Files Added
- `supabase/09_stage_progress.sql`
- `lib/email/stage-notifications.ts`
- `app/api/mockups/[id]/stage-progress/route.ts`
- `app/api/mockups/[id]/stage-progress/[stage_order]/route.ts`
- `app/api/reviews/my-stage-reviews/route.ts`
- `components/projects/StageStatusPill.tsx`
- `components/projects/StageActionModal.tsx`
- `components/projects/WorkflowBoard.tsx`
- `app/(dashboard)/my-stage-reviews/page.tsx`

### Files Modified
- `lib/supabase.ts` (added stage progress types)
- `app/api/projects/[id]/mockups/route.ts` (added progress tracking)
- `app/(dashboard)/projects/[id]/page.tsx` (added WorkflowBoard)
- `app/(dashboard)/mockups/[id]/page.tsx` (added stage banner)
- `components/SidebarSimple.tsx` (added Stage Reviews nav)
- `README.md` (documented v3.0 features)
- `package.json` (version bump to 3.0.0)

---

## [2.4.0] - 2025-01-25

### Added
- **Workflow Templates System** (Phase 2)
  - Create reusable multi-stage approval workflows
  - Color-coded stages (7 colors: yellow, green, blue, purple, orange, red, gray)
  - Assign stage-based reviewers to projects
  - Set default workflows for auto-assignment
  - Admin-only workflow management interface
  - Archive workflows while preserving history
- **Mockup-to-Project Assignment**
  - Assign mockups to projects from mockup library
  - ProjectSelector component for quick assignment
  - Mockup count tracking per project
- **Project Stage Reviewers Management**
  - API endpoints for adding/removing stage reviewers
  - Unique constraint prevents duplicate reviewer assignments
  - Cached user info (name, avatar) for display

### Changed
- Enhanced project detail page with mockup assignment
- Updated project creation flow to include workflow selection
- Improved project card display with workflow indicators

### Fixed
- Project deletion cascades to stage reviewer assignments
- Workflow deletion sets project workflow_id to NULL (preserves projects)

### Technical
- Migration 08: Workflows table with JSONB stages array
- `project_stage_reviewers` table with stage-based assignments
- Stage validation function (1-10 stages, valid structure)
- Performance indexes on workflow and reviewer queries

---

## [2.3.0] - 2025-01-24

### Added
- **Projects Feature** (Phase 1)
  - Client-based project organization for mockups
  - Project status tracking: Active, Completed, Archived
  - Color-coded projects (8 preset hex colors)
  - Project detail pages with mockup galleries
  - Search within project mockups
  - Thumbnail previews (up to 4) on project cards
  - Permission controls (creator/admin only)
- **Project API Routes**
  - `GET/POST /api/projects` - List and create projects
  - `GET/PATCH/DELETE /api/projects/[id]` - Individual project operations
  - `GET /api/projects/[id]/mockups` - Project mockup listing
- **Project Components**
  - `ProjectCard.tsx` - Display component
  - `NewProjectModal.tsx` - Creation dialog with color picker
  - Project detail page with mockup grid

### Changed
- Added `project_id` column to `card_mockups` table
- Updated mockup library to show project assignments
- Enhanced mockup detail page to display project info

### Technical
- Migration 07: Projects table with status enum
- Indexes for project queries and mockup-project relationships
- RLS policies follow Clerk auth pattern

---

## [2.2.0] - 2025-01-24

### Added
- **Collapsible Sidebar** with expand/collapse functionality
- Sidebar state persistence using React Context
- Mobile-responsive navigation with slide-out behavior
- **Aiproval Rebranding**
  - Updated app name throughout codebase
  - Refreshed color scheme and branding
  - Updated email templates with new branding

### Changed
- Sidebar now collapsible on desktop (16px collapsed, 264px expanded)
- Improved mobile menu with overlay and animations
- Better icon-only view when collapsed
- Streamlined navigation layout

### Fixed
- Sidebar state sync between header toggle and sidebar toggle
- Mobile menu close behavior
- Icon alignment in collapsed state

---

## [2.1.0] - 2025-01-23

### Added
- **Zoom Controls** in annotation toolbar
  - Zoom in/out buttons (25%-400% range)
  - Reset to 100% button
  - Mouse wheel zoom support
  - Visual zoom percentage display
- **Visual Linking** between comments and annotations
  - Bi-directional hover highlighting
  - Hover comment → highlight annotation on canvas
  - Hover annotation → highlight comment in sidebar
  - Improved UX for tracking feedback
- **Resolution Tracking Enhancements**
  - Show resolved by user name and timestamp
  - Better visual indicators for resolved state
  - Improved resolution notes display

### Changed
- Enhanced annotation toolbar with integrated zoom controls
- Improved comment sidebar layout for better readability
- Updated hover states for clearer visual feedback

---

## [2.0.0] - 2025-01-22

### Added
- **Folder Organization System**
  - Personal folders with up to 5 levels of nesting
  - Org-shared folders (admin-created)
  - Smart "Unsorted" folder for unorganized mockups
  - Folder CRUD operations (create, rename, delete, share)
  - Move mockups between folders
  - Real-time mockup counts per folder
  - Search within folders
- **Next.js 15 Upgrade**
  - Migrated to Next.js 15.5.5 with App Router
  - Turbopack for faster development builds
  - React 19.1.0 upgrade
  - Updated all dependencies
- **Mobile UX Improvements**
  - Responsive folder tree
  - Touch-optimized interactions
  - Mobile-friendly mockup grid

### Changed
- **BREAKING**: Route params now async (Next.js 15 requirement)
- Folder hierarchy replaces flat library structure
- Updated all route handlers for async params
- Improved mockup library layout

### Technical
- Migration 04: Folders table with self-referencing hierarchy
- Added `folder_id` to `card_mockups`
- Added `created_by` to mockups, templates, brands
- Folder depth validation (max 5 levels)
- Performance indexes for folder queries

---

## [1.1.0] - 2024-10-21

### Added
- **Organization Scoping** for true multi-tenancy
  - All data scoped by Clerk organization_id
  - Complete data isolation between organizations
  - Organization switcher in UI
- **Clerk Organizations** integration
  - Team management via Clerk
  - Role-based access (admin vs member)
  - Organization member listing API

### Changed
- All database tables include `organization_id`
- All API routes filter by organization
- Updated RLS policies for organization isolation

---

## [1.0.0] - 2024-10-18

### Added
- **Brand Asset Management**
  - Logo search via Brandfetch API
  - Brand-centric data model
  - Multiple logo variants per brand
  - Color palette extraction
  - Font information storage
- **Mockup Designer**
  - Interactive Konva.js canvas
  - Drag & drop logo placement
  - Template backgrounds
  - High-resolution export (2x pixel ratio)
  - Position and size controls
- **Collaboration System**
  - 7 annotation tools (pin, arrow, circle, rect, freehand, text, select)
  - Numbered comments linked to annotations
  - Color picker and stroke width controls
  - Review request workflow
  - Email notifications via SendGrid
- **Review Workflow**
  - Request feedback from organization members
  - Review status tracking
  - Approve/request changes with notes
  - Reviewer dashboard
- **Resolution & Audit Trail**
  - Comment resolution tracking
  - Edit history in JSONB
  - Soft delete for compliance
  - Original text preservation
- **Authentication**
  - Clerk integration
  - Multi-tenant support
  - Role-based access control

### Technical
- Next.js 15 App Router
- TypeScript throughout
- Tailwind CSS 4
- Supabase PostgreSQL + Storage
- Konva.js for canvas rendering
- SendGrid for emails
- 6 initial database migrations

---

## Legend

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

---

For more information, see [README.md](README.md) or visit the [GitHub repository](https://github.com/jay-chalkstep/contentpackage).
