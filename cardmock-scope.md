# CardMock v1 — Scope Definition

## Vision
Figma-inspired UI focused purely on prepaid card mockup creation. Clean, familiar, stays out of the way. Users live in the asset creation and management flow.

---

## Infrastructure (Confirmed)
- GitHub → version control
- Vercel → deployment
- Supabase → database + storage + auth
- Brandfetch → logo/brand identity lookup
- Resend → email notifications (Phase 2)

---

## UI Structure (Figma-Inspired)

### Terminology
- **CardMock** — The deliverable mockup asset (branded name)
- **Brand** — Client or prospect (replaces "projects" as the organizational container)
- **Template** — Card structure/background

### Header (Top Bar)
| Element | Notes |
|---------|-------|
| Logo | CardMock branding |
| Search | Global search |
| + New CardMock | Primary CTA, always visible |
| User menu | Minimal settings/logout |

### Left Sidebar
| Item | What it shows |
|------|---------------|
| Recents | Recent CardMocks across all brands (home/dashboard) |
| Brands | Client/prospect list — click into a brand to see its CardMocks |
| Templates | Card template library |

### Main Content Area
- **Grid view** of CardMocks or Brands
- **Filters:** By date, status
- **View toggle:** Grid / List
- **Cards:** Thumbnail + title + "Edited X ago"

### Designer (Full-Screen Mode)
Not a nav item — opens when creating or editing a CardMock:
- **Entry points:**
  - "New CardMock" button in header → pick brand → pick template → canvas
  - Inside a Brand → "New CardMock" → pick template → canvas
  - Click existing CardMock → canvas opens for editing
- **Canvas:** Konva.js mockup builder with brand assets + template

---

## Feature Status

### ✅ KEEP (Visible)
| Feature | Notes |
|---------|-------|
| Brandfetch integration | Pull logos, colors, brand identity |
| Manual asset upload | Logos, artwork, brand elements |
| Brands | Container for CardMocks (replaces projects/clients) |
| Card template library | Prepaid card templates |
| Canvas/mockup builder | Konva.js composition (full-screen designer) |
| Email notifications | Via Resend |

### 🔒 KEEP (Hidden/Dormant)
| Feature | Notes |
|---------|-------|
| Multi-stage approval workflows | Hide UI, preserve logic |
| Reviewer tracking | Keep tables, hide interface |
| Approval audit trail | Keep logging, hide display |
| Comments/feedback | Keep for Phase 2 |
| Notification system | Simplify to essentials |

### ❌ CUT (Remove)
| Feature | Notes |
|---------|-------|
| AI feedback summarization | Remove entirely |
| Contract management | Remove routes, components, tables |
| Client database/CRM | Remove |
| Complex settings modal | Strip to basics |
| Any CDCO/Choice Digital branding | Clean slate |

---

## Database Cleanup

### Tables to KEEP
- users, organizations (Clerk-managed)
- projects, folders
- assets, asset_versions
- mockups, mockup_versions
- templates
- comments, annotations
- approvals, approval_stages (dormant)
- notifications (simplified)

### Tables to DROP
- contracts, contract_versions
- clients, client_contacts
- Any AI-related tables (feedback_summaries, etc.)

---

## Routes/Pages

### Keep
- `/` → Recents (dashboard with recent CardMocks)
- `/brands` → Brand list
- `/brands/[id]` → Brand detail with its CardMocks
- `/templates` → Template browser
- `/designer/[id]` → Full-screen canvas editor (opens for new or existing CardMock)
- `/settings` → Basic settings only

### Remove
- `/projects/*` → Replaced by Brands
- `/clients/*`
- `/contracts/*`
- Any AI feature routes
- Complex approval management routes
- Integration routes (Gmail, Slack, Drive, etc.)

---

## Phase 1 Priorities

1. **Figma-style navigation** — Rebuild left sidebar + main content grid
2. **Clean up dead code** — Remove contract/client/AI references
3. **Simplify approval UI** — Keep backend, hide complex UI
4. **Polish asset flow** — Upload → Organize → Use in mockups
5. **Template experience** — Browse → Select → Customize

---

## Decisions Locked

- **Sharing:** Phase 2. V1 is internal-only, focused on asset creation.
- **Auth:** Supabase Auth (Clerk removed)
- **Templates:** Pre-loaded set of card templates shipping with v1
- **Export:** PNG (quick downloads for sales/comms) + PDF (print specs for developers/printers)

---

## Phase Roadmap

### Phase 1 (Current)
- Figma-style UI rebuild
- Asset upload + Brandfetch integration
- Template library with pre-loaded cards
- Canvas mockup builder
- PNG + PDF export
- Basic project/folder organization

### Phase 2 (Future)
- Resurrect sharing functionality
- External stakeholder access
- Approval workflows (unhide)
- Comments/feedback loop
- Email notifications for reviewers