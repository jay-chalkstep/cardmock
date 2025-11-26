# CardMock v1

> Figma-inspired prepaid card mockup creation tool

**Infrastructure:**
- **Hosting**: Vercel
- **Repository**: GitHub
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Brand Data**: Brandfetch API
- **Email**: Resend (Phase 2)

---

## Overview

CardMock is a clean, focused tool for creating prepaid card mockups. Inspired by Figma's simplicity, it stays out of the way and lets users focus on asset creation and management.

### Key Features

- **Brandfetch Integration** — Pull logos, colors, and brand identity automatically
- **Brand Management** — Organize CardMocks by client/prospect (Brands)
- **Template Library** — Pre-loaded prepaid card templates
- **Canvas Designer** — Konva.js-powered mockup builder
- **Export** — PNG for quick sharing, PDF for print specs

---

## Terminology

| Term | Definition |
|------|------------|
| **CardMock** | The deliverable mockup asset (branded product name) |
| **Brand** | Client or prospect — the organizational container for CardMocks |
| **Template** | Card structure/background used in the designer |

---

## UI Structure

### Header
- Logo (CardMock branding)
- Global search
- **+ New CardMock** button (primary CTA)
- User menu (settings/logout)

### Left Sidebar
| Item | Description |
|------|-------------|
| Recents | Recent CardMocks across all brands (dashboard/home) |
| Brands | Client/prospect list — click to see that brand's CardMocks |
| Templates | Card template library |

### Designer (Full-Screen)
Not a nav item — opens when creating or editing a CardMock:
- Entry: "New CardMock" button → pick brand → pick template → canvas
- Entry: Inside a Brand → "New CardMock" → pick template → canvas
- Entry: Click existing CardMock → canvas opens for editing

---

## Routes

| Route | Description |
|-------|-------------|
| `/` | Recents — dashboard with recent CardMocks |
| `/brands` | Brand list |
| `/brands/[id]` | Brand detail with its CardMocks |
| `/templates` | Template browser |
| `/designer/[id]` | Full-screen canvas editor |
| `/settings` | Basic settings |

---

## Tech Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **Canvas**: Konva.js + React-Konva
- **Icons**: Lucide React

### Backend
- **Auth**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage (logos, templates, mockups)
- **Brand API**: Brandfetch
- **Email**: Resend (Phase 2)

---

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Brandfetch API key

### Installation

```bash
git clone https://github.com/jay-chalkstep/cardmock.git
cd cardmock
npm install
cp .env.example .env.local
# Fill in environment variables
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Brandfetch
NEXT_PUBLIC_BRANDFETCH_API_KEY=your_brandfetch_key

# Resend (Phase 2)
RESEND_API_KEY=re_your_resend_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

---

## Database

### Core Tables
- `brands` — Client/prospect data with Brandfetch info
- `logo_variants` — Logo files per brand (SVG, PNG, light/dark)
- `brand_colors` — Color palettes per brand
- `templates` — Card template backgrounds
- `assets` — Created CardMocks
- `folders` — Organization structure

### Storage Buckets
- `logos` — Brand logo files
- `card-templates` — Template backgrounds
- `card-mockups` — Exported CardMock images

---

## Development

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # Run ESLint
```

---

## Phase Roadmap

### Phase 1 (Current)
- Figma-style UI rebuild
- Brandfetch integration
- Template library
- Canvas mockup builder
- PNG + PDF export
- Basic organization (brands/folders)

### Phase 2 (Future)
- Sharing functionality
- External stakeholder access
- Approval workflows
- Comments/feedback
- Email notifications

---

## Links

- **Repository**: [github.com/jay-chalkstep/cardmock](https://github.com/jay-chalkstep/cardmock)
- **Scope Document**: [cardmock-scope.md](./cardmock-scope.md)
- **Changelog**: [documentation/CHANGELOG.md](./documentation/CHANGELOG.md)

---

**CardMock** — Prepaid card mockup creation, simplified.
