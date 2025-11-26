# CardMock v1 — Build Plan

**Last Updated:** 2025-11-26
**Target Version:** v1.0.0
**Status:** Planning

---

## Overview

This plan outlines the work required to rebuild CardMock as a focused, Figma-inspired prepaid card mockup creation tool. The goal is to strip away complexity and deliver a clean, simple experience.

**Reference:** See [cardmock-scope.md](../cardmock-scope.md) for the complete scope definition.

---

## Phase 1: Authentication Migration

**Goal:** Replace Clerk with Supabase Auth

### Tasks

- [ ] Remove Clerk dependencies from `package.json`
- [ ] Delete Clerk-related files:
  - `middleware.ts` (Clerk middleware)
  - `app/sign-in/` directory
  - `app/sign-up/` directory
- [ ] Set up Supabase Auth:
  - Configure auth in Supabase dashboard
  - Create `lib/supabase/auth.ts` utilities
  - Implement sign-in/sign-up pages with Supabase
- [ ] Update environment variables (remove `CLERK_*`, keep `SUPABASE_*`)
- [ ] Update all API routes to use Supabase Auth
- [ ] Update client-side auth hooks
- [ ] Remove organization/multi-tenant logic (simplify to single-user for v1)

### Files to Modify
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/api/auth.ts`
- All API routes using `getAuthContext()`

---

## Phase 2: UI Rebuild (Figma-Style)

**Goal:** Clean, minimal navigation with Recents/Brands/Templates structure

### 2.1 Header Rebuild

- [ ] Create new `AppHeader.tsx`:
  - CardMock logo (left)
  - Global search (center)
  - **+ New CardMock** button (primary CTA)
  - User menu with settings/logout (right)
- [ ] Remove complex header elements (notifications bell, etc.)

### 2.2 Left Sidebar Rebuild

- [ ] Create new `Sidebar.tsx` with three items:
  - **Recents** — Links to `/` (dashboard)
  - **Brands** — Links to `/brands`
  - **Templates** — Links to `/templates`
- [ ] Remove old navigation items:
  - Projects
  - Gallery
  - My Stage Reviews
  - Admin menu items
- [ ] Style to match Figma aesthetic (clean, minimal)

### 2.3 Main Content Grid

- [ ] Create reusable `CardGrid.tsx` component:
  - Thumbnail + title + "Edited X ago"
  - Grid/List view toggle
  - Filter by date, status
- [ ] Implement for CardMocks and Brands

### Files to Create
- `components/layout/AppHeader.tsx`
- `components/layout/Sidebar.tsx`
- `components/ui/CardGrid.tsx`
- `components/ui/CardGridItem.tsx`

### Files to Delete/Replace
- `components/navigation/NavRail.tsx`
- `components/SidebarSimple.tsx`
- `components/GmailLayout.tsx` (replace with simpler layout)

---

## Phase 3: Route Restructuring

**Goal:** Simplified route structure matching the scope

### Routes to Keep/Create

| Route | Purpose | Status |
|-------|---------|--------|
| `/` | Recents dashboard | Modify existing |
| `/brands` | Brand list | Already exists |
| `/brands/[id]` | Brand detail + CardMocks | Modify existing |
| `/templates` | Template browser | Create new |
| `/designer/[id]` | Full-screen canvas | Modify existing |
| `/settings` | Basic settings | Simplify existing |

### Routes to Remove

- [ ] Delete `/projects/*` (replaced by Brands)
- [ ] Delete `/clients/*`
- [ ] Delete `/contracts/*`
- [ ] Delete `/admin/*` (workflows, users, templates admin)
- [ ] Delete `/my-stage-reviews/*`
- [ ] Delete `/gallery/*` (merged into Brands)
- [ ] Delete `/search/*` (merged into global search)
- [ ] Delete any AI-related routes
- [ ] Delete integration routes (Gmail, Slack, etc.)

### Dashboard (`/`) Changes

- [ ] Show recent CardMocks across all brands
- [ ] Remove project/workflow widgets
- [ ] Simple grid of recent work

### Brands (`/brands/[id]`) Changes

- [ ] Show brand info (logo, colors from Brandfetch)
- [ ] Grid of CardMocks for this brand
- [ ] "New CardMock" button → opens designer

### Designer (`/designer/[id]`) Changes

- [ ] Full-screen canvas mode
- [ ] Brand selector (if creating new)
- [ ] Template selector
- [ ] Keep Konva.js canvas functionality
- [ ] PNG + PDF export

---

## Phase 4: Code Cleanup

**Goal:** Remove all unused features and dead code

### 4.1 Remove Contract Management

- [ ] Delete `app/(dashboard)/contracts/` directory
- [ ] Delete `app/api/contracts/` directory
- [ ] Delete `components/contracts/` directory
- [ ] Delete `lib/docusign/` directory
- [ ] Remove contract-related types from `lib/supabase.ts`

### 4.2 Remove Client Management

- [ ] Delete `app/(dashboard)/clients/` directory
- [ ] Delete `app/api/clients/` directory
- [ ] Delete client-related components
- [ ] Remove client types

### 4.3 Remove AI Features

- [ ] Delete `app/api/ai/` directory (if still exists)
- [ ] Delete `components/ai/` directory (if still exists)
- [ ] Delete `lib/ai/` directory (if still exists)
- [ ] Remove OpenAI dependencies

### 4.4 Remove Platform Integrations

- [ ] Delete Gmail integration code
- [ ] Delete Slack integration code
- [ ] Delete Drive/Dropbox import code
- [ ] Delete presentation mode code
- [ ] Delete public sharing code

### 4.5 Remove Complex Approval System

- [ ] Delete `app/(dashboard)/my-stage-reviews/` directory
- [ ] Delete `components/approvals/` directory
- [ ] Delete approval-related API routes
- [ ] Keep database tables (dormant for Phase 2)

### 4.6 Remove Complex Settings

- [ ] Simplify settings modal to basics only
- [ ] Remove organization management
- [ ] Remove notification preferences (Phase 2)

---

## Phase 5: Database Cleanup

**Goal:** Clean up unused tables while preserving core data

### Tables to Keep
- `brands`
- `logo_variants`
- `brand_colors`
- `brand_fonts`
- `templates`
- `assets`
- `folders`

### Tables to Keep (Dormant)
- `approvals` / `approval_stages`
- `mockup_comments`
- `mockup_reviewers`
- `notifications`
- `workflows`

### Tables to Drop
- [ ] `contracts`
- [ ] `contract_versions`
- [ ] `contract_documents`
- [ ] `clients`
- [ ] `client_contacts`
- [ ] `client_user_associations`
- [ ] AI-related tables
- [ ] Integration tables (Gmail, Slack, etc.)
- [ ] Public sharing tables

### Migration Script
- [ ] Create `supabase/cleanup_v1.sql` migration
- [ ] Drop unused tables
- [ ] Clean up orphaned data

---

## Phase 6: Component Organization

**Goal:** Clean component structure for v1

### New Structure

```
components/
├── layout/
│   ├── AppHeader.tsx
│   ├── Sidebar.tsx
│   └── PageLayout.tsx
├── ui/
│   ├── CardGrid.tsx
│   ├── CardGridItem.tsx
│   ├── Button.tsx
│   ├── Modal.tsx
│   └── Toast.tsx
├── brands/
│   ├── BrandCard.tsx
│   ├── BrandDetail.tsx
│   └── BrandSearch.tsx
├── designer/
│   ├── Canvas.tsx
│   ├── TemplateSelector.tsx
│   ├── BrandSelector.tsx
│   └── ExportPanel.tsx
└── templates/
    ├── TemplateCard.tsx
    └── TemplateGrid.tsx
```

### Components to Delete
- All `components/contracts/`
- All `components/collaboration/` (Phase 2)
- All `components/approvals/`
- All `components/projects/` (replaced by Brands)
- Complex navigation components

---

## Phase 7: Polish & Testing

### UI Polish
- [ ] Consistent styling across all pages
- [ ] Loading states for all async operations
- [ ] Error boundaries and error messages
- [ ] Empty states for lists

### Testing Checklist
- [ ] Auth flow (sign up, sign in, sign out)
- [ ] Create new Brand (via Brandfetch)
- [ ] Upload manual brand assets
- [ ] Browse templates
- [ ] Create CardMock in designer
- [ ] Export PNG
- [ ] Export PDF
- [ ] Basic settings work

---

## Implementation Order

1. **Auth Migration** — Foundation for everything else
2. **Route Cleanup** — Remove unused routes first
3. **Code Cleanup** — Delete unused code
4. **UI Rebuild** — New header/sidebar/layout
5. **Page Updates** — Update remaining pages
6. **Database Cleanup** — Clean up tables last
7. **Polish** — Final testing and fixes

---

## Success Criteria

- [ ] Clean Figma-inspired UI
- [ ] Supabase Auth working
- [ ] Brands contain CardMocks (replaces Projects)
- [ ] Designer works with templates
- [ ] PNG + PDF export functional
- [ ] No dead code or unused routes
- [ ] Fast, responsive experience

---

## Notes

- Keep approval/workflow tables dormant for Phase 2
- Focus on core CardMock creation flow
- Prioritize simplicity over features
- Reference `cardmock-scope.md` for any scope questions

---

**This plan should be updated as work progresses.**
