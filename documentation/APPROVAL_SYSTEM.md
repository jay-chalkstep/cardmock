# User-Level Approval System

## Overview

The CardMock platform features a comprehensive user-level approval tracking system that ensures all assigned reviewers approve assets before they advance through workflow stages. This system provides granular approval tracking, progress visibility, and project owner final sign-off.

## Key Features

- **Individual Reviewer Tracking**: Every reviewer's approval is tracked separately (not just one approval per stage)
- **All-Must-Approve**: Assets only advance when ALL assigned reviewers for a stage have approved
- **Project Owner Final Approval**: After all workflow stages complete, the project owner must give final approval
- **Rich Progress Visibility**: Real-time approval progress with timelines and status indicators
- **Quick Approve**: One-click approval from dashboard or detail page
- **Email Notifications**: Automatic notifications at every step of the approval process
- **Approval History**: Complete audit trail of who approved when, with notes

## Architecture

### Database Schema

#### mockup_stage_user_approvals Table
Tracks individual user approvals for each mockup at each stage.

```sql
CREATE TABLE mockup_stage_user_approvals (
  id UUID PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES assets(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  stage_order INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_image_url TEXT,
  action TEXT NOT NULL CHECK (action IN ('approve', 'request_changes')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_stage_asset UNIQUE(asset_id, stage_order, user_id)
);
```

#### Enhanced mockup_stage_progress Table
Extended to track approval counts.

```sql
ALTER TABLE mockup_stage_progress
  ADD COLUMN approvals_required INTEGER DEFAULT 0,
  ADD COLUMN approvals_received INTEGER DEFAULT 0;
```

#### Enhanced assets Table
Extended to track final approval.

```sql
ALTER TABLE assets
  ADD COLUMN final_approved_by TEXT,
  ADD COLUMN final_approved_at TIMESTAMPTZ,
  ADD COLUMN final_approval_notes TEXT;
```

#### New Stage Status
Added to `stage_status` enum:

```sql
ALTER TYPE stage_status ADD VALUE 'pending_final_approval';
```

### Database Functions

#### count_stage_reviewers()
Counts the number of reviewers assigned to a specific stage.

```sql
CREATE OR REPLACE FUNCTION count_stage_reviewers(
  p_project_id UUID,
  p_stage_order INT
) RETURNS INT
```

#### check_stage_approval_complete()
Checks if all reviewers for a stage have approved.

```sql
CREATE OR REPLACE FUNCTION check_stage_approval_complete(
  p_asset_id UUID,
  p_stage_order INT
) RETURNS BOOLEAN
```

#### increment_stage_approval_count()
Atomically increments the approval count for a stage.

```sql
CREATE OR REPLACE FUNCTION increment_stage_approval_count(
  p_asset_id UUID,
  p_stage_order INT
) RETURNS VOID
```

#### record_final_approval()
Records the project owner's final approval.

```sql
CREATE OR REPLACE FUNCTION record_final_approval(
  p_asset_id UUID,
  p_approved_by TEXT,
  p_notes TEXT DEFAULT NULL
) RETURNS VOID
```

#### advance_to_next_stage() - Enhanced
Updated to handle final approval state when reaching the end of workflow.

```sql
CREATE OR REPLACE FUNCTION advance_to_next_stage(
  p_asset_id UUID
) RETURNS INT
```

#### initialize_mockup_stage_progress() - Enhanced
Updated to set initial `approvals_required` count for each stage.

```sql
CREATE OR REPLACE FUNCTION initialize_mockup_stage_progress(
  p_asset_id UUID,
  p_project_id UUID,
  p_org_id TEXT
) RETURNS VOID
```

## API Endpoints

### POST /api/mockups/[id]/approve
Records an individual user's approval for the current stage.

**Request:**
```json
{
  "notes": "Looks great! Approved."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Approval recorded",
  "stage_complete": false,
  "approvals": {
    "received": 2,
    "required": 3
  }
}
```

**Flow:**
1. Verifies user is assigned reviewer for current stage
2. Checks user hasn't already approved
3. Records approval in `mockup_stage_user_approvals`
4. Increments `approvals_received` count
5. Checks if all reviewers have approved
6. If complete, advances to next stage or sets `pending_final_approval`

### POST /api/mockups/[id]/final-approve
Records the project owner's final approval after all stages are complete.

**Request:**
```json
{
  "notes": "Excellent work team! Ready for production."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Final approval recorded",
  "asset": {
    "id": "...",
    "status": "approved",
    "final_approved_by": "user_...",
    "final_approved_at": "2025-01-15T..."
  }
}
```

**Authorization:**
- Must be project creator OR organization admin

### GET /api/mockups/[id]/approvals
Fetches complete approval data for an asset.

**Response:**
```json
{
  "approvals_by_stage": {
    "1": [
      {
        "id": "...",
        "user_id": "user_...",
        "user_name": "John Doe",
        "action": "approve",
        "notes": "LGTM",
        "created_at": "..."
      }
    ]
  },
  "progress_summary": {
    "1": {
      "approvals_received": 3,
      "approvals_required": 3,
      "is_complete": true
    }
  },
  "final_approval": {
    "approved_by": "user_...",
    "approved_at": "...",
    "notes": "Ready for production"
  }
}
```

## UI Components

### ApprovalStatusBanner
**File:** `components/approvals/ApprovalStatusBanner.tsx`

Displays approval progress for the current stage on the mockup detail page.

**Features:**
- Progress counter (X of Y approved)
- Progress bar visualization
- List of all reviewers with status icons (✓ approved, ⏱ pending, ✗ changes)
- Approve / Request Changes buttons for assigned reviewers
- Shows if current user has already approved
- Collapsible design
- Color-coded by workflow stage

**Props:**
```typescript
interface ApprovalStatusBannerProps {
  stageProgress: AssetStageProgress;
  currentUserId: string;
  isCurrentUserReviewer: boolean;
  hasCurrentUserApproved: boolean;
  onApprove: (notes?: string) => Promise<void>;
  onRequestChanges: (notes: string) => Promise<void>;
  isProcessing?: boolean;
}
```

### ApprovalTimelinePanel
**File:** `components/approvals/ApprovalTimelinePanel.tsx`

Shows chronological timeline of all approvals across all stages.

**Features:**
- Chronological timeline display
- User avatars and names
- Relative timestamps (e.g., "2h ago")
- Stage badges with colors
- Approval vs request-changes icons
- Reviewer notes display
- Final approval section with crown icon
- Stage progress summary at bottom

**Props:**
```typescript
interface ApprovalTimelinePanelProps {
  approvalSummary: AssetApprovalSummary;
  stages: WorkflowStage[];
}
```

### FinalApprovalBanner
**File:** `components/approvals/FinalApprovalBanner.tsx`

Special banner shown to project owners when final approval is needed.

**Features:**
- Crown icon with purple/blue gradient
- Shows total stages completed
- Optional notes input
- "Give Final Approval" button with gradient styling
- "What happens next?" helper text
- Collapsible design

**Props:**
```typescript
interface FinalApprovalBannerProps {
  mockupName: string;
  projectName: string;
  totalStages: number;
  onFinalApprove: (notes?: string) => void;
  isProcessing?: boolean;
}
```

### ReviewListItem (Enhanced)
**File:** `components/lists/ReviewListItem.tsx`

Individual review item with quick approve functionality.

**New Props:**
```typescript
interface ReviewListItemProps {
  // ... existing props
  onQuickApprove?: () => Promise<void>;
  hasUserApproved?: boolean;
}
```

**Features:**
- Quick Approve button (green with check icon)
- Loading state during approval
- Shows "Approved" badge after approval
- Prevents duplicate approvals

## Email Notifications

**File:** `lib/email/approval-notifications.ts`

### sendUserApprovalNotification()
Sent to other reviewers when someone approves.

**When:** After a user successfully approves
**Recipients:** All OTHER reviewers for that stage who haven't approved yet
**Content:**
- Who approved
- Progress bar (X of Y approvals)
- How many more approvals needed
- Link to review

### sendStageCompleteNotification()
Sent to next stage reviewers when a stage completes.

**When:** All reviewers in a stage have approved
**Recipients:** All reviewers assigned to the NEXT stage
**Content:**
- Previous stage name (completed)
- Next stage name (now active)
- Stage progression visual
- Link to review

### sendFinalApprovalNeededNotification()
Sent to project owner when all stages are done.

**When:** Last workflow stage completes
**Recipients:** Project creator
**Content:**
- Crown icon styling
- All X stages completed message
- Emphasizes owner's final authority
- Link to give final approval

### sendFinalApprovalCompleteNotification()
Sent to all stakeholders when asset is fully approved.

**When:** Project owner gives final approval
**Recipients:**
- Asset creator
- All reviewers who participated
- Project collaborators
**Content:**
- Celebration styling
- Checkmark list of accomplishments
- Final approval details
- Link to view approved asset

## Workflow Examples

### Example 1: Simple 2-Stage Workflow

**Setup:**
- Stage 1 (Design Review): 2 reviewers assigned
- Stage 2 (Quality Check): 1 reviewer assigned
- Project owner: Alice

**Flow:**
1. Asset submitted to Stage 1
2. Reviewer A approves → Email to Reviewer B (progress update)
3. Reviewer B approves → Stage 1 complete → Email to Stage 2 reviewer
4. Stage 2 reviewer approves → Email to Alice (final approval needed)
5. Alice gives final approval → Email to everyone (fully approved)

### Example 2: Changes Requested

**Setup:**
- Stage 1: 3 reviewers assigned

**Flow:**
1. Reviewer A approves
2. Reviewer B approves
3. Reviewer C requests changes with notes
4. Asset sent back to Stage 1
5. All approval counts reset to 0
6. Process starts over

### Example 3: Quick Approve from Dashboard

**Flow:**
1. User navigates to "My Reviews" dashboard
2. Sees pending review in list
3. Clicks "Quick Approve" button
4. Approval recorded immediately
5. Button changes to "Approved" badge
6. Other reviewers get progress notification

## Setup Instructions

### 1. Run Database Migration

Execute migration 18 in your Supabase project:

```bash
# In Supabase SQL Editor:
supabase/18_user_level_approvals.sql
```

This creates:
- `mockup_stage_user_approvals` table
- New database functions
- Enhanced existing functions
- New enum values

### 2. Configure SendGrid (if not already done)

Set environment variables:

```env
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=CardMock
```

### 3. Verify Permissions

Ensure Row Level Security policies allow:
- Reviewers can insert their own approvals
- Project creators can give final approval
- Users can read approval data for their organization's assets

### 4. Test the Workflow

1. Create a test project with a workflow
2. Add multiple reviewers to each stage
3. Upload a test asset
4. Have reviewers approve through the flow
5. Verify emails are sent
6. Test final approval as project owner

## TypeScript Interfaces

### MockupStageUserApproval
```typescript
interface MockupStageUserApproval {
  id: string;
  asset_id: string;
  project_id: string;
  stage_order: number;
  user_id: string;
  user_name: string;
  user_email?: string;
  user_image_url?: string;
  action: 'approve' | 'request_changes';
  notes?: string;
  created_at: string;
}
```

### AssetApprovalSummary
```typescript
interface AssetApprovalSummary {
  approvals_by_stage: {
    [stage_order: number]: MockupStageUserApproval[];
  };
  progress_summary: {
    [stage_order: number]: {
      approvals_received: number;
      approvals_required: number;
      is_complete: boolean;
    };
  };
  final_approval?: {
    approved_by: string;
    approved_at: string;
    notes?: string;
  };
}
```

### Enhanced AssetStageProgress
```typescript
interface AssetStageProgress {
  id: string;
  asset_id: string;
  project_id: string;
  stage_order: number;
  status: 'pending' | 'in_review' | 'approved' | 'changes_requested' | 'pending_final_approval';
  assigned_at: string;
  approved_at?: string;
  approvals_required: number; // NEW
  approvals_received: number; // NEW
  notes?: string;
}
```

### Enhanced Asset (Final Approval)
```typescript
interface Asset {
  // ... existing fields
  final_approved_by?: string; // NEW
  final_approved_at?: string; // NEW
  final_approval_notes?: string; // NEW
}
```

## Implementation Phases

### Phase 1: Database Foundation ✅
- Created migration 18
- Added tables and columns
- Created database functions

### Phase 2: API Layer ✅
- `/api/mockups/[id]/approve` endpoint
- `/api/mockups/[id]/final-approve` endpoint
- `/api/mockups/[id]/approvals` endpoint

### Phase 3: TypeScript Types ✅
- Updated `lib/supabase.ts` with new interfaces
- Added `pending_final_approval` status type

### Phase 4: UI Components ✅
- ApprovalStatusBanner
- ApprovalTimelinePanel
- FinalApprovalBanner

### Phase 5: Mockup Detail Integration ✅
- Added approval state management
- Integrated all three approval components
- Added "Approvals" tab to right panel

### Phase 6: Dashboard Quick Approve ✅
- Enhanced ReviewListItem component
- Added quick approve to MyStageReviewsPage
- Approval tracking in dashboard

### Phase 7: Email Notifications ✅
- User approval progress notification
- Stage complete notification
- Final approval needed notification
- Final approval complete notification

## Troubleshooting

### Approvals not advancing
- Check that ALL reviewers for the stage have approved
- Verify `approvals_received` matches `approvals_required`
- Check `check_stage_approval_complete()` function

### Emails not sending
- Verify SendGrid API key is configured
- Check server logs for email errors
- Ensure `NEXT_PUBLIC_APP_URL` is set correctly

### User can't approve
- Verify user is assigned as reviewer for current stage
- Check user hasn't already approved
- Verify asset is in `in_review` status

### Final approval not showing
- Check asset status is `pending_final_approval`
- Verify user is project creator or org admin
- Ensure all workflow stages are complete

## Future Enhancements

Potential improvements for future iterations:

1. **Approval Delegation**: Allow reviewers to delegate their approval to someone else
2. **Approval Expiry**: Set time limits for approvals
3. **Conditional Approvals**: "Approve with minor changes"
4. **Bulk Approve**: Approve multiple assets at once
5. **Approval Templates**: Pre-defined approval notes/checklists
6. **Analytics**: Approval time metrics, bottleneck detection
7. **Slack/Teams Integration**: Send notifications to team chat
8. **Mobile Push Notifications**: Native app notifications
9. **Approval Routing Rules**: Auto-assignment based on asset type
10. **Version Comparison**: Side-by-side before/after approval

## Related Documentation

- [Collaboration Implementation](./COLLABORATION_IMPLEMENTATION.md)
- [Collaboration Spec](./COLLABORATION_SPEC.md)
- [README](./README.md)
- [CHANGELOG](./CHANGELOG.md)

## Support

For questions or issues with the approval system:
1. Check this documentation first
2. Review the code comments in implementation files
3. Test in a non-production environment
4. Contact the development team

---

Generated as part of CardMock's user-level approval system implementation.
