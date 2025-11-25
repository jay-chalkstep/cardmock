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

### Left Sidebar
| Item | Notes |
|------|-------|
| Recents | Recently viewed/edited mockups |
| All Projects | Project folders |
| Assets | Brand assets library (Brandfetch + uploads) |
| Templates | Card template library |
| Trash | Deleted items |

### Main Content Area
- **Tabs:** Recently viewed · My mockups · Shared with me
- **Filters:** By project, file type, last edited
- **View toggle:** Grid / List
- **Cards:** Thumbnail + title + "Edited X ago"

### Top Bar
- Search
- New mockup button
- User menu (minimal)

---

## Feature Status

### ✅ KEEP (Visible)
| Feature | Notes |
|---------|-------|
| Brandfetch integration | Pull logos, colors, brand identity |
| Manual asset upload | Logos, artwork, brand elements |
| Projects & folders | Basic organization |
| Card template library | Prepaid card templates |
| Canvas/mockup builder | Konva.js composition |
| Comments/feedback | Pin comments on designs |
| Email notifications | Via Resend |

### 🔒 KEEP (Hidden/Dormant)
| Feature | Notes |
|---------|-------|
| Multi-stage approval workflows | Hide UI, preserve logic |
| Reviewer tracking | Keep tables, hide interface |
| Approval audit trail | Keep logging, hide display |
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
- `/` → Dashboard (Figma-style recents)
- `/projects` → All projects
- `/projects/[id]` → Project detail
- `/assets` → Asset library
- `/templates` → Template browser
- `/mockup/[id]` → Canvas editor
- `/mockup/[id]/review` → Feedback view (simplified)
- `/settings` → Basic settings only

### Remove
- `/contracts/*`
- `/clients/*`
- Any AI feature routes
- Complex approval management routes

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
