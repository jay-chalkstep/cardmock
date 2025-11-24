# CURSOR IMPLEMENTATION PROMPT

You are working on Asset Studio, a Next.js application for Choice Digital employees to create branded mockups of payment assets. The app currently has:
- Mockup creation and management (saves to Supabase)
- Folder organization system
- Clerk authentication with org support and admin/user roles
- Supabase database with RLS policies

## YOUR TASK
Implement internal collaboration features that allow users to invite other org members to review and comment on mockups. This addresses a critical business pain point: endless approval cycles.

## CRITICAL REQUIREMENTS
1. Only users within the same Clerk organization can collaborate
2. Creators can invite multiple reviewers from their org
3. Both creators and reviewers can comment on mockups
4. Reviewers can approve mockups
5. All collaboration data must respect RLS policies
6. Work incrementally through each phase, testing as you go

## SCOPE
Phase 1 (Current): Internal collaboration only - CDCO employees reviewing each other's work
Phase 2 (Future): External client collaboration via "Client" role in Clerk

---

# Internal Collaboration System - Implementation Specification

## Business Context
Choice Digital's sales and product teams currently cycle endlessly on mockup approvals via email, Slack, and attachments. This feature creates a centralized collaboration workflow where team members can request feedback, comment, and approve mockups all in one place.

## User Story
```
Sarah (sales rep) creates Ferrari mockup
→ Clicks "Request Feedback" 
→ Selects Mike (manager) from org members dropdown
→ Mike gets notification (email + in-app)
→ Mike opens mockup detail page, sees it, leaves comment: "Logo needs more contrast"
→ Sarah gets notification, sees comment in real-time
→ Sarah makes edits, uploads new version
→ Mike sees update, leaves another comment: "Perfect!"
→ Mike clicks "Approve"
→ Sarah sees approval, proceeds with client
```

---

## Database Schema

### 1. Comments Table
Store all comments on mockups:

```sql
CREATE TABLE mockup_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mockup_id UUID REFERENCES mockups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Clerk user ID
  user_name TEXT NOT NULL, -- Display name from Clerk
  user_avatar TEXT, -- Profile pic URL from Clerk
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  org_id TEXT NOT NULL
);

-- Index for fast comment queries
CREATE INDEX idx_mockup_comments_mockup ON mockup_comments(mockup_id, created_at DESC);
CREATE INDEX idx_mockup_comments_user ON mockup_comments(user_id, created_at DESC);

-- RLS policies
ALTER TABLE mockup_comments ENABLE ROW LEVEL SECURITY;

-- Users can view comments on mockups they created or are reviewing
CREATE POLICY "Users can view relevant comments"
ON mockup_comments FOR SELECT
USING (
  org_id = current_setting('app.current_org_id') AND (
    -- Creator can see all comments on their mockup
    mockup_id IN (SELECT id FROM mockups WHERE created_by = auth.uid())
    OR
    -- Reviewer can see comments on mockups they're reviewing
    mockup_id IN (SELECT mockup_id FROM mockup_reviewers WHERE reviewer_id = auth.uid())
  )
);

-- Users can add comments to mockups they have access to
CREATE POLICY "Users can add comments"
ON mockup_comments FOR INSERT
WITH CHECK (
  org_id = current_setting('app.current_org_id') AND
  user_id = auth.uid() AND (
    mockup_id IN (SELECT id FROM mockups WHERE created_by = auth.uid())
    OR
    mockup_id IN (SELECT mockup_id FROM mockup_reviewers WHERE reviewer_id = auth.uid())
  )
);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
ON mockup_comments FOR UPDATE
USING (user_id = auth.uid() AND org_id = current_setting('app.current_org_id'));

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
ON mockup_comments FOR DELETE
USING (user_id = auth.uid() AND org_id = current_setting('app.current_org_id'));
```

### 2. Reviewers Table
Track who's been invited to review mockups and their status:

```sql
CREATE TABLE mockup_reviewers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mockup_id UUID REFERENCES mockups(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL, -- Clerk user ID
  reviewer_name TEXT NOT NULL, -- Display name from Clerk
  reviewer_email TEXT NOT NULL, -- For notifications
  reviewer_avatar TEXT, -- Profile pic URL
  status TEXT DEFAULT 'pending', -- pending, viewed, approved, changes_requested
  invited_by TEXT NOT NULL, -- Clerk user ID of inviter
  invited_at TIMESTAMP DEFAULT NOW(),
  viewed_at TIMESTAMP,
  responded_at TIMESTAMP,
  notes TEXT, -- Optional message from inviter
  org_id TEXT NOT NULL,
  UNIQUE(mockup_id, reviewer_id) -- Can't invite same person twice
);

-- Indexes
CREATE INDEX idx_mockup_reviewers_mockup ON mockup_reviewers(mockup_id);
CREATE INDEX idx_mockup_reviewers_reviewer ON mockup_reviewers(reviewer_id, status);

-- RLS policies
ALTER TABLE mockup_reviewers ENABLE ROW LEVEL SECURITY;

-- Users can view reviewers on mockups they created or are reviewing
CREATE POLICY "Users can view relevant reviewers"
ON mockup_reviewers FOR SELECT
USING (
  org_id = current_setting('app.current_org_id') AND (
    mockup_id IN (SELECT id FROM mockups WHERE created_by = auth.uid())
    OR
    reviewer_id = auth.uid()
  )
);

-- Only mockup creators can add reviewers
CREATE POLICY "Creators can add reviewers"
ON mockup_reviewers FOR INSERT
WITH CHECK (
  org_id = current_setting('app.current_org_id') AND
  invited_by = auth.uid() AND
  mockup_id IN (SELECT id FROM mockups WHERE created_by = auth.uid())
);

-- Reviewers can update their own status
CREATE POLICY "Reviewers can update own status"
ON mockup_reviewers FOR UPDATE
USING (
  reviewer_id = auth.uid() AND 
  org_id = current_setting('app.current_org_id')
);

-- Creators can remove reviewers
CREATE POLICY "Creators can remove reviewers"
ON mockup_reviewers FOR DELETE
USING (
  org_id = current_setting('app.current_org_id') AND
  mockup_id IN (SELECT id FROM mockups WHERE created_by = auth.uid())
);
```

### 3. Update Mockups Table (Optional Enhancement)
Add collaboration metadata to mockups:

```sql
-- Add columns to track collaboration state
ALTER TABLE mockups
ADD COLUMN has_pending_reviews BOOLEAN DEFAULT false,
ADD COLUMN review_count INTEGER DEFAULT 0,
ADD COLUMN approval_count INTEGER DEFAULT 0,
ADD COLUMN last_activity_at TIMESTAMP DEFAULT NOW();

-- Index for filtering
CREATE INDEX idx_mockups_pending_reviews ON mockups(created_by, has_pending_reviews);
```

---

## Feature Implementation

### Phase 1: Request Feedback Flow

**Goal**: Mockup creators can invite org members to review

#### 1.1 Mockup Detail Page Enhancement

**Location**: `/mockups/[id]` or wherever mockup details are shown

**New UI Elements**:
- "Request Feedback" button (prominent, primary action)
- Reviewers section showing invited users and their status
- Comments section at bottom

**Component Structure**:
```
MockupDetailPage
├─ MockupHeader (title, created date, creator)
├─ MockupImage (the actual mockup preview)
├─ MockupActions
│  ├─ DownloadButton
│  ├─ RequestFeedbackButton ← NEW
│  ├─ EditButton (if applicable)
│  └─ DeleteButton
├─ ReviewersSection ← NEW
│  └─ ReviewerCard (for each reviewer)
│     ├─ Avatar + Name
│     ├─ Status badge (pending/approved/changes requested)
│     └─ Timestamp
├─ CommentsSection ← NEW
│  ├─ CommentThread
│  │  └─ CommentCard (for each comment)
│  └─ CommentForm
└─ LoadingStates / EmptyStates
```

#### 1.2 Request Feedback Modal

**Trigger**: Click "Request Feedback" button

**Modal Content**:
```
┌─────────────────────────────────────────┐
│ Request Feedback                    [X] │
│                                          │
│ Invite team members to review this       │
│ mockup and provide feedback.             │
│                                          │
│ Select reviewers:                        │
│ ┌────────────────────────────────────┐  │
│ │ Search team members...              │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ☑ 👤 Mike Thompson                       │
│      Manager                             │
│                                          │
│ ☐ 👤 Jennifer Lee                        │
│      Product Lead                        │
│                                          │
│ ☐ 👤 David Kim                           │
│      Designer                            │
│                                          │
│ Add a message (optional):                │
│ ┌────────────────────────────────────┐  │
│ │ Hey team, would love feedback on   │  │
│ │ the Ferrari mockup before I send   │  │
│ │ to the client...                   │  │
│ └────────────────────────────────────┘  │
│                                          │
│         [Cancel] [Send Invitations]      │
└─────────────────────────────────────────┘
```

**Functionality**:
1. Fetch all users in org from Clerk (exclude self, exclude already-invited)
2. Multi-select interface with search/filter
3. Optional message field
4. Submit creates mockup_reviewers records
5. Trigger notification emails
6. Close modal, refresh reviewers list

**API Endpoints Needed**:
```typescript
// Get org members
GET /api/org/members
// Returns: { users: [{ id, name, email, avatar, role }] }

// Invite reviewers
POST /api/mockups/[id]/reviewers
// Body: { reviewer_ids: string[], message?: string }
// Creates mockup_reviewers records and sends emails
```

#### 1.3 Clerk Organization Members Query

**Implementation Pattern**:
```typescript
// In API route or server component
import { clerkClient } from '@clerk/nextjs/server';

export async function getOrgMembers(orgId: string) {
  const { data: members } = await clerkClient.organizations.getOrganizationMembershipList({
    organizationId: orgId,
  });
  
  return members.map(member => ({
    id: member.publicUserData.userId,
    name: `${member.publicUserData.firstName} ${member.publicUserData.lastName}`,
    email: member.publicUserData.identifier,
    avatar: member.publicUserData.imageUrl,
    role: member.role
  }));
}
```

---

### Phase 2: Comments System

**Goal**: Users can comment on mockups they created or are reviewing

#### 2.1 Comments Display

**Location**: Bottom of mockup detail page

**UI Design**:
```
💬 Comments (3)

┌─────────────────────────────────────────┐
│ 👤 Mike Thompson (Manager) · 2 hours ago│
│ Logo needs more contrast against the    │
│ background. Can we try a darker shade?  │
│                              [Reply] [•]│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 👤 Sarah (You) · 1 hour ago              │
│ Good catch! I've updated the logo color.│
│ Uploaded new version.                   │
│                        [Edit] [Delete]   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 👤 Mike Thompson (Manager) · 30 min ago │
│ Perfect! ✅ Looks great now.             │
│                              [Reply] [•]│
└─────────────────────────────────────────┘
```

**Component Structure**:
```typescript
// components/CommentsSection.tsx
function CommentsSection({ mockupId, orgId }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  // Fetch comments
  useEffect(() => {
    fetchComments();
  }, [mockupId]);
  
  // Optional: Real-time via Supabase
  useEffect(() => {
    const subscription = supabase
      .channel(`mockup-${mockupId}-comments`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'mockup_comments' },
        handleCommentChange
      )
      .subscribe();
    
    return () => subscription.unsubscribe();
  }, [mockupId]);
  
  return (
    <div>
      <h3>💬 Comments ({comments.length})</h3>
      {comments.map(comment => (
        <CommentCard key={comment.id} comment={comment} />
      ))}
      <CommentForm onSubmit={handleAddComment} />
    </div>
  );
}
```

#### 2.2 Add Comment Form

**Simple implementation**:
```
┌─────────────────────────────────────────┐
│ Add a comment...                         │
│ ┌────────────────────────────────────┐  │
│ │ [Text area]                        │  │
│ └────────────────────────────────────┘  │
│                            [Comment]     │
└─────────────────────────────────────────┘
```

**API Endpoints**:
```typescript
// Add comment
POST /api/mockups/[id]/comments
// Body: { comment_text: string }
// Creates mockup_comment record

// Get comments
GET /api/mockups/[id]/comments
// Returns: { comments: Comment[] }

// Update comment (edit)
PATCH /api/comments/[id]
// Body: { comment_text: string }

// Delete comment
DELETE /api/comments/[id]
```

**Supabase Queries**:
```typescript
// Add comment
const { data, error } = await supabase
  .from('mockup_comments')
  .insert({
    mockup_id: mockupId,
    user_id: userId,
    user_name: userName,
    user_avatar: userAvatar,
    comment_text: commentText,
    org_id: orgId
  })
  .select()
  .single();

// Get comments for mockup
const { data, error } = await supabase
  .from('mockup_comments')
  .select('*')
  .eq('mockup_id', mockupId)
  .order('created_at', { ascending: true });
```

---

### Phase 3: Review Status & Approvals

**Goal**: Reviewers can mark mockups as approved or request changes

#### 3.1 Reviewer Actions

**In Reviewers Section**:
```
👥 Reviewers (2)

┌─────────────────────────────────────────┐
│ 👤 Mike Thompson (Manager)               │
│    Status: ✅ Approved · 1 hour ago      │
│    "Looks great!"                        │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 👤 Jennifer Lee (Product Lead)           │
│    Status: ⏳ Pending                     │
│    Invited 3 hours ago                   │
└─────────────────────────────────────────┘

[If you're a reviewer, show action buttons:]
┌─────────────────────────────────────────┐
│ Your Review:                             │
│ [Request Changes] [Approve]              │
└─────────────────────────────────────────┘
```

#### 3.2 Status Update Flow

**When reviewer clicks "Approve"**:
1. Show optional modal: "Add a note (optional)"
2. Update mockup_reviewers record:
   - Set status = 'approved'
   - Set responded_at = NOW()
   - Save optional note
3. Send notification to creator
4. Refresh UI

**When reviewer clicks "Request Changes"**:
1. Show modal: "What changes are needed?" (required)
2. Update mockup_reviewers record:
   - Set status = 'changes_requested'
   - Set responded_at = NOW()
   - Save note
3. Send notification to creator
4. Refresh UI

**API Endpoint**:
```typescript
// Update reviewer status
PATCH /api/mockups/[mockupId]/reviewers/[reviewerId]
// Body: { status: 'approved' | 'changes_requested', note?: string }
```

**Supabase Query**:
```typescript
const { data, error } = await supabase
  .from('mockup_reviewers')
  .update({
    status: newStatus,
    responded_at: new Date().toISOString(),
    notes: note
  })
  .eq('id', reviewerId)
  .eq('reviewer_id', userId); // Ensure user can only update their own review
```

---

### Phase 4: My Reviews Page

**Goal**: Central place to see all mockups awaiting your review

**Route**: `/reviews`

**Layout**:
```
┌─────────────────────────────────────────┐
│ My Review Requests                       │
│                                          │
│ Tabs: [Pending (3)] [Completed]         │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ 🖼️ Ferrari Prepaid Card             │  │
│ │ Requested by Sarah · 2 hours ago    │  │
│ │ "Need feedback before client call"  │  │
│ │                        [View Mockup]│  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ 🖼️ Tesla Virtual Card               │  │
│ │ Requested by David · 1 day ago      │  │
│ │ "Quick review needed"               │  │
│ │                        [View Mockup]│  │
│ └────────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

**Query**:
```typescript
// Get pending reviews for current user
const { data, error } = await supabase
  .from('mockup_reviewers')
  .select(`
    *,
    mockup:mockups (
      id,
      name,
      thumbnail_url,
      created_by,
      created_at
    )
  `)
  .eq('reviewer_id', userId)
  .eq('status', 'pending')
  .order('invited_at', { ascending: false });
```

**Badge Count** (for header):
```typescript
// Count pending reviews
const { count } = await supabase
  .from('mockup_reviewers')
  .select('*', { count: 'exact', head: true })
  .eq('reviewer_id', userId)
  .eq('status', 'pending');
```

---

### Phase 5: Notifications

**Goal**: Notify users when action is needed

#### 5.1 Email Notifications (Optional for MVP)

**If you have Resend set up, send emails for**:
1. New review request
2. New comment on your mockup
3. Reviewer approved/requested changes

**Email Templates**:

**Review Request**:
```
Subject: [Asset Studio] Sarah invited you to review: Ferrari Prepaid Card

Hi Mike,

Sarah has requested your feedback on a mockup for Ferrari.

[View Mockup & Comment]

Message from Sarah:
"Hey Mike, would love your thoughts before I send this to the client!"

---
Choice Digital Asset Studio
```

**New Comment**:
```
Subject: [Asset Studio] New comment on: Ferrari Prepaid Card

Hi Sarah,

Mike commented on your mockup:
"Logo needs more contrast against the background."

[View Mockup & Reply]

---
Choice Digital Asset Studio
```

**Status Update**:
```
Subject: [Asset Studio] Mike approved: Ferrari Prepaid Card

Hi Sarah,

Great news! Mike has approved your mockup.

[View Mockup]

---
Choice Digital Asset Studio
```

#### 5.2 In-App Notifications (Simpler Alternative)

If no email service yet, just use:
1. Badge count in header (unread reviews)
2. `/reviews` page as notification center
3. Highlight "new" items with badge

---

## Real-Time Updates (Optional Enhancement)

**Using Supabase Realtime** for live collaboration feel:

```typescript
// Subscribe to comments on a mockup
const commentsSubscription = supabase
  .channel(`mockup-${mockupId}-comments`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'mockup_comments',
      filter: `mockup_id=eq.${mockupId}`
    },
    (payload) => {
      // Add new comment to UI without refresh
      setComments(prev => [...prev, payload.new]);
    }
  )
  .subscribe();

// Subscribe to reviewer status changes
const reviewersSubscription = supabase
  .channel(`mockup-${mockupId}-reviewers`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'mockup_reviewers',
      filter: `mockup_id=eq.${mockupId}`
    },
    (payload) => {
      // Update reviewer status in UI
      updateReviewerStatus(payload.new);
    }
  )
  .subscribe();

// Cleanup
return () => {
  commentsSubscription.unsubscribe();
  reviewersSubscription.unsubscribe();
};
```

---

## Implementation Checklist

### Day 1: Database & Request Feedback
- [ ] Run SQL migrations for mockup_comments and mockup_reviewers
- [ ] Create API route to get org members from Clerk
- [ ] Build RequestFeedbackModal component
- [ ] Create API route to invite reviewers
- [ ] Add "Request Feedback" button to mockup detail page
- [ ] Test: Can invite multiple reviewers, records created in DB

### Day 2: Comments System
- [ ] Build CommentsSection component
- [ ] Build CommentCard and CommentForm components
- [ ] Create API routes for comments (GET, POST, PATCH, DELETE)
- [ ] Display comments on mockup detail page
- [ ] Test: Can add, edit, delete comments; only see comments on accessible mockups

### Day 3: Reviews & Approvals
- [ ] Add ReviewersSection to mockup detail page
- [ ] Build reviewer action buttons (Approve/Request Changes)
- [ ] Create API route to update reviewer status
- [ ] Show reviewer status in UI
- [ ] Test: Can approve or request changes; creator sees updated status

### Day 4: My Reviews Page
- [ ] Create /reviews route
- [ ] Build reviews list page with pending/completed tabs
- [ ] Add badge count to header navigation
- [ ] Link from email/notification to specific mockup
- [ ] Test: Can see all pending reviews; clicking opens mockup detail

### Day 5: Polish & Notifications
- [ ] Add email notifications (if service available) or skip for now
- [ ] Add loading states and empty states
- [ ] Add error handling for all API calls
- [ ] Real-time updates via Supabase (optional)
- [ ] Test full workflow end-to-end

---

## Testing Scenarios

### Scenario 1: Basic Collaboration
1. Sarah creates mockup
2. Sarah invites Mike to review
3. Mike sees notification/review request
4. Mike opens mockup, leaves comment
5. Sarah sees comment, replies
6. Mike approves
7. Sarah sees approval

### Scenario 2: Multiple Reviewers
1. Sarah invites Mike and Jennifer
2. Mike approves quickly
3. Jennifer requests changes
4. Sarah addresses changes, comments
5. Jennifer approves
6. Both approvals visible

### Scenario 3: Permissions
1. User A creates mockup
2. User A invites User B
3. User C (not invited) cannot see mockup in reviews
4. User C cannot comment
5. Only User A can invite additional reviewers

### Scenario 4: Edge Cases
1. Try to invite self (should be prevented)
2. Try to invite same person twice (should show error)
3. Delete mockup with reviews (should cascade delete)
4. Creator deletes comment from reviewer (should work if allowed)

---

## UI/UX Best Practices

### Visual Hierarchy
- Make "Request Feedback" prominent but not overwhelming
- Use status badges (✅ ⏳ ⚠️) for quick scanning
- Keep comments thread-like and easy to follow

### Loading States
- Show skeleton loaders while fetching comments
- Optimistic updates for adding comments
- Clear loading indicators for async actions

### Empty States
- "No comments yet. Be the first to comment!"
- "No reviewers invited yet. Click 'Request Feedback' to get started."
- "No pending reviews. You're all caught up!"

### Error Handling
- "Failed to load comments. Please refresh."
- "Could not send review request. Please try again."
- Graceful degradation if real-time fails

---

## Future Enhancements (Post-MVP)

### Phase 2: External Client Collaboration
- Add "Client" role to Clerk
- Magic link generation for guest access
- Client-specific permissions (view + comment only)
- Separate client review workflow

### Advanced Features
- Threaded/nested comment replies
- @mentions in comments
- Comment reactions (👍 ❤️)
- Pinned comments to specific locations on mockup
- Version comparison (side-by-side)
- Audit trail / activity log
- Email digest of activity
- Slack integration for notifications
- Batch approval (approve multiple mockups at once)

---

## Security Considerations

### Data Access
- RLS policies enforce org-level isolation
- Only invited reviewers can access mockups
- Creators control who can review
- Users can only update their own comments/status

### API Security
- All endpoints verify Clerk authentication
- Check org membership before returning data
- Validate user has permission for each action
- Rate limit to prevent abuse

### Content Security
- Sanitize comment text (prevent XSS)
- Validate reviewer_ids exist in org
- Prevent self-invitation
- Validate file uploads if allowing attachments later

---

## Performance Considerations

### Database Queries
- Index mockup_id on comments and reviewers tables
- Use select() to fetch only needed columns
- Limit comment queries (paginate if >100 comments)
- Cache org member list (refreshes hourly)

### Real-Time Scaling
- Only subscribe to channels for currently-viewed mockup
- Unsubscribe when leaving page
- Debounce comment updates if typing indicators added

### API Rate Limits
- Limit reviewers per mockup (e.g., max 10)
- Limit comments per user per mockup (prevent spam)
- Rate limit email notifications (max 1 per minute per user)

---

## Questions to Answer Before Starting

1. **Email Service**: Do you have Resend set up? Or should we skip email notifications for MVP?

2. **Existing Components**: Do you already have a mockup detail page? Or are mockups currently just shown in a grid?

3. **User Profiles**: Does Asset Studio display user avatars/names anywhere currently? Or is this new?

4. **Notification Preferences**: Should users be able to opt out of email notifications? Or is that v2?

5. **Comment Editing**: Should users be able to edit their comments? Or is that added complexity for later?

Let Cursor know answers to these so it can adapt the implementation accordingly.