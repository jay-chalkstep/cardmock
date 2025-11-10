# Client EIN, User Association, Hierarchy, and Brand Association

## Overview
Add EIN field to client profiles, implement user-client association system (one-to-many), add client hierarchy support for multi-level relationships (e.g., Energy Hub → ComEd), add brand-client association, enforce client assignment for Client-role users, and set up automatic client assignment during user creation/invitation.

## Database Changes

### 1. Add EIN Field to Clients Table
**File**: `supabase/25_client_ein_and_user_association.sql`

- Add `ein` column to `clients` table (TEXT, nullable)
- Add index on `ein` for lookups
- Update `updated_at` trigger to fire on EIN changes

### 2. Add Client Hierarchy Support
**File**: `supabase/25_client_ein_and_user_association.sql`

- Add `parent_client_id` column to `clients` table (UUID, nullable, references clients(id) ON DELETE SET NULL)
- Add index on `parent_client_id` for hierarchy queries
- Add constraint to prevent circular references (client cannot be its own parent)
- Enables multi-level client relationships (e.g., Choice Digital → Energy Hub → ComEd)
- Allows querying "all child clients" of a parent client
- Supports use case: Energy Hub is parent, ComEd is child

### 3. Create User-Client Association Table
**File**: `supabase/25_client_ein_and_user_association.sql`

Create `client_users` table:
- `id` (UUID, primary key)
- `client_id` (UUID, references clients, ON DELETE CASCADE)
- `user_id` (TEXT, Clerk user ID, NOT NULL)
- `organization_id` (TEXT, Clerk org ID, NOT NULL)
- `assigned_by` (TEXT, Clerk user ID who assigned)
- `assigned_at` (TIMESTAMPTZ, default NOW())
- `created_at`, `updated_at` (timestamps)
- Unique constraint on `(user_id, organization_id)` - one client per user per org
- Index on `client_id` for lookups
- Index on `user_id` for user lookups
- RLS policies (allow all for authenticated users in org)

### 4. Add Brand-Client Association
**File**: `supabase/25_client_ein_and_user_association.sql`

- Add `client_id` column to `brands` table (UUID, nullable, references clients(id) ON DELETE SET NULL)
- Add index on `client_id` for client-brand lookups
- Allows associating brands found via brand search with clients
- Enables client-specific brand libraries (e.g., SoCalGas brand, ComEd brand)
- Supports filtering brands by client for Client-role users
- Brands can exist without client association (org-level brands)

## API Changes

### 1. Update Client API Routes
**File**: `app/api/clients/route.ts`
- Add `ein` to POST body validation and insert
- Add `parent_client_id` to POST body validation and insert
- Add `ein` and `parent_client_id` to GET response
- Add filtering by `parent_client_id` (e.g., GET /api/clients?parent_client_id=xxx)
- Add endpoint to get child clients: GET /api/clients/[id]/children

**File**: `app/api/clients/[id]/route.ts`
- Add `ein` to PATCH body validation and update
- Add `parent_client_id` to PATCH body validation and update
- Validate `parent_client_id` doesn't create circular reference
- Add `ein` and `parent_client_id` to GET response

**File**: `app/api/clients/[id]/children/route.ts` (NEW)
- `GET` - Get all child clients of a parent client
- Returns list of clients where `parent_client_id` matches

### 2. Create User-Client Association API
**File**: `app/api/clients/[id]/users/route.ts` (NEW)
- `GET` - List all users assigned to a client
- `POST` - Assign a user to a client
  - Body: `{ user_id: string }`
  - Validate user exists in org
  - Validate user has Client role
  - Check if user already has a client assigned (enforce one-to-many)
  - Create `client_users` record

**File**: `app/api/clients/[id]/users/[userId]/route.ts` (NEW)
- `DELETE` - Remove user from client
  - Validate user is assigned to this client
  - Delete `client_users` record

**File**: `app/api/users/[userId]/client/route.ts` (NEW)
- `GET` - Get client assigned to a user
  - Returns client object or null
- `PATCH` - Update user's client assignment
  - Body: `{ client_id: string }`
  - Validate client exists in org
  - Remove old assignment if exists
  - Create new assignment

### 3. Update Brand API Routes
**File**: `app/api/brands/route.ts` (or brand-related API)
- Add `client_id` to POST body validation and insert
- Add `client_id` to GET query params for filtering
- Filter brands by `client_id` for Client-role users (only show their client's brands)
- For Client-role users: Only return brands where `client_id` matches user's assigned client
- For admin/member users: Return all brands (no filtering)

**File**: `app/api/brands/[id]/route.ts`
- Add `client_id` to PATCH body validation and update
- Add `client_id` to GET response

### 4. Create Clerk Webhook Handler
**File**: `app/api/webhooks/clerk/route.ts` (NEW)
- Handle `user.created` event
- Handle `organizationMembership.created` event
- Handle `organizationMembership.updated` event (role changed to Client)
- Check if user has `org:client` role
- If Client role and no client assigned:
  - Log warning (client assignment required)
  - Optionally: Auto-assign based on email domain matching client email domain
  - Or: Create notification for admin to assign client

**Webhook Events to Handle**:
- `user.created` - New user signup
- `organizationMembership.created` - User invited/added to org
- `organizationMembership.updated` - Role changed to Client

**Webhook Security**:
- Verify Clerk webhook signature
- Validate event payload
- Handle duplicate events (idempotency)

### 5. Update Auth Context
**File**: `lib/api/auth.ts` or new helper
- Add function to check if user has Client role
- Add function to get user's assigned client
- Add function to get user's client hierarchy (parent + children)
- Add middleware to enforce client assignment for Client-role users

## UI Changes

### 1. Update Client Modals
**File**: `components/clients/NewClientModal.tsx`
- Add EIN input field (optional)
- Add validation for EIN format (optional)
- Add parent client selector (dropdown of existing clients)
- Show client hierarchy in selector (indent child clients)
- Prevent selecting self as parent

**File**: `components/clients/EditClientModal.tsx`
- Add EIN input field
- Add parent client selector
- Pre-populate EIN and parent_client_id from client data
- Prevent selecting self or creating circular references

### 2. Update Client Detail Page
**File**: `app/(dashboard)/clients/[id]/page.tsx`
- Add EIN display in Overview tab
- Add parent client display in Overview tab (with link to parent)
- Add "Child Clients" section in Overview tab (list of child clients)
- Add "Assigned Users" tab showing users assigned to this client
- Show user list with remove option (admin only)
- Add "Assign User" button (admin only)
- Show client hierarchy breadcrumb (e.g., Energy Hub > ComEd)

### 3. Create User Assignment Modal
**File**: `components/clients/AssignUserModal.tsx` (NEW)
- Search/select users with Client role
- Filter out users already assigned to a client
- Assign selected user to client

### 4. Client Role Access Enforcement
**File**: `app/(dashboard)/contracts/page.tsx`
- Check if user has Client role
- If Client role: Filter contracts to only show contracts for user's assigned client
- Show message if no client assigned

**File**: `app/(dashboard)/contracts/[id]/page.tsx`
- Check if user has Client role
- If Client role: Verify contract belongs to user's assigned client
- Redirect to contracts list if access denied

**File**: `app/(dashboard)/projects/page.tsx`
- Similar filtering for Client-role users

**File**: `app/(dashboard)/brands/page.tsx` or brand-related pages
- Check if user has Client role
- If Client role: Filter brands to only show brands where `client_id` matches user's assigned client
- Hide brand search/upload for Client-role users (read-only access)
- Show message: "Showing brands for [Client Name]"

**File**: `app/(dashboard)/library/page.tsx`
- Filter assets by client for Client-role users
- Only show assets linked to user's assigned client

### 5. Client Assignment UI (Admin)
**File**: `app/(dashboard)/admin/users/page.tsx` (NEW or update existing)
- List all users with Client role
- Show assigned client (or "Not Assigned")
- Allow admin to assign/change client assignment
- Show warning for Client-role users without assignment

## TypeScript Types

### 1. Update Client Interface
**File**: `lib/supabase.ts`
- Add `ein?: string` to `Client` interface
- Add `parent_client_id?: string` to `Client` interface
- Add `parent_client?: Client` (optional relation)
- Add `child_clients?: Client[]` (optional relation)

### 2. Add ClientUser Interface
**File**: `lib/supabase.ts`
```typescript
export interface ClientUser {
  id: string;
  client_id: string;
  user_id: string;
  organization_id: string;
  assigned_by: string;
  assigned_at: string;
  created_at: string;
  updated_at: string;
  client?: Client; // Optional relation
}
```

### 3. Update Brand Interface
**File**: `lib/supabase.ts`
- Add `client_id?: string` to `Brand` interface
- Add `client?: Client` (optional relation)

## Access Control Logic

### Client-Role User Flow
1. User signs up/invited with Client role
2. Webhook handler checks for client assignment
3. If no assignment: User sees "Client Assignment Required" message
4. Admin assigns client to user
5. User can now access contracts/projects/brands for their assigned client only

### API Route Protection
- All contract/project/brand API routes check user role
- If Client role: Filter by `client_id` from `client_users` table
- If no client assigned: Return 403 Forbidden
- Client hierarchy: ComEd user sees only ComEd data, not Energy Hub data

### Client Hierarchy Access
- When filtering by client, include child clients in results (if needed)
- ComEd user sees ComEd contracts/assets/brands, not Energy Hub's
- Energy Hub user sees Energy Hub contracts/assets/brands, not ComEd's
- Choice Digital users see all clients (no filtering)

## UI Enhancements

### Client Hierarchy Display
- Show parent → child relationship in client list (e.g., "Energy Hub > ComEd")
- Indent child clients in dropdowns/selectors
- Breadcrumb navigation for client hierarchy
- Visual tree view for client relationships (future enhancement)

### Brand-Client Association UI
- Add client selector when creating/editing brands
- Show client name on brand cards/list items
- Filter brands by client in brand library
- Client-role users see filtered brand view automatically

## Migration Order

1. Run database migration `25_client_ein_and_user_association.sql`
   - Add EIN to clients
   - Add parent_client_id to clients
   - Create client_users table
   - Add client_id to brands
2. Update TypeScript interfaces (Client, Brand, ClientUser)
3. Update API routes:
   - Client routes (EIN, parent_client_id, children endpoint)
   - Brand routes (client_id filtering)
   - New user-client routes
4. Create Clerk webhook handler
5. Update UI components:
   - Client modals (EIN, parent client selector)
   - Client detail page (hierarchy display)
   - Brand pages (client filtering for Client-role users)
6. Add access control enforcement:
   - Contract/project filtering
   - Brand filtering
   - Asset filtering
7. Test end-to-end flow:
   - Direct relationship (Choice Digital → SoCalGas)
   - Two-step relationship (Choice Digital → Energy Hub → ComEd)
   - Client hierarchy navigation
   - Brand-client association

## Testing Checklist

### Client Fields
- [ ] EIN field appears in client create/edit modals
- [ ] EIN saved and retrieved correctly
- [ ] Parent client selector works in client modals
- [ ] Client hierarchy displayed correctly (parent → child)
- [ ] Circular reference prevention works

### User-Client Association
- [ ] User-client assignment API works
- [ ] Clerk webhook handles user creation/invitation
- [ ] Client-role users without assignment see warning
- [ ] Admin can assign/change client assignments
- [ ] Client detail page shows assigned users

### Brand-Client Association
- [ ] Client selector appears when creating/editing brands
- [ ] Brands can be associated with clients
- [ ] Client-role users only see their client's brands
- [ ] Brand filtering by client works
- [ ] Brand search respects client filtering for Client-role users

### Access Control
- [ ] Client-role users can only see their assigned client's contracts
- [ ] Client-role users can only see their assigned client's projects
- [ ] Client-role users can only see their assigned client's brands
- [ ] Client-role users can only see their assigned client's assets
- [ ] Access control blocks unauthorized access
- [ ] Client hierarchy filtering works (ComEd user doesn't see Energy Hub data)

### Use Case Validation
- [ ] Direct relationship: SoCalGas user sees only SoCalGas brands/contracts
- [ ] Two-step relationship: ComEd user sees only ComEd brands/contracts
- [ ] Two-step relationship: Energy Hub user sees only Energy Hub brands/contracts
- [ ] Choice Digital users see all clients/brands/contracts



