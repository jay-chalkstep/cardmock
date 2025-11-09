# UI/UX Redesign and Reorganization Plan

## Overview
Redesign the application to better serve two primary user types:
- **Creators**: Users who create and curate assets as part of a project
- **Reviewers**: Users who provide commentary on assets and approve them

The redesign focuses on reorganizing the Library structure, adding global search, and improving discoverability of key features like asset creation and approval flows.

## Key Changes

### 1. Navigation Reorganization

**New Sidebar Structure:**
- **Home** (new) - Dashboard showing overview for both user types
- **Projects** - For creators (manage projects, create assets)
- **My Reviews** - For reviewers (pending approvals, renamed from "Reviews")
- **Library** - Reorganized with tabs/sections:
  - Assets (mockups)
  - Brands
  - Templates
- **Designer** - Keep but make more discoverable
- **Admin** (if admin) - Workflows, Reports, Templates

**Files to modify:**
- `components/navigation/NavRail.tsx` - Update navigation items
- `app/(dashboard)/layout.tsx` - Potentially add Home page

### 2. Global Search Implementation

**Add persistent search bar in header:**
- Search across: Assets, Brands, Templates, Projects
- Command palette style (Cmd+K) or always-visible search bar
- Quick filters for content type
- Recent searches

**Files to create/modify:**
- `components/layout/AppHeader.tsx` - Add global search component
- `components/search/GlobalSearch.tsx` - New global search component
- `app/api/search/route.ts` - New unified search API endpoint

### 3. Library Reorganization

**Replace current Gallery page with Library page that has clear sections:**

**Option A: Tabbed Interface (Recommended)**
- Single Library page with tabs: Assets | Brands | Templates
- Each tab shows filtered content
- Shared search/filter across tabs

**Option B: Separate Pages**
- `/library/assets` - Assets only
- `/library/brands` - Brands only  
- `/library/templates` - Templates only
- Library nav item opens to Assets by default

**Recommended: Option A (Tabbed) for better UX**

**Files to modify:**
- `app/(dashboard)/gallery/page.tsx` - Rename/restructure to Library with tabs
- `components/lists/` - Ensure all list components work with new structure
- `components/navigation/NavRail.tsx` - Update "Gallery" to "Library"

### 4. Creation Flow Improvements

**Make asset creation more discoverable:**

**From Projects Page:**
- Add prominent "Create Asset" button in project detail view
- Quick action to create asset directly in project context
- Designer opens with project pre-selected

**From Library/Assets:**
- "New Asset" button that opens Designer
- Option to create standalone or assign to project

**From Designer:**
- Better project/brand selection UI
- Clearer save flow with project assignment option

**Files to modify:**
- `app/(dashboard)/projects/[id]/page.tsx` - Add create asset button
- `app/(dashboard)/designer/page.tsx` - Improve project selection
- `components/projects/WorkflowBoard.tsx` - Add create asset action
- `components/designer/DesignerSavePanel.tsx` - Improve save flow

### 5. Reviewer Experience Improvements

**Enhance My Reviews page:**
- Better filtering (by project, by stage, by status)
- Clearer visual indicators for what needs attention
- Quick actions (approve, request changes)
- Approval history/audit trail visibility

**Files to modify:**
- `app/(dashboard)/my-stage-reviews/page.tsx` - Improve UI and filtering
- `components/reviews/ReviewPreview.tsx` - Enhance preview panel
- `components/lists/ReviewListItem.tsx` - Better status indicators

### 6. Home/Dashboard Page (New)

**Create overview page for both user types:**
- For Creators: Recent projects, quick create actions, recent assets
- For Reviewers: Pending reviews count, urgent items
- Shared: Recent activity, notifications

**Files to create:**
- `app/(dashboard)/page.tsx` - New home/dashboard page
- `components/dashboard/DashboardOverview.tsx` - Dashboard component

### 7. Search Page Consolidation

**Current `/search` page has two modes (web/library):**
- Integrate web search into global search
- Keep library mode as part of Library > Brands tab
- Remove standalone search page or repurpose

**Files to modify:**
- `app/(dashboard)/search/page.tsx` - Integrate into global search or remove
- Update all links to `/search` to point to Library or global search

### 8. Upload Flow Integration

**Current `/upload` page is separate:**
- Integrate upload into Library > Brands tab
- Add "Upload Brand" action in Brands section
- Keep upload page but make it accessible from Library

**Files to modify:**
- `app/(dashboard)/library/page.tsx` - Add upload action to Brands tab
- `app/(dashboard)/upload/page.tsx` - Keep but improve navigation back to Library

## Implementation Order

1. **Phase 1: Navigation & Structure**
   - Update NavRail with new structure
   - Create Library page with tabs (Assets, Brands, Templates)
   - Rename routes and update links

2. **Phase 2: Global Search**
   - Add search bar to header
   - Create unified search API
   - Implement search UI

3. **Phase 3: Creation Flow**
   - Add create asset buttons to Projects
   - Improve Designer project selection
   - Enhance save flow

4. **Phase 4: Reviewer Experience**
   - Improve My Reviews page
   - Add better filtering and status indicators
   - Enhance approval history visibility

5. **Phase 5: Dashboard**
   - Create Home/Dashboard page
   - Add overview components
   - Update navigation to include Home

6. **Phase 6: Cleanup**
   - Remove/consolidate search page
   - Update all internal links
   - Test all flows

## Technical Considerations

- Maintain backward compatibility with existing routes during transition
- Update all internal navigation links
- Ensure RLS policies work with new structure
- Test with both creator and reviewer user types
- Update breadcrumbs and context panels
- Ensure mobile responsiveness

## Files Summary

**New Files:**
- `app/(dashboard)/page.tsx` - Home/Dashboard
- `app/(dashboard)/library/page.tsx` - New Library page with tabs
- `components/search/GlobalSearch.tsx` - Global search component
- `components/dashboard/DashboardOverview.tsx` - Dashboard component
- `app/api/search/route.ts` - Unified search API

**Modified Files:**
- `components/navigation/NavRail.tsx`
- `components/layout/AppHeader.tsx`
- `app/(dashboard)/gallery/page.tsx` - Restructure or replace
- `app/(dashboard)/projects/[id]/page.tsx`
- `app/(dashboard)/designer/page.tsx`
- `app/(dashboard)/my-stage-reviews/page.tsx`
- `app/(dashboard)/search/page.tsx` - Integrate or remove
- All components that reference `/gallery` or `/search`

## User Flows

### Creator Flow
1. Home → See recent projects and quick actions
2. Projects → Select project → Create Asset → Designer
3. Designer → Select brand/template → Design → Save to project
4. Project view → See assets in workflow stages
5. Library → Browse all assets, brands, templates

### Reviewer Flow
1. Home → See pending reviews count
2. My Reviews → Filter by project/stage → Review asset
3. Review → Provide feedback → Approve/Request changes
4. Approval history → See who approved what and when

## Success Metrics

- Reduced clicks to create an asset
- Improved discoverability of key features
- Clearer separation between Assets, Brands, and Templates
- Faster access to search functionality
- Better reviewer experience with clear pending items

