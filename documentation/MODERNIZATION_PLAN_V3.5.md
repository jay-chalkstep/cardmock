# CardMock v3.5.0 - Modernization & Consistency Overhaul Plan

**Date Created:** 2025-10-28
**Current Version:** v3.4.1
**Target Version:** v3.5.0
**Estimated Timeline:** 5-6 hours
**Status:** Planning

---

## 🎯 Executive Summary

This plan addresses critical terminology inconsistencies, missing routes, and modernization opportunities identified in the comprehensive codebase audit. The goal is to create a unified, professional user experience with consistent terminology and leverage Next.js 15 + React 19 capabilities.

### Key Decisions Made

1. **UI Terminology:** Standardize on "Asset" (not "Card" or "Mockup")
2. **Route Strategy:** Rename routes to match navigation (`/designer`, `/gallery`, `/brands`)
3. **Scope:** Full modernization including Next.js 15 patterns
4. **Database:** Migration acceptable for consistency

---

## 📊 Current State Analysis

### Critical Issues Found

1. **Broken Navigation**
   - NavRail references `/gallery`, `/brands`, `/designer` (all return 404)
   - Actual routes: `/mockup-library`, `/search?mode=library`, `/card-designer`

2. **Terminology Confusion**
   - Database: `card_mockups`, `card_templates`
   - UI: "Asset Designer", "Mockup Library"
   - Types: `CardMockup`, `CardTemplate`, deprecated `Logo`
   - Inconsistent use of: Card vs Asset vs Mockup

3. **Deprecated Code**
   - `Logo` interface still exported and used (should use `Brand` + `LogoVariant`)
   - `logo_id` references in database types (column removed in migration 02)
   - Redirect-only routes (`/card-library`, `/card-upload`)

4. **Missed Next.js 15 Opportunities**
   - Most pages are Client Components unnecessarily
   - No Server Actions (all mutations via API routes)
   - No Suspense boundaries or loading states
   - Inconsistent layout systems (GmailLayout vs FourPanelLayout)

---

## 📋 Implementation Plan

### Phase 1: Critical Route Fixes & Navigation (30 min)

#### 1.1 Rename Route Directories

**Actions:**
- Rename `/app/(dashboard)/card-designer/` → `/app/(dashboard)/designer/`
- Rename `/app/(dashboard)/mockup-library/` → `/app/(dashboard)/gallery/`
- Create `/app/(dashboard)/brands/` (new brand library page)

**Files to Move:**
- `card-designer/page.tsx` → `designer/page.tsx`
- `mockup-library/page.tsx` → `gallery/page.tsx`

**Update Component Names:**
- `CardDesignerPage` → `DesignerPage` (export name)
- `MockupLibraryPage` → `GalleryPage` (export name)

#### 1.2 Delete Unused Routes

**Delete Entirely:**
- `/app/(dashboard)/card-library/` directory
- `/app/(dashboard)/card-upload/` directory

**Reason:** These are redirect-only pages serving no purpose.

#### 1.3 Update Navigation Files

**Files to Update:**
- `components/navigation/NavRail.tsx`
  - Line 32: `href: '/gallery'` (was pointing to non-existent route)
  - Line 33: `href: '/brands'` (was pointing to non-existent route)
  - Line 34: `href: '/designer'` (was pointing to non-existent route)

- `components/SidebarSimple.tsx`
  - Update all navigation links to new routes
  - Update grouped navigation structure

#### 1.4 Update Internal Links

**Search and Replace Across Codebase:**
- `/card-designer` → `/designer`
- `/mockup-library` → `/gallery`
- Update all `href`, `router.push`, and `Link` components

**Files Known to Have Links:**
- `/app/(dashboard)/gallery/page.tsx` (header buttons)
- `/app/(dashboard)/projects/[id]/page.tsx` (Add Assets button)
- `/components/projects/ProjectSelector.tsx`
- Any breadcrumb components

---

### Phase 2: Terminology Standardization (1 hour)

#### 2.1 Terminology Reference Guide

**Official Terminology:**
- **Brand** = Company with logo variants, colors, fonts (replaces deprecated "Logo")
- **Asset** = The designed output created by users (replaces "Card")
- **Template** = Background template used in asset creation
- **Gallery** = Collection of user-created assets (replaces "Mockup Library")
- **Mockup** = Internal term for rendered asset image (technical only)

#### 2.2 UI Text Updates

**Designer Page (`/app/(dashboard)/designer/page.tsx`):**
- Line 529: Keep "Asset Designer" (already correct)
- Line 530: Keep "asset mockups" → clarify as "custom assets"
- Line 559: "Asset Template" (already correct)
- Line 773: "Select an asset template" (already correct)
- Line 931: "Select an Asset Template" (already correct)
- Update any "Card" references to "Asset"

**Gallery Page (`/app/(dashboard)/gallery/page.tsx`):**
- Page title: "Asset Gallery" (was "Mockup Library")
- Line 294: "Search assets..." (was "Search mockups...")
- Line 303-308: "Brand Library" button (clarify what library)
- Line 316: "Upload Brand" (already correct)
- Line 374: "No unsorted assets" (was "No unsorted mockups")
- Line 376: "No assets in this folder" (was "No mockups in this folder")

**Brands Page (`/app/(dashboard)/brands/page.tsx`):**
- New page - copy from search.tsx with mode=library
- Title: "Brand Library"
- Description: "Manage your saved brands and logo variants"
- Empty state: "No brands saved yet"

**Admin Templates (`/app/(dashboard)/admin/templates/page.tsx`):**
- Line 266: "Template Library" (already correct)
- Line 106: "Failed to load templates" (remove "card")
- Line 283: "No templates yet" (already correct)
- Line 288: "Upload your first template" (remove "card template")

**Search Page (`/app/(dashboard)/search/page.tsx`):**
- Line 294-295: Title = "Search Brands"
- Line 308: "Search Brands" button (already correct)
- Remove mode toggle (library mode now at `/brands`)

**Projects Pages:**
- Update all references from "mockups" to "assets" where appropriate
- Keep "mockup" for technical contexts (API responses, etc.)

#### 2.3 Component Renaming

**Files to Rename:**

1. `/components/LogoCard.tsx` → `/components/brand/BrandCard.tsx`
   - Update component name inside file
   - Create `/components/brand/` directory if needed

2. `/components/BrandDetailModal.tsx` → `/components/brand/BrandDetailModal.tsx`
   - Move to brand directory

3. `/components/KonvaCanvas.tsx` → `/components/designer/KonvaCanvas.tsx`
   - Move to designer directory
   - Create `/components/designer/` directory

**Update All Imports:**
- Search for `import LogoCard` and update to new path
- Search for `import BrandDetailModal` and update
- Search for `import KonvaCanvas` and update

#### 2.4 Variable & Function Renaming

**In Designer Page:**
- `selectedLogo` → `selectedBrand`
- `setSelectedLogo` → `setSelectedBrand`
- `loadLogoImage` → `loadBrandImage`
- Any `logoData` → `brandData`

**In Gallery/List Components:**
- `mockups` → `assets` (where referring to user-created items)
- `mockupId` → `assetId`
- Keep `mockup_image_url` in database queries (technical field name)

---

### Phase 3: Database Migration (45 min)

#### 3.1 Create Migration 13: Terminology Cleanup

**File:** `supabase/13_terminology_cleanup.sql`

```sql
-- Migration 13: Terminology Cleanup and Standardization
-- Version: 3.5.0
-- Date: 2025-10-28

-- ============================================
-- SECTION 1: Rename Tables for Consistency
-- ============================================

-- Rename card_mockups to assets
ALTER TABLE card_mockups RENAME TO assets;

-- Rename card_templates to templates
ALTER TABLE card_templates RENAME TO templates;

-- ============================================
-- SECTION 2: Create Compatibility Views
-- (Allows old code to continue working)
-- ============================================

-- View for backwards compatibility with card_mockups
CREATE VIEW card_mockups AS
SELECT * FROM assets;

-- View for backwards compatibility with card_templates
CREATE VIEW card_templates AS
SELECT * FROM templates;

-- ============================================
-- SECTION 3: Update Foreign Key Names
-- ============================================

-- Rename foreign key constraints for clarity
ALTER TABLE assets
  RENAME CONSTRAINT card_mockups_organization_id_fkey
  TO assets_organization_id_fkey;

ALTER TABLE templates
  RENAME CONSTRAINT card_templates_organization_id_fkey
  TO templates_organization_id_fkey;

-- ============================================
-- SECTION 4: Update Index Names
-- ============================================

-- Rename indexes for consistency
ALTER INDEX IF EXISTS idx_card_mockups_organization
  RENAME TO idx_assets_organization;

ALTER INDEX IF EXISTS idx_card_mockups_folder
  RENAME TO idx_assets_folder;

ALTER INDEX IF EXISTS idx_card_mockups_project
  RENAME TO idx_assets_project;

ALTER INDEX IF EXISTS idx_card_templates_organization
  RENAME TO idx_templates_organization;

-- ============================================
-- SECTION 5: Update Storage References
-- ============================================

-- Note: Storage bucket names remain unchanged for backwards compatibility
-- Buckets: 'logos', 'card-templates', 'card-mockups'
-- These are referenced in uploaded URLs and shouldn't be changed

-- ============================================
-- SECTION 6: Verification Queries
-- ============================================

-- Verify table renames
SELECT table_name
FROM information_schema.tables
WHERE table_name IN ('assets', 'templates', 'card_mockups', 'card_templates');

-- Should return: assets, templates, card_mockups (view), card_templates (view)

-- ============================================
-- ROLLBACK INSTRUCTIONS
-- ============================================

/*
If you need to rollback this migration:

DROP VIEW IF EXISTS card_mockups;
DROP VIEW IF EXISTS card_templates;
ALTER TABLE assets RENAME TO card_mockups;
ALTER TABLE templates RENAME TO card_templates;
-- Rename foreign keys and indexes back
*/
```

#### 3.2 Update TypeScript Types (`lib/supabase.ts`)

**Changes to Make:**

1. **Remove Deprecated Types (lines 114-133):**
```typescript
// Mark as deprecated with JSDoc
/** @deprecated Use Brand and LogoVariant instead */
export interface Logo {
  // ... existing properties
}
```

2. **Update BrandColor Interface (lines 57-67):**
```typescript
export interface BrandColor {
  id: string;
  brand_id: string; // Keep this (correct)
  // Remove: logo_id?: string; // DEPRECATED - remove this line
  hex_value: string;
  color_name?: string;
  created_at: string;
  organization_id: string;
}
```

3. **Update BrandFont Interface (lines 69-77):**
```typescript
export interface BrandFont {
  id: string;
  brand_id: string; // Keep this (correct)
  // Remove: logo_id?: string; // DEPRECATED - remove this line
  font_family: string;
  font_weight?: string;
  created_at: string;
  organization_id: string;
}
```

4. **Rename Main Interfaces (add aliases):**
```typescript
// New primary names
export interface Asset {
  // ... same properties as CardMockup
}

export interface Template {
  // ... same properties as CardTemplate
}

// Backwards compatibility aliases
export type CardMockup = Asset;
export type CardTemplate = Template;
```

5. **Update Storage Bucket Constants (lines 52-54):**
```typescript
// Keep bucket names for backwards compat, update constant names
export const BRANDS_BUCKET = 'logos'; // Bucket name unchanged
export const TEMPLATES_BUCKET = 'card-templates'; // Bucket name unchanged
export const ASSETS_BUCKET = 'card-mockups'; // Bucket name unchanged
```

#### 3.3 Update Database Queries

**Pattern to Follow:**
```typescript
// OLD:
const { data } = await supabase.from('card_mockups').select('*');

// NEW (with compatibility view, both work):
const { data } = await supabase.from('assets').select('*');
```

**Files to Update (use global search/replace):**
- All API routes in `/app/api/`
- All page components that query directly
- Search for: `.from('card_mockups')` → `.from('assets')`
- Search for: `.from('card_templates')` → `.from('templates')`

**Known Files with Queries:**
- `/app/api/mockups/` directory (multiple files)
- `/app/api/projects/` directory
- `/app/(dashboard)/gallery/page.tsx`
- `/app/(dashboard)/admin/templates/page.tsx`

---

### Phase 4: Next.js 15 Modernization (2 hours)

#### 4.1 Server Components Conversion

**Principle:** Default to Server Components, only use Client Components for interactivity.

**Convert to Server Components:**

1. **Gallery Page (`/app/(dashboard)/gallery/page.tsx`)**
   - Remove `'use client'`
   - Fetch assets server-side using Supabase server client
   - Pass data as props to Client Components (folder tree, asset grid)
   - Create: `components/gallery/AssetGrid.client.tsx` for interactive parts

2. **Projects Page (`/app/(dashboard)/projects/page.tsx`)**
   - Remove `'use client'`
   - Fetch projects server-side
   - Pass data to Client Components for interactive list

3. **Brands Page (`/app/(dashboard)/brands/page.tsx`)**
   - Server Component by default
   - Fetch brands server-side
   - Client Component only for search/filter UI

4. **Admin Templates (`/app/(dashboard)/admin/templates/page.tsx`)**
   - Remove `'use client'`
   - Fetch templates server-side
   - Client Component for upload/delete actions

**Keep as Client Components:**
- `/app/(dashboard)/designer/page.tsx` - Canvas interactions
- `/app/(dashboard)/assets/[id]/page.tsx` - Collaboration features
- Any modal or interactive form components

**Pattern:**
```typescript
// app/(dashboard)/gallery/page.tsx
import { AssetGrid } from '@/components/gallery/AssetGrid.client';
import { createServerClient } from '@/lib/supabase/server';

export default async function GalleryPage() {
  const supabase = createServerClient();
  const { data: assets } = await supabase.from('assets').select('*');

  return <AssetGrid initialAssets={assets} />;
}

// components/gallery/AssetGrid.client.tsx
'use client';
export function AssetGrid({ initialAssets }) {
  // Interactive state and handlers here
}
```

#### 4.2 Implement Server Actions

**Create:** `/app/actions/` directory

**Server Actions to Implement:**

1. **Folder Actions (`app/actions/folders.ts`):**
```typescript
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createFolder(formData: FormData) {
  const supabase = createServerClient();
  const name = formData.get('name');
  const parentId = formData.get('parentId');

  const { error } = await supabase.from('folders').insert({ name, parent_id: parentId });

  if (error) return { error: error.message };

  revalidatePath('/gallery');
  return { success: true };
}

export async function deleteFolder(folderId: string) {
  // Similar pattern
}
```

2. **Asset Actions (`app/actions/assets.ts`):**
```typescript
'use server';

export async function deleteAsset(assetId: string) {
  // Delete logic
  revalidatePath('/gallery');
}

export async function moveAsset(assetId: string, folderId: string) {
  // Move logic
  revalidatePath('/gallery');
}
```

3. **Project Actions (`app/actions/projects.ts`):**
```typescript
'use server';

export async function createProject(formData: FormData) {
  // Create logic
  revalidatePath('/projects');
}
```

**Update Components to Use Server Actions:**
```typescript
// components/folders/CreateFolderModal.tsx
'use client';

import { createFolder } from '@/app/actions/folders';

export function CreateFolderModal() {
  return (
    <form action={createFolder}>
      <input name="name" />
      <button type="submit">Create</button>
    </form>
  );
}
```

#### 4.3 Add Suspense Boundaries & Loading States

**Create Loading Files:**

1. **`/app/(dashboard)/gallery/loading.tsx`:**
```typescript
import { Loader2 } from 'lucide-react';

export default function GalleryLoading() {
  return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      <span className="ml-2">Loading assets...</span>
    </div>
  );
}
```

2. **`/app/(dashboard)/designer/loading.tsx`:**
```typescript
export default function DesignerLoading() {
  return <div>Loading designer...</div>;
}
```

3. **`/app/(dashboard)/brands/loading.tsx`:**
```typescript
export default function BrandsLoading() {
  return <div>Loading brands...</div>;
}
```

4. **`/app/(dashboard)/projects/loading.tsx`:**
```typescript
export default function ProjectsLoading() {
  return <div>Loading projects...</div>;
}
```

**Create Error Files:**

1. **`/app/(dashboard)/gallery/error.tsx`:**
```typescript
'use client';

export default function GalleryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong loading the gallery</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

**Implement Skeleton Screens:**

Create: `/components/skeletons/AssetGridSkeleton.tsx`
```typescript
export function AssetGridSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 h-48 rounded-lg" />
          <div className="bg-gray-200 h-4 mt-2 rounded" />
        </div>
      ))}
    </div>
  );
}
```

Use in pages:
```typescript
import { Suspense } from 'react';
import { AssetGridSkeleton } from '@/components/skeletons/AssetGridSkeleton';

export default function GalleryPage() {
  return (
    <Suspense fallback={<AssetGridSkeleton />}>
      <AssetGrid />
    </Suspense>
  );
}
```

#### 4.4 Layout Standardization

**Issue:** Currently using two layout systems:
- `GmailLayout` - Used by most pages
- `FourPanelLayout` - Used by admin/templates

**Solution:** Standardize on `GmailLayout`

**Steps:**

1. **Update `admin/templates/page.tsx`:**
   - Remove `FourPanelLayout` wrapper
   - Wrap with `GmailLayout`
   - Adjust context panel usage

2. **Delete `FourPanelLayout.tsx`** if no longer used

3. **Ensure Consistent Panel Behavior:**
   - All pages use `PanelContext` correctly
   - Context panels collapse consistently
   - NavRail present on all dashboard pages

**Verify Layout Consistency:**
- Check all pages use `GmailLayout` wrapper
- Verify panel visibility toggles work
- Test responsive behavior

---

### Phase 5: Component Organization (1 hour)

#### 5.1 Reorganize Component Directory

**New Structure:**

```
/components/
  /brand/
    - BrandCard.tsx (moved from LogoCard.tsx)
    - BrandDetailModal.tsx (moved from root)
    - BrandVariantSelector.tsx (if exists)
    - index.ts (barrel export)

  /designer/
    - KonvaCanvas.tsx (moved from root)
    - AssetCanvas.tsx
    - ToolbarControls.tsx
    - CanvasControls.tsx
    - index.ts

  /assets/
    - AssetCard.tsx (create new)
    - AssetGrid.tsx (create new)
    - AssetGrid.client.tsx
    - AssetPreview.tsx
    - index.ts

  /gallery/
    - AssetGrid.client.tsx
    - FolderTree.tsx (move if exists)
    - GalleryFilters.tsx
    - index.ts

  /templates/
    - TemplateCard.tsx (existing)
    - TemplateUploadModal.tsx (existing)
    - TemplateGrid.tsx
    - index.ts

  /skeletons/
    - AssetGridSkeleton.tsx
    - ProjectListSkeleton.tsx
    - BrandGridSkeleton.tsx
    - index.ts

  /navigation/ (existing)
  /projects/ (existing)
  /folders/ (existing)
  /collaboration/ (existing)
  /ai/ (existing)
  /lists/ (existing)
```

#### 5.2 Create Barrel Exports

**Example: `/components/brand/index.ts`:**
```typescript
export { BrandCard } from './BrandCard';
export { BrandDetailModal } from './BrandDetailModal';
export { BrandVariantSelector } from './BrandVariantSelector';
```

**Benefits:**
- Cleaner imports: `import { BrandCard, BrandDetailModal } from '@/components/brand'`
- Better code organization
- Easier to find related components

#### 5.3 Update All Imports

**After moving components, update imports across:**
- All page files
- All component files that import moved components
- Use IDE refactoring tools when possible

**Pattern:**
```typescript
// OLD:
import LogoCard from '@/components/LogoCard';

// NEW:
import { BrandCard } from '@/components/brand';
```

---

### Phase 6: Error Handling & UX Improvements (45 min)

#### 6.1 Standardize Error Handling

**Create Global Error Boundary:**

**File:** `/app/(dashboard)/error.tsx`
```typescript
'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
      >
        Try again
      </button>
    </div>
  );
}
```

**Standardize Toast Pattern:**

Create: `/lib/toast.ts`
```typescript
export function showToast(message: string, type: 'success' | 'error' | 'info') {
  // Unified toast implementation
  // Could use existing Toast component or implement new pattern
}
```

**Update Error Messages:**
- Consistent error message format
- User-friendly language (not technical errors)
- Actionable suggestions when possible

#### 6.2 Improve Loading States

**Loading State Hierarchy:**
1. **Route-level:** `loading.tsx` files (page transition)
2. **Component-level:** Skeleton screens (content loading)
3. **Action-level:** Button spinners (form submission)

**Implement Progressive Loading:**
```typescript
// Show immediate UI, load data progressively
export default async function GalleryPage() {
  return (
    <>
      <GalleryHeader /> {/* Loads immediately */}
      <Suspense fallback={<AssetGridSkeleton />}>
        <AssetGrid /> {/* Streams in when ready */}
      </Suspense>
    </>
  );
}
```

#### 6.3 Add Optimistic UI Updates

**Pattern for Asset Deletion:**
```typescript
'use client';

import { useOptimistic } from 'react';
import { deleteAsset } from '@/app/actions/assets';

export function AssetGrid({ assets }) {
  const [optimisticAssets, updateOptimisticAssets] = useOptimistic(
    assets,
    (state, deletedId) => state.filter(a => a.id !== deletedId)
  );

  async function handleDelete(id: string) {
    updateOptimisticAssets(id); // Immediate UI update
    await deleteAsset(id); // Actual deletion
  }

  return (
    <div>
      {optimisticAssets.map(asset => (
        <AssetCard key={asset.id} onDelete={handleDelete} />
      ))}
    </div>
  );
}
```

---

### Phase 7: Testing & Documentation (30 min)

#### 7.1 Update Documentation

**Update README.md:**
```markdown
## Route Structure (Updated in v3.5.0)

Dashboard Routes:
- `/designer` - Create custom assets (formerly /card-designer)
- `/gallery` - Browse and organize assets (formerly /mockup-library)
- `/brands` - Manage saved brands and logo variants
- `/projects` - Organize assets by client projects
- `/my-stage-reviews` - Review assigned workflow stages

Admin Routes:
- `/admin/templates` - Manage background templates
- `/admin/workflows` - Configure approval workflows
- `/admin/users` - User management

## Terminology (Standardized in v3.5.0)

- **Brand** - Company with logo variants, colors, and fonts
- **Asset** - Custom design created by users
- **Template** - Background template for asset creation
- **Gallery** - Collection of user-created assets
```

**Create CHANGELOG.md Entry:**
```markdown
## [3.5.0] - 2025-10-28

### 🎨 **Major Modernization & Consistency Release**

Complete terminology standardization and Next.js 15 modernization.

### Changed

#### Routes Renamed
- `/card-designer` → `/designer` - Asset creation tool
- `/mockup-library` → `/gallery` - Asset gallery
- Created `/brands` - Brand library (formerly search?mode=library)

#### Terminology Standardized
- "Asset" - User-created designs (replaces "Card" in UI)
- "Brand" - Company assets (fully replaces deprecated "Logo")
- "Gallery" - Asset collection (replaces "Mockup Library")
- "Template" - Background templates (removed "Card" prefix)

#### Database Changes
- Renamed `card_mockups` → `assets`
- Renamed `card_templates` → `templates`
- Created compatibility views for backwards compatibility
- Removed deprecated `logo_id` references

### Added

#### Next.js 15 Features
- Server Components for data fetching (Gallery, Projects, Brands)
- Server Actions for mutations (folders, assets, projects)
- Suspense boundaries with loading states
- Error boundaries for graceful error handling
- Skeleton screens for better UX

#### Component Organization
- Reorganized into feature-based directories
- Added barrel exports for cleaner imports
- Created dedicated `/brand`, `/designer`, `/assets` directories

### Removed
- Deleted `/card-library` redirect route
- Deleted `/card-upload` redirect route
- Removed deprecated `Logo` interface from types
- Removed `FourPanelLayout` (standardized on GmailLayout)

### Fixed
- Navigation 404 errors (gallery, brands, designer routes)
- Inconsistent terminology across UI
- Loading and error states
- Layout inconsistencies

### Technical
- Migration 13: Terminology cleanup
- Updated TypeScript types in `lib/supabase.ts`
- Standardized error handling patterns
- Implemented optimistic UI updates
```

**Create TERMINOLOGY_GUIDE.md:**
```markdown
# CardMock Terminology Guide

This guide ensures consistent terminology across the codebase and UI.

## Official Terms

### Brand
**What:** A company with its visual identity assets
**Includes:** Logo variants, color palettes, font information
**Database:** `brands` table, `logo_variants` table
**UI:** "Brand", "Brand Library", "Search Brands"
**Examples:** "Nike", "Spotify", "Apple"

### Asset
**What:** Custom design created by users
**Includes:** Combination of template + brand + positioning
**Database:** `assets` table (formerly card_mockups)
**UI:** "Asset", "Asset Gallery", "Create Asset"
**File naming:** asset-card.tsx, AssetGrid.tsx

### Template
**What:** Background image used in asset creation
**Database:** `templates` table (formerly card_templates)
**UI:** "Template", "Template Library"
**Examples:** Business card template, social media template

### Gallery
**What:** Collection of user-created assets
**Route:** `/gallery`
**UI:** "Asset Gallery", "Your Gallery"
**Replaces:** "Mockup Library"

## Deprecated Terms

### ❌ Logo
**Status:** DEPRECATED - Use "Brand" instead
**Reason:** Too narrow - brands include more than just logos
**Exception:** Can use in technical contexts (logo_variants table)

### ❌ Card
**Status:** DEPRECATED in UI - Use "Asset" instead
**Database:** Can keep in table names for backwards compatibility
**Exception:** Keep in `card_mockups` view, CardMockup type alias

### ❌ Mockup
**Status:** Avoid in UI - Use "Asset" instead
**Exception:** Internal technical term for rendered image

## Usage Examples

### ✅ Correct
- "Upload a brand to your library"
- "Create a new asset from this template"
- "View your asset gallery"
- "Select a template background"

### ❌ Incorrect
- "Upload a logo"
- "Create a new card mockup"
- "View your mockup library"
- "Select a card template"
```

#### 7.2 Create Testing Checklist

**Manual Testing Checklist:**

```markdown
## Testing Checklist - v3.5.0

### Navigation Tests
- [ ] Click "Gallery" in NavRail → Goes to /gallery (not 404)
- [ ] Click "Brands" in NavRail → Goes to /brands (not 404)
- [ ] Click "Designer" in NavRail → Goes to /designer (not 404)
- [ ] All sidebar navigation links work
- [ ] Breadcrumbs show correct routes

### Route Tests
- [ ] /designer loads successfully (formerly /card-designer)
- [ ] /gallery loads successfully (formerly /mockup-library)
- [ ] /brands loads successfully (new page)
- [ ] /card-designer redirects to /designer OR returns 404
- [ ] /mockup-library redirects to /gallery OR returns 404

### Database Migration Tests
- [ ] Run Migration 13 in Supabase SQL Editor
- [ ] Verify `assets` table exists
- [ ] Verify `templates` table exists
- [ ] Verify `card_mockups` view exists (compatibility)
- [ ] Verify `card_templates` view exists (compatibility)
- [ ] Existing assets still load in gallery
- [ ] Can create new asset
- [ ] Can upload new template

### Functionality Tests
- [ ] Create new asset in designer
- [ ] Upload brand from search
- [ ] Create project and assign assets
- [ ] Delete asset from gallery
- [ ] Create folder and move assets
- [ ] Upload template in admin
- [ ] Workflow assignment works

### UI Terminology Tests
- [ ] Designer page shows "Asset Designer" title
- [ ] Gallery page shows "Asset Gallery" title
- [ ] No references to "Card Designer" in UI
- [ ] No references to "Mockup Library" in UI
- [ ] Empty states use correct terminology
- [ ] Button labels consistent (Asset, Brand, Template)

### Server Component Tests
- [ ] Gallery page loads data server-side
- [ ] Projects page loads data server-side
- [ ] Brands page loads data server-side
- [ ] Loading states show during navigation
- [ ] Error boundaries catch errors gracefully

### Component Organization Tests
- [ ] BrandCard import works (moved from LogoCard)
- [ ] KonvaCanvas import works (moved to /designer)
- [ ] No broken imports after reorganization
- [ ] Barrel exports work correctly

### Error Handling Tests
- [ ] Trigger error in gallery → Shows error boundary
- [ ] Network error shows user-friendly message
- [ ] Form validation errors display correctly
- [ ] Toast notifications work

### Performance Tests
- [ ] Initial page load time acceptable
- [ ] Gallery scrolling smooth with many assets
- [ ] Designer canvas responsive
- [ ] No console errors in browser
```

#### 7.3 Version Bump & Git

**Update package.json:**
```json
{
  "name": "cardmock",
  "version": "3.5.0",
  "description": "Brand asset management and collaborative review platform"
}
```

**Git Commands:**
```bash
# Create feature branch
git checkout -b modernization-v3.5

# After all changes
git add .
git commit -m "feat: v3.5.0 - Terminology standardization and Next.js 15 modernization

- Renamed routes: /designer, /gallery, /brands
- Standardized terminology to Asset, Brand, Template
- Database migration: card_mockups → assets, card_templates → templates
- Implemented Server Components and Server Actions
- Reorganized component structure
- Added loading and error boundaries
- Updated documentation

BREAKING CHANGES:
- Routes renamed (old routes now 404)
- Database tables renamed (compatibility views provided)
- Component imports changed (moved to feature directories)"

# Create tag
git tag -a v3.5.0 -m "Version 3.5.0 - Modernization & Consistency"
```

---

## 📦 Final Deliverables Checklist

- [ ] All routes renamed and working
- [ ] Navigation pointing to correct routes
- [ ] UI terminology consistent (Asset, Brand, Template, Gallery)
- [ ] Database migration completed and tested
- [ ] TypeScript types updated
- [ ] Components reorganized by feature
- [ ] Server Components implemented where appropriate
- [ ] Server Actions created for key mutations
- [ ] Loading and error states added
- [ ] Documentation updated (README, CHANGELOG, Terminology Guide)
- [ ] Testing checklist completed
- [ ] Version bumped to 3.5.0
- [ ] Git commit and tag created

---

## 🚨 Risk Mitigation

### Before Starting
1. Create git branch: `git checkout -b modernization-v3.5`
2. Backup database (Supabase dashboard)
3. Note current deployment URL for rollback

### During Implementation
1. Test each phase before moving to next
2. Keep compatibility views active
3. Don't delete old code until replacement confirmed working

### Rollback Plan
If critical issues arise:

1. **Code Rollback:**
   ```bash
   git checkout main
   git branch -D modernization-v3.5
   ```

2. **Database Rollback:**
   ```sql
   DROP VIEW IF EXISTS card_mockups;
   DROP VIEW IF EXISTS card_templates;
   ALTER TABLE assets RENAME TO card_mockups;
   ALTER TABLE templates RENAME TO card_templates;
   ```

3. **Deployment Rollback:**
   - Revert to previous Vercel deployment
   - Or redeploy from main branch

---

## 📊 Success Metrics

### User Experience
- ✅ No 404 errors from navigation
- ✅ Consistent terminology across all pages
- ✅ Faster page loads (Server Components)
- ✅ Better error messages
- ✅ Smooth loading states

### Developer Experience
- ✅ Clearer code organization
- ✅ Easier to find related components
- ✅ Modern Next.js patterns
- ✅ Reduced API route boilerplate
- ✅ Better type safety

### Technical
- ✅ Reduced client-side JavaScript
- ✅ Improved Core Web Vitals
- ✅ Consistent database naming
- ✅ Removed deprecated code

---

## 📞 Support

If issues arise during implementation:
1. Check testing checklist
2. Review rollback plan
3. Consult this plan document
4. Reference Next.js 15 documentation

---

**Plan Status:** Ready for Implementation
**Estimated Timeline:** 5-6 hours
**Last Updated:** 2025-10-28
