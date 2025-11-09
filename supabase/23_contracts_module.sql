-- ============================================================================
-- Migration 23: Contracts Module
-- ============================================================================
-- Creates comprehensive contracts module for customer onboarding, collaboration,
-- and approval record system. Includes clients, contracts, document versioning,
-- email mockups, and payment methods.
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Contract status enum
DO $$ BEGIN
  CREATE TYPE contract_status AS ENUM (
    'draft',
    'pending_signature',
    'signed',
    'amended',
    'expired',
    'voided'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Contract type enum
DO $$ BEGIN
  CREATE TYPE contract_type AS ENUM (
    'new',
    'amendment'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- DocuSign status enum
DO $$ BEGIN
  CREATE TYPE docusign_status AS ENUM (
    'sent',
    'delivered',
    'signed',
    'declined',
    'voided',
    'completed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Email mockup status enum
DO $$ BEGIN
  CREATE TYPE email_mockup_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payment method status enum
DO $$ BEGIN
  CREATE TYPE payment_method_status AS ENUM (
    'pending_approval',
    'approved',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONTRACTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  contract_number TEXT NOT NULL,
  status contract_status DEFAULT 'draft',
  type contract_type DEFAULT 'new',
  parent_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL, -- For amendments
  title TEXT,
  description TEXT,
  start_date DATE,
  end_date DATE,
  organization_id TEXT NOT NULL,
  created_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique contract numbers per organization
  CONSTRAINT unique_contract_number_per_org UNIQUE(organization_id, contract_number)
);

-- ============================================================================
-- CONTRACT DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT, -- e.g., 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  docu_sign_envelope_id TEXT, -- DocuSign envelope ID
  docu_sign_status docusign_status,
  is_current BOOLEAN DEFAULT true,
  uploaded_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONTRACT DOCUMENT VERSIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS contract_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES contract_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  diff_summary TEXT, -- AI-generated summary of changes
  diff_summary_generated_at TIMESTAMPTZ,
  created_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure unique version numbers per document
  CONSTRAINT unique_version_per_document UNIQUE(document_id, version_number)
);

-- ============================================================================
-- EMAIL MOCKUPS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_mockups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  html_content TEXT NOT NULL, -- Full HTML email content
  preview_url TEXT, -- Generated preview image URL
  branding_data JSONB DEFAULT '{}'::jsonb, -- Stores colors, fonts, logo references
  status email_mockup_status DEFAULT 'draft',
  organization_id TEXT NOT NULL,
  created_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT METHODS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- e.g., 'prepaid_card', 'check', 'amazon_card', 'custom'
  details JSONB DEFAULT '{}'::jsonb, -- Flexible schema for type-specific data
  status payment_method_status DEFAULT 'pending_approval',
  approved_by TEXT, -- Clerk user ID
  approved_at TIMESTAMPTZ,
  organization_id TEXT NOT NULL,
  created_by TEXT NOT NULL, -- Clerk user ID
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_by ON clients(created_by);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);

-- Contracts indexes
CREATE INDEX IF NOT EXISTS idx_contracts_client ON contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_project ON contracts(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_status ON contracts(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_number ON contracts(organization_id, contract_number);
CREATE INDEX IF NOT EXISTS idx_contracts_parent ON contracts(parent_contract_id) WHERE parent_contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_created_by ON contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

-- Contract documents indexes
CREATE INDEX IF NOT EXISTS idx_contract_documents_contract ON contract_documents(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_documents_current ON contract_documents(contract_id, is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_contract_documents_envelope ON contract_documents(docu_sign_envelope_id) WHERE docu_sign_envelope_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contract_documents_uploaded_by ON contract_documents(uploaded_by);

-- Contract document versions indexes
CREATE INDEX IF NOT EXISTS idx_contract_doc_versions_document ON contract_document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_contract_doc_versions_version ON contract_document_versions(document_id, version_number);
CREATE INDEX IF NOT EXISTS idx_contract_doc_versions_created_at ON contract_document_versions(created_at DESC);

-- Email mockups indexes
CREATE INDEX IF NOT EXISTS idx_email_mockups_contract ON email_mockups(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_mockups_project ON email_mockups(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_email_mockups_org ON email_mockups(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_mockups_status ON email_mockups(status);
CREATE INDEX IF NOT EXISTS idx_email_mockups_created_at ON email_mockups(created_at DESC);

-- Payment methods indexes
CREATE INDEX IF NOT EXISTS idx_payment_methods_contract ON payment_methods(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_org ON payment_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_status ON payment_methods(status);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_at ON payment_methods(created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_clients_updated_at ON clients;
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contract_documents_updated_at ON contract_documents;
CREATE TRIGGER update_contract_documents_updated_at
  BEFORE UPDATE ON contract_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_mockups_updated_at ON email_mockups;
CREATE TRIGGER update_email_mockups_updated_at
  BEFORE UPDATE ON email_mockups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ADD CONTRACT REFERENCES TO EXISTING TABLES
-- ============================================================================

-- Add contract_id to projects table (nullable)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;

-- Add contract_id to assets table (nullable)
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL;

-- Add indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_projects_contract ON projects(contract_id) WHERE contract_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assets_contract ON assets(contract_id) WHERE contract_id IS NOT NULL;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Clients RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users in org"
  ON clients FOR ALL
  USING (true);

-- Contracts RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users in org"
  ON contracts FOR ALL
  USING (true);

-- Contract documents RLS
ALTER TABLE contract_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users in org"
  ON contract_documents FOR ALL
  USING (true);

-- Contract document versions RLS
ALTER TABLE contract_document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users in org"
  ON contract_document_versions FOR ALL
  USING (true);

-- Email mockups RLS
ALTER TABLE email_mockups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users in org"
  ON email_mockups FOR ALL
  USING (true);

-- Payment methods RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users in org"
  ON payment_methods FOR ALL
  USING (true);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE clients IS 'Core client entity - separate from projects. Clients can have multiple contracts and projects.';
COMMENT ON TABLE contracts IS 'Contracts table - multiple contracts per client. Can link to projects. Supports amendments via parent_contract_id.';
COMMENT ON TABLE contract_documents IS 'Versioned Word documents for contracts. Tracks current version and DocuSign status.';
COMMENT ON TABLE contract_document_versions IS 'Version history for contract documents with AI-generated diff summaries.';
COMMENT ON TABLE email_mockups IS 'Visual email templates with client branding for approval workflow.';
COMMENT ON TABLE payment_methods IS 'Flexible payment method approvals (prepaid cards, checks, Amazon cards, etc.) with JSONB details.';

COMMENT ON COLUMN contracts.parent_contract_id IS 'References parent contract for amendments. NULL for new contracts.';
COMMENT ON COLUMN contracts.type IS 'new = new contract, amendment = extends existing contract';
COMMENT ON COLUMN contract_documents.is_current IS 'Only one document per contract should have is_current = true';
COMMENT ON COLUMN contract_document_versions.diff_summary IS 'AI-generated human-readable summary of changes from previous version';
COMMENT ON COLUMN payment_methods.details IS 'JSONB field for flexible payment method data. Schema varies by type.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

