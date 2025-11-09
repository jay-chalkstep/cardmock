# Contracts Module Implementation Plan

## Overview
Transform the platform into a comprehensive customer onboarding, collaboration, and ongoing approval record system by adding a Contracts module. This enables contract/amendment management, document versioning with AI diff summaries, DocuSign integration, email content approval, and payment method approvals - all while preserving existing features.

## Business Context

### Current State
- Platform focuses on brand asset management and internal collaboration
- Projects organize assets by client
- Approval workflows exist for assets (mockups)
- Internal org members can collaborate and approve

### Desired State
- **Customer Onboarding**: New clients get contracts and all new assets
- **Contract Management**: Multiple contracts per client, amendments extend contracts
- **Document Collaboration**: Versioned Word documents with AI-generated diff summaries
- **E-Signatures**: DocuSign integration for contract signing
- **Email Approval**: Visual email mockups with client branding for approval
- **Payment Methods**: Flexible payment method approvals (prepaid cards, checks, Amazon cards, etc.)
- **Stakeholder Access**: External clients can access and approve via Clerk "Client" role

## Architecture Decisions

### Data Model

#### Clients Table
Core client entity (separate from projects):
- `id` (UUID, primary key)
- `name` (TEXT, required)
- `email` (TEXT, optional)
- `organization_id` (TEXT, Clerk org ID)
- `created_by` (TEXT, Clerk user ID)
- `created_at`, `updated_at` (timestamps)
- Additional metadata fields as needed

#### Contracts Table
Multiple contracts per client:
- `id` (UUID, primary key)
- `client_id` (UUID, references clients)
- `project_id` (UUID, nullable, references projects)
- `contract_number` (TEXT, unique per org)
- `status` (ENUM: 'draft', 'pending_signature', 'signed', 'amended', 'expired')
- `type` (ENUM: 'new', 'amendment')
- `parent_contract_id` (UUID, nullable, for amendments)
- `organization_id` (TEXT)
- `created_by` (TEXT)
- `created_at`, `updated_at` (timestamps)

#### Contract Documents Table
Versioned Word documents:
- `id` (UUID, primary key)
- `contract_id` (UUID, references contracts)
- `version_number` (INTEGER, current version)
- `file_url` (TEXT, Supabase Storage URL)
- `file_name` (TEXT)
- `file_size` (INTEGER)
- `mime_type` (TEXT, e.g., 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
- `docu_sign_envelope_id` (TEXT, nullable, DocuSign envelope ID)
- `docu_sign_status` (TEXT, nullable: 'sent', 'delivered', 'signed', 'declined', 'voided')
- `is_current` (BOOLEAN, default true)
- `uploaded_by` (TEXT, Clerk user ID)
- `created_at`, `updated_at` (timestamps)

#### Contract Document Versions Table
Version history with AI summaries:
- `id` (UUID, primary key)
- `document_id` (UUID, references contract_documents)
- `version_number` (INTEGER)
- `file_url` (TEXT, Supabase Storage URL)
- `diff_summary` (TEXT, AI-generated summary of changes)
- `diff_summary_generated_at` (TIMESTAMPTZ, nullable)
- `created_by` (TEXT, Clerk user ID)
- `created_at` (TIMESTAMPTZ)

#### Email Mockups Table
Visual email templates with branding:
- `id` (UUID, primary key)
- `contract_id` (UUID, references contracts)
- `project_id` (UUID, nullable, references projects)
- `name` (TEXT, required)
- `html_content` (TEXT, full HTML email)
- `preview_url` (TEXT, generated preview image URL)
- `branding_data` (JSONB, stores colors, fonts, logo references)
- `status` (ENUM: 'draft', 'pending_approval', 'approved', 'rejected')
- `organization_id` (TEXT)
- `created_by` (TEXT)
- `created_at`, `updated_at` (timestamps)

#### Payment Methods Table
Flexible payment method approvals:
- `id` (UUID, primary key)
- `contract_id` (UUID, references contracts)
- `type` (TEXT, e.g., 'prepaid_card', 'check', 'amazon_card', 'custom')
- `details` (JSONB, flexible schema for type-specific data)
- `status` (ENUM: 'pending_approval', 'approved', 'rejected')
- `approved_by` (TEXT, nullable, Clerk user ID)
- `approved_at` (TIMESTAMPTZ, nullable)
- `organization_id` (TEXT)
- `created_by` (TEXT)
- `created_at`, `updated_at` (timestamps)

### Access Control

#### Clerk Role: "Client"
- New role in Clerk organization
- Clients can view their contracts and related assets
- Clients can approve documents, email mockups, payment methods
- Clients can comment and provide feedback
- Limited access (only their contracts/projects)

#### Internal Users
- Full access to all contracts and clients
- Can create contracts, upload documents, send for signature
- Can manage all approval workflows

## Implementation Phases

### Phase 1: Core Infrastructure

#### 1.1 Database Schema
**File**: `supabase/23_contracts_module.sql`

Create all tables with:
- Proper foreign key relationships
- Indexes for performance
- RLS policies (permissive for now, security at API layer)
- Updated_at triggers
- Comments for documentation

**Tables to create:**
- `clients`
- `contracts`
- `contract_documents`
- `contract_document_versions`
- `email_mockups`
- `payment_methods`

**Migration considerations:**
- Add `contract_id` to `projects` table (nullable, for linking)
- Add `contract_id` to `assets` table (nullable, for linking)
- No breaking changes to existing tables

#### 1.2 Clerk Role Setup
- Configure "Client" role in Clerk organization settings
- Update role checks in existing components
- Add role-based UI filtering
- Update permission checks in API routes

**Files to modify:**
- `app/api/**/route.ts` - Add client role checks where needed
- `components/**/*.tsx` - Add role-based UI conditionals

#### 1.3 Navigation
**File**: `components/navigation/NavRail.tsx`

Add "Contracts" tab:
- Import `FileText` icon from lucide-react
- Add to `navItems` array
- Route to `/contracts`
- Update active nav logic

**File**: `app/(dashboard)/contracts/page.tsx`
- Create contracts list page
- Use GmailLayout for consistency
- List view with search and filters

### Phase 2: Client Management

#### 2.1 Client CRUD API
**Files to create:**
- `app/api/clients/route.ts` - GET (list), POST (create)
- `app/api/clients/[id]/route.ts` - GET (single), PATCH (update), DELETE

**Features:**
- List all clients in organization
- Create new client
- Update client details
- Delete client (with cascade checks)
- Search and filter

#### 2.2 Client UI Components
**Directory**: `components/clients/`

**Files to create:**
- `ClientList.tsx` - List view component
- `ClientCard.tsx` - Client card display
- `NewClientModal.tsx` - Create client dialog
- `EditClientModal.tsx` - Edit client dialog
- `ClientDetailView.tsx` - Client detail with contracts/projects
- `index.ts` - Exports

**Features:**
- Client list with search
- Create/edit client modals
- Client detail view showing:
  - Associated contracts
  - Associated projects
  - Contact information

#### 2.3 Client-Contract Relationship
- UI to link contracts to clients
- Display contracts per client
- Display projects per client
- Filter contracts by client

### Phase 3: Contract Document Management

#### 3.1 Document Upload & Storage
**File**: `app/api/contracts/[id]/documents/route.ts`

**Features:**
- POST endpoint for document upload
- Validate file type (.docx, .doc)
- Upload to Supabase Storage bucket `contract-documents`
- Store metadata in `contract_documents` table
- Set as current version if first document

**Storage structure:**
```
contract-documents/
  {contract_id}/
    {document_id}/
      v{version_number}.docx
```

#### 3.2 Version Control System
**File**: `app/api/contracts/[id]/documents/[docId]/versions/route.ts`

**Features:**
- POST to create new version
- Auto-increment version number
- Mark previous version as not current
- Track uploader and timestamp
- Store in `contract_document_versions` table

**Version numbering:**
- Start at v1
- Increment for each upload
- Never skip versions
- Track full history

#### 3.3 AI Document Diff Summaries
**File**: `app/api/contracts/documents/[docId]/diff/route.ts`

**Features:**
- Compare current version with previous version
- Extract text from Word documents (use `mammoth` or `docx` npm package)
- Send to AI service (OpenAI GPT-4 or Anthropic Claude)
- Generate human-readable summary
- Store in `contract_document_versions.diff_summary`

**AI Prompt:**
```
Compare these two contract document versions and summarize the key changes in plain English. Focus on:
- Added clauses or sections
- Removed clauses or sections
- Modified terms, dates, or amounts
- Changed language or wording
```

**Component**: `components/contracts/DocumentDiffViewer.tsx`
- Display diff summary
- Show version comparison
- Highlight key changes

#### 3.4 Document Viewer
**Component**: `components/contracts/DocumentViewer.tsx`

**Features:**
- Display current document version
- Show version history sidebar
- Display diff summaries for each version
- Download previous versions
- Preview document (if possible)
- Link to DocuSign signing (if applicable)

### Phase 4: DocuSign Integration

#### 4.1 DocuSign Setup
**Directory**: `lib/docusign/`

**Files to create:**
- `client.ts` - DocuSign API client setup
- `envelopes.ts` - Envelope creation and management functions

**Dependencies:**
- Install `docusign-esign` npm package
- Add environment variables:
  - `DOCUSIGN_INTEGRATION_KEY`
  - `DOCUSIGN_USER_ID`
  - `DOCUSIGN_ACCOUNT_ID`
  - `DOCUSIGN_RSA_PRIVATE_KEY` (base64 encoded)
  - `DOCUSIGN_API_BASE_URL` (sandbox or production)

**Authentication:**
- Use JWT authentication (service account)
- Generate JWT token for API calls
- Handle token refresh

#### 4.2 Envelope Creation
**File**: `app/api/contracts/[id]/documents/[docId]/send-for-signature/route.ts`

**Features:**
- Convert Word document to PDF (use `docx-pdf` or cloud service)
- Create DocuSign envelope
- Add signers (client contacts)
- Set signing order if needed
- Store `envelope_id` in `contract_documents` table
- Send envelope to signers
- Return signing URLs

**Envelope configuration:**
- Subject: "Contract Signature Request: {contract_number}"
- Email message with context
- Signing tabs (signature, date, name)
- Return URL after signing

#### 4.3 Webhook Handler
**File**: `app/api/webhooks/docusign/route.ts`

**Features:**
- Verify webhook signature
- Handle envelope events:
  - `envelope-sent`
  - `envelope-delivered`
  - `envelope-signed`
  - `envelope-declined`
  - `envelope-voided`
- Update `contract_documents.docu_sign_status`
- Update `contracts.status` based on signature
- Send notifications
- Create audit trail

**Webhook security:**
- Verify HMAC signature from DocuSign
- Validate event payload
- Handle duplicate events (idempotency)

#### 4.4 Signature Status UI
**Component**: `components/contracts/SignatureStatus.tsx`

**Features:**
- Display envelope status
- Show signer progress (who has signed, who hasn't)
- Link to DocuSign signing URL (if pending)
- Show completion status
- Display signed document download link

### Phase 5: Email Mockup System

#### 5.1 Email Mockup Editor
**Component**: `components/email-mockups/EmailMockupEditor.tsx`

**Features:**
- Rich text editor (use `react-quill` or `slate`)
- Image upload for email art/assets
- Link insertion with placeholder variables (e.g., `{client_name}`, `{activation_link}`)
- Client branding selector:
  - Brand colors (from existing brands)
  - Fonts (from existing brands)
  - Logo selection (from existing brands)
- Preview mode:
  - Desktop preview
  - Mobile preview
  - Email client preview (Gmail, Outlook, etc.)

**Editor capabilities:**
- Text formatting (bold, italic, colors, sizes)
- Image insertion and resizing
- Link creation with variables
- Background colors
- Spacing controls
- Responsive design helpers

#### 5.2 Email Mockup Storage
**File**: `app/api/email-mockups/route.ts`

**Features:**
- POST - Create email mockup
- GET - List email mockups (filter by contract, project)
- PATCH - Update email mockup
- DELETE - Delete email mockup

**Storage:**
- Store HTML content in `email_mockups.html_content`
- Store branding data (colors, fonts, logo) in JSONB
- Generate preview images (server-side rendering)
- Store preview URL

#### 5.3 Email Mockup Approval
**Component**: `components/email-mockups/EmailMockupApproval.tsx`

**Features:**
- Link email mockups to contracts
- Use existing approval workflow system
- Request approval from clients
- Display approval status
- Show approval history
- Comments and feedback

**Integration:**
- Reuse `mockup_stage_progress` pattern
- Reuse approval notification system
- Link to contracts for context

### Phase 6: Payment Methods & Asset Approvals

#### 6.1 Payment Methods Management
**File**: `app/api/contracts/[id]/payment-methods/route.ts`

**Features:**
- POST - Create payment method
- GET - List payment methods for contract
- PATCH - Update payment method
- DELETE - Delete payment method

**Payment method types:**
- `prepaid_card` - Prepaid card details
- `check` - Check details
- `amazon_card` - Amazon gift card
- `custom` - Flexible custom type

**JSONB schema examples:**
```json
// prepaid_card
{
  "card_type": "Visa",
  "amount": 100.00,
  "currency": "USD",
  "expiration_date": "2025-12-31"
}

// check
{
  "check_number": "1234",
  "amount": 500.00,
  "payable_to": "Client Name",
  "memo": "Contract payment"
}

// amazon_card
{
  "card_value": 50.00,
  "currency": "USD",
  "delivery_method": "email"
}
```

**Component**: `components/contracts/PaymentMethodForm.tsx`
- Dynamic form based on payment type
- Validation
- Approval workflow integration

#### 6.2 Flexible Asset Types
**Migration**: Extend `assets` table

**Changes:**
- Add `asset_type` column (ENUM or TEXT)
- Types: `mockup`, `logo`, `check`, `prepaid_card`, `amazon_card`, `email_mockup`, `document`, `other`
- Update existing assets to `asset_type = 'mockup'`
- Update asset creation flows to support new types

**Files to modify:**
- `supabase/24_asset_types.sql` - Migration
- `lib/supabase.ts` - Update Asset interface
- `app/api/assets/route.ts` - Handle new types
- Asset creation components

### Phase 7: Contracts UI

#### 7.1 Contracts List Page
**File**: `app/(dashboard)/contracts/page.tsx`

**Features:**
- List view with GmailLayout
- Search by contract number, client name
- Filters:
  - Status (draft, pending_signature, signed, etc.)
  - Type (new, amendment)
  - Client
- Create new contract button
- Contract cards showing:
  - Contract number
  - Client name
  - Status badge
  - Last updated
  - Signature status

#### 7.2 Contract Detail Page
**File**: `app/(dashboard)/contracts/[id]/page.tsx`

**Layout:**
- Header with contract info and actions
- Tabs:
  1. **Overview** - Contract details, status, timeline
  2. **Documents** - Document versions, upload, DocuSign status
  3. **Email Mockups** - Email templates for approval
  4. **Payment Methods** - Payment method approvals
  5. **Assets** - Linked assets (mockups, logos, etc.)
  6. **Comments** - Stakeholder comments (reuse existing system)

**Components to create:**
- `components/contracts/ContractCard.tsx`
- `components/contracts/ContractDetailHeader.tsx`
- `components/contracts/ContractDocumentsTab.tsx`
- `components/contracts/ContractEmailMockupsTab.tsx`
- `components/contracts/ContractPaymentMethodsTab.tsx`
- `components/contracts/ContractAssetsTab.tsx`
- `components/contracts/NewContractModal.tsx`
- `components/contracts/NewAmendmentModal.tsx`
- `components/contracts/index.ts` - Exports

#### 7.3 Contract Creation
**Component**: `components/contracts/NewContractModal.tsx`

**Fields:**
- Client selection (required)
- Project selection (optional)
- Contract number (auto-generated or manual)
- Type (new contract or amendment)
- If amendment: parent contract selection
- Initial document upload (optional)

### Phase 8: Integration with Existing Systems

#### 8.1 Project-Contract Linking
**Changes:**
- Add `contract_id` to `projects` table (nullable)
- Update project detail page to show linked contract
- Filter projects by contract
- Display contract info on project pages

**Files to modify:**
- `supabase/23_contracts_module.sql` - Add column
- `app/(dashboard)/projects/[id]/page.tsx` - Display contract
- `components/projects/ProjectDetailHeader.tsx` - Show contract link

#### 8.2 Approval Workflow Integration
**Strategy:**
- Reuse existing `mockup_stage_progress` pattern
- Extend to support contract document approvals
- Extend to support email mockup approvals
- Extend to support payment method approvals

**Tables to extend:**
- `mockup_stage_progress` - Add `contract_id`, `document_id`, `email_mockup_id`, `payment_method_id`
- Or create separate approval tables that follow same pattern

**Approval types:**
- Contract document approval
- Email mockup approval
- Payment method approval
- Asset approval (existing)

#### 8.3 Notifications
**Extend notification system:**

**New notification types:**
- `contract_document_uploaded`
- `contract_signature_requested`
- `contract_signed`
- `email_mockup_approval_requested`
- `payment_method_approval_requested`
- `amendment_created`

**Files to modify:**
- `supabase/21_notifications.sql` - Add new types to enum
- `lib/email/contract-notifications.ts` - New email templates
- `app/api/notifications/route.ts` - Handle new types

## File Structure

```
logo-finder/
├── app/
│   ├── (dashboard)/
│   │   ├── contracts/
│   │   │   ├── page.tsx                    # Contracts list
│   │   │   └── [id]/
│   │   │       └── page.tsx               # Contract detail
│   │   └── clients/
│   │       └── page.tsx                    # Clients list (optional)
│   └── api/
│       ├── clients/
│       │   ├── route.ts                    # GET, POST
│       │   └── [id]/
│       │       └── route.ts                # GET, PATCH, DELETE
│       ├── contracts/
│       │   ├── route.ts                    # GET, POST
│       │   ├── [id]/
│       │   │   ├── route.ts                # GET, PATCH, DELETE
│       │   │   ├── documents/
│       │   │   │   ├── route.ts            # POST (upload)
│       │   │   │   └── [docId]/
│       │   │   │       ├── route.ts        # GET, DELETE
│       │   │   │       ├── versions/
│       │   │   │       │   └── route.ts     # POST (new version)
│       │   │   │       └── send-for-signature/
│       │   │   │           └── route.ts    # POST (DocuSign)
│       │   │   └── payment-methods/
│       │   │       └── route.ts            # GET, POST
│       │   └── documents/[docId]/
│       │       └── diff/
│       │           └── route.ts            # POST (AI diff)
│       ├── email-mockups/
│       │   ├── route.ts                    # GET, POST
│       │   └── [id]/
│       │       └── route.ts                # GET, PATCH, DELETE
│       └── webhooks/
│           └── docusign/
│               └── route.ts                 # POST (webhook handler)
├── components/
│   ├── contracts/
│   │   ├── ContractCard.tsx
│   │   ├── ContractDetailHeader.tsx
│   │   ├── ContractDocumentsTab.tsx
│   │   ├── ContractEmailMockupsTab.tsx
│   │   ├── ContractPaymentMethodsTab.tsx
│   │   ├── ContractAssetsTab.tsx
│   │   ├── DocumentViewer.tsx
│   │   ├── DocumentDiffViewer.tsx
│   │   ├── SignatureStatus.tsx
│   │   ├── NewContractModal.tsx
│   │   ├── NewAmendmentModal.tsx
│   │   ├── PaymentMethodForm.tsx
│   │   └── index.ts
│   ├── clients/
│   │   ├── ClientList.tsx
│   │   ├── ClientCard.tsx
│   │   ├── NewClientModal.tsx
│   │   ├── EditClientModal.tsx
│   │   ├── ClientDetailView.tsx
│   │   └── index.ts
│   └── email-mockups/
│       ├── EmailMockupEditor.tsx
│       ├── EmailMockupApproval.tsx
│       ├── EmailMockupPreview.tsx
│       └── index.ts
├── lib/
│   ├── docusign/
│   │   ├── client.ts                       # DocuSign API client
│   │   └── envelopes.ts                    # Envelope functions
│   └── ai/
│       └── document-diff.ts                # AI diff generation
└── supabase/
    └── 23_contracts_module.sql             # Database migration
```

## Key Technical Considerations

### Document Processing

#### Word Document Parsing
- **Library**: Use `mammoth` (npm) to extract text from .docx files
- **Alternative**: `docx` package for more control
- **Text extraction**: Extract plain text for AI comparison
- **Metadata**: Extract document properties (author, dates, etc.)

#### Storage
- **Supabase Storage**: Use `contract-documents` bucket
- **File organization**: `{contract_id}/{document_id}/v{version}.docx`
- **Access control**: RLS policies on storage
- **File size limits**: Enforce max file size (e.g., 10MB)

#### Versioning
- **Track file URLs**: Store file URLs in database, not file content
- **Version numbers**: Sequential integers (1, 2, 3, ...)
- **Current version**: Only one `is_current = true` per document
- **History**: Keep all versions, never delete

### AI Integration

#### Diff Summaries
- **Service**: OpenAI GPT-4 or Anthropic Claude
- **Input**: Extracted text from two document versions
- **Output**: Human-readable summary of changes
- **Caching**: Cache diff summaries to avoid re-processing
- **Error handling**: Graceful fallback if AI service unavailable

#### Prompt Engineering
```
You are a legal document analyst. Compare these two contract document versions and summarize the key changes in plain English. Focus on:

1. Added clauses or sections
2. Removed clauses or sections  
3. Modified terms, dates, or amounts
4. Changed language or wording
5. Any other significant changes

Be concise but thorough. Use bullet points for clarity.
```

### DocuSign Integration

#### OAuth Flow
- **Method**: JWT authentication (service account)
- **No user interaction**: Service account with pre-authorized access
- **Token generation**: Generate JWT token for API calls
- **Token refresh**: Handle token expiration

#### Envelope Creation
- **Document conversion**: Convert Word to PDF (use `docx-pdf` or cloud service)
- **Signer configuration**: Add client contacts as signers
- **Signing tabs**: Place signature, date, name fields
- **Email customization**: Custom subject and message
- **Return URL**: Redirect after signing

#### Webhook Security
- **Signature verification**: Verify HMAC signature from DocuSign
- **Event validation**: Validate event payload
- **Idempotency**: Handle duplicate events
- **Error handling**: Log and handle webhook errors

#### Error Handling
- **API rate limits**: Handle 429 responses
- **Network errors**: Retry logic
- **Invalid requests**: Validation and error messages
- **Status updates**: Poll for status if webhook fails

### Email Mockups

#### HTML Editor
- **Library**: `react-quill` or `slate` for rich text editing
- **Features**: Text formatting, images, links, colors
- **Variables**: Support placeholder variables (e.g., `{client_name}`)
- **Branding**: Reuse existing brand system

#### Preview
- **Method**: Server-side rendering or iframe
- **Email clients**: Test in Gmail, Outlook, Apple Mail
- **Responsive**: Mobile and desktop previews
- **Images**: Handle image hosting and CORS

#### Branding
- **Colors**: Use brand colors from existing brands
- **Fonts**: Use brand fonts from existing brands
- **Logos**: Select from existing brand logos
- **Consistency**: Ensure branding matches client brand

### Database Performance

#### Indexes
- `clients(organization_id)`
- `contracts(client_id, organization_id)`
- `contracts(project_id)` (nullable)
- `contract_documents(contract_id, is_current)`
- `contract_document_versions(document_id, version_number)`
- `email_mockups(contract_id, organization_id)`
- `payment_methods(contract_id, organization_id)`

#### Query Optimization
- Use JOINs efficiently
- Limit result sets with pagination
- Cache frequently accessed data
- Use database views for complex queries

## Migration Strategy

### Backward Compatibility
- **No breaking changes**: All existing features remain unchanged
- **Additive only**: New tables and columns, no deletions
- **Optional linking**: Contracts link to projects/assets, but not required
- **Gradual adoption**: Users can adopt contracts module gradually

### Data Migration
- **No migration needed**: Existing data remains unchanged
- **New clients**: Start using contracts module for new clients
- **Existing clients**: Can optionally create contracts retroactively

### Feature Flags
- **Consider feature flags**: For gradual rollout
- **Environment variables**: Control feature availability
- **Role-based access**: Control who can use contracts module

## Testing Considerations

### Unit Tests
- Document upload and versioning
- AI diff generation
- DocuSign envelope creation
- Email mockup rendering
- Payment method validation

### Integration Tests
- DocuSign webhook handling
- Contract creation workflow
- Approval workflow integration
- Client role permissions

### E2E Tests
- Create client → Create contract → Upload document → Send for signature → Sign → Approve
- Create email mockup → Request approval → Approve
- Add payment method → Request approval → Approve

### Test Data
- Sample Word documents for testing
- DocuSign sandbox environment
- Test client accounts
- Mock AI responses

## Security Considerations

### Access Control
- **RLS policies**: Database-level security
- **API route checks**: Verify user permissions
- **Client role**: Limited access to own contracts
- **Internal users**: Full access

### Data Privacy
- **Contract documents**: Sensitive data, secure storage
- **Client information**: PII protection
- **Payment methods**: PCI compliance considerations
- **Audit trail**: Track all access and changes

### DocuSign Security
- **Webhook verification**: Verify all webhook requests
- **Token security**: Secure JWT token storage
- **API keys**: Environment variables, never commit

## Future Enhancements (Post-MVP)

### Document Features
- **MS Word add-in**: Direct editing from Word
- **Real-time collaboration**: Multiple users editing simultaneously
- **Document templates**: Pre-built contract templates
- **Automated generation**: Generate contracts from templates

### Integration Features
- **E-signature alternatives**: HelloSign, Adobe Sign
- **Document storage**: Integration with Google Drive, Dropbox
- **CRM integration**: Sync with Salesforce, HubSpot

### Analytics & Reporting
- **Contract analytics**: Track contract lifecycle
- **Approval metrics**: Time to approval, approval rates
- **Client engagement**: Track client activity
- **Reporting dashboard**: Visualize contract data

### Advanced Features
- **Contract renewal automation**: Auto-renewal workflows
- **Compliance tracking**: Track regulatory compliance
- **Contract search**: Full-text search across contracts
- **AI contract analysis**: Extract key terms automatically

## Success Metrics

### Adoption
- Number of clients using contracts module
- Number of contracts created
- Number of documents uploaded
- Number of signatures completed

### Efficiency
- Time to contract creation
- Time to signature
- Time to approval
- Reduction in email back-and-forth

### User Satisfaction
- Client feedback on ease of use
- Internal user feedback
- Feature usage analytics
- Support ticket reduction

## Timeline Estimate

### Phase 1: Core Infrastructure (1-2 weeks)
- Database schema
- Clerk role setup
- Navigation

### Phase 2: Client Management (1 week)
- Client CRUD
- Client UI

### Phase 3: Document Management (2-3 weeks)
- Document upload
- Versioning
- AI diff summaries
- Document viewer

### Phase 4: DocuSign Integration (2 weeks)
- DocuSign setup
- Envelope creation
- Webhook handling
- Signature status UI

### Phase 5: Email Mockups (2 weeks)
- Email editor
- Storage
- Approval workflow

### Phase 6: Payment Methods (1 week)
- Payment method management
- Asset type extensions

### Phase 7: Contracts UI (2 weeks)
- List page
- Detail page
- All components

### Phase 8: Integration (1-2 weeks)
- Project linking
- Approval integration
- Notifications

**Total Estimate: 12-16 weeks**

## Dependencies

### External Services
- **DocuSign API**: Requires account and API credentials
- **AI Service**: OpenAI or Anthropic API key
- **Supabase Storage**: Already in use
- **Clerk**: Already in use

### NPM Packages
- `docusign-esign` - DocuSign SDK
- `mammoth` or `docx` - Word document parsing
- `react-quill` or `slate` - Rich text editor
- `docx-pdf` or cloud service - PDF conversion

### Environment Variables
- `DOCUSIGN_INTEGRATION_KEY`
- `DOCUSIGN_USER_ID`
- `DOCUSIGN_ACCOUNT_ID`
- `DOCUSIGN_RSA_PRIVATE_KEY`
- `DOCUSIGN_API_BASE_URL`
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`

## Notes

- This plan preserves all existing features
- Contracts module is additive, not replacing anything
- Gradual adoption is possible
- Can start with MVP features and add enhancements later
- Consider user feedback during development to adjust priorities

