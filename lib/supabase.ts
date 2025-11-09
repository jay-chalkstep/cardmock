import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Client-side Supabase client with lazy initialization
 * Uses anon key for browser-safe operations with RLS policies
 */

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create the client-side Supabase client
 * Uses lazy initialization to avoid issues during build time
 */
function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set. Please check your environment variables.');
    }

    if (!supabaseAnonKey) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. Please check your environment variables.');
    }

    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}

/**
 * Export a proxy that lazily initializes the Supabase client
 * This maintains backward compatibility with existing code that uses `supabase`
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    const client = getSupabase();
    const value = client[prop as keyof SupabaseClient];

    // If the property is a function, bind it to the client instance
    if (typeof value === 'function') {
      return value.bind(client);
    }

    return value;
  }
});

// Storage bucket names
export const LOGOS_BUCKET = 'logos';
export const BRANDS_BUCKET = 'brands'; // New name for logos bucket
export const TEMPLATES_BUCKET = 'card-templates'; // Actual bucket name in Supabase Storage
export const ASSETS_BUCKET = 'card-mockups'; // Actual bucket name in Supabase Storage

// Deprecated: Use new bucket names above
export const CARD_TEMPLATES_BUCKET = TEMPLATES_BUCKET;
export const CARD_MOCKUPS_BUCKET = ASSETS_BUCKET;

// Database types
export interface BrandColor {
  id: string;
  logo_id?: string; // deprecated - will migrate to brand_id
  brand_id?: string;
  hex: string;
  type?: string;
  brightness?: number;
  created_at: string;
  updated_at: string;
}

export interface BrandFont {
  id: string;
  logo_id?: string; // deprecated - will migrate to brand_id
  brand_id?: string;
  font_name: string;
  font_type?: string;
  origin?: string;
  created_at: string;
  updated_at: string;
}

export interface LogoVariant {
  id: string;
  brand_id: string;
  organization_id: string;
  logo_url: string;
  logo_type?: string; // icon, logo, symbol, etc.
  logo_format?: string; // png, svg, jpg, etc.
  theme?: string; // light, dark
  width?: number;
  height?: number;
  file_size?: number;
  background_color?: string;
  accent_color?: string;
  is_uploaded?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  company_name: string;
  domain: string;
  organization_id: string;
  description?: string;
  primary_logo_variant_id?: string;
  created_at: string;
  updated_at: string;
  // Optional related data
  logo_variants?: LogoVariant[];
  brand_colors?: BrandColor[];
  brand_fonts?: BrandFont[];
  primary_logo_variant?: LogoVariant;
}

// Deprecated: Use Brand + LogoVariant instead
export interface Logo {
  id: string;
  company_name: string;
  domain?: string;
  description?: string;
  logo_url: string;
  logo_type?: string;
  logo_format?: string;
  theme?: string;
  width?: number;
  height?: number;
  file_size?: number;
  background_color?: string;
  accent_color?: string;
  is_uploaded?: boolean;
  created_at: string;
  updated_at: string;
  brand_colors?: BrandColor[];
  brand_fonts?: BrandFont[];
}

// Modern interfaces (v3.5.0)
export interface Template {
  id: string;
  name: string;
  description?: string;
  canvas_data?: any; // JSON canvas configuration
  preview_url?: string;
  is_template: boolean;
  category?: string;
  tags?: string[];
  metadata?: any;
  usage_count: number;
  is_featured: boolean;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Asset {
  id: string;
  brand_id: string;
  name: string;
  description?: string;
  canvas_data?: any; // JSON canvas configuration
  preview_url?: string;
  tags?: string[];
  metadata?: any;
  is_featured: boolean;
  view_count: number;
  share_count: number;
  organization_id: string;
  created_by: string;
  folder_id?: string; // Folder organization
  project_id?: string; // Project organization
  contract_id?: string; // Contract reference
  // Final approval (Migration 18)
  final_approved_by?: string; // Clerk user ID of project owner
  final_approved_at?: string;
  final_approval_notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data (optional, populated when fetching with joins)
  brand?: Brand;
  folder?: Folder;
  project?: Project;
}

// Deprecated interfaces - Use Template and Asset instead
export interface CardTemplate {
  id: string;
  template_name: string;
  template_url: string;
  organization_id: string;
  file_type?: string;
  file_size?: number;
  uploaded_date: string;
  created_at: string;
  updated_at: string;
}

export interface CardMockup {
  id: string;
  mockup_name: string;
  logo_id: string;
  template_id: string;
  organization_id: string;
  created_by?: string; // Clerk user ID (added in 04 migration)
  folder_id?: string; // Folder organization (added in 04 migration)
  project_id?: string; // Project organization (added in 07 migration)
  // Final approval (Migration 18)
  final_approved_by?: string;
  final_approved_at?: string;
  final_approval_notes?: string;
  logo_x: number; // Percentage from left
  logo_y: number; // Percentage from top
  logo_scale: number; // Logo width as percentage of card width
  mockup_image_url?: string;
  created_at: string;
  updated_at: string;
  // Joined data (optional, populated when fetching with joins)
  logo?: Logo;
  template?: CardTemplate;
  folder?: Folder;
  project?: Project;
}

export interface Folder {
  id: string;
  name: string;
  created_by: string; // Clerk user ID
  organization_id: string;
  parent_folder_id?: string;
  is_org_shared: boolean;
  created_at: string;
  updated_at: string;
  // Computed data (optional)
  asset_count?: number; // Renamed from mockup_count (v3.5.0)
  mockup_count?: number; // Deprecated: use asset_count
  subfolders?: Folder[];
}

export type ProjectStatus = 'active' | 'completed' | 'archived';

// Contract types
export type ContractStatus = 'draft' | 'pending_signature' | 'signed' | 'amended' | 'expired' | 'voided';
export type ContractType = 'new' | 'amendment';
export type DocuSignStatus = 'sent' | 'delivered' | 'signed' | 'declined' | 'voided' | 'completed';
export type EmailMockupStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected';
export type PaymentMethodStatus = 'pending_approval' | 'approved' | 'rejected';

export interface Client {
  id: string;
  organization_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Contract {
  id: string;
  client_id: string;
  project_id?: string;
  contract_number: string;
  status: ContractStatus;
  type: ContractType;
  parent_contract_id?: string;
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined data
  clients?: Client;
  projects?: { id: string; name: string };
}

export interface ContractDocument {
  id: string;
  contract_id: string;
  version_number: number;
  file_url: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  docu_sign_envelope_id?: string;
  docu_sign_status?: DocuSignStatus;
  is_current: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface ContractDocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  diff_summary?: string;
  diff_summary_generated_at?: string;
  created_by: string;
  created_at: string;
}

export interface EmailMockup {
  id: string;
  contract_id?: string;
  project_id?: string;
  name: string;
  html_content: string;
  preview_url?: string;
  branding_data?: any; // JSONB
  status: EmailMockupStatus;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  contract_id: string;
  type: string;
  details: any; // JSONB
  status: PaymentMethodStatus;
  approved_by?: string;
  approved_at?: string;
  organization_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  client_name?: string;
  description?: string;
  status: ProjectStatus;
  color: string; // Hex color for UI customization
  workflow_id?: string; // Optional workflow template assignment
  contract_id?: string; // Optional contract reference
  created_by: string; // Clerk user ID
  created_at: string;
  updated_at: string;
  // Computed fields (from JOINs or aggregates)
  asset_count?: number; // Renamed from mockup_count (v3.5.0)
  mockup_count?: number; // Deprecated: use asset_count
  asset_previews?: Array<{ // Renamed from mockup_previews (v3.5.0)
    id: string;
    name: string;
    preview_url: string;
  }>;
  mockup_previews?: Array<{ // Deprecated: use asset_previews
    id: string;
    mockup_name: string;
    mockup_image_url: string;
  }>;
  workflow?: Workflow; // Populated via JOIN
}

// Workflow types
export type WorkflowStageColor = 'yellow' | 'green' | 'blue' | 'purple' | 'red' | 'orange' | 'gray';

export interface WorkflowStage {
  order: number;
  name: string;
  color: WorkflowStageColor;
}

export interface Workflow {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  stages: WorkflowStage[];
  is_default: boolean;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Computed fields
  stage_count?: number;
  project_count?: number;
}

export interface ProjectStageReviewer {
  id: string;
  project_id: string;
  stage_order: number;
  user_id: string;
  user_name: string;
  user_image_url?: string;
  added_by: string;
  created_at: string;
}

// Stage progress types
export type StageStatus = 'pending' | 'in_review' | 'approved' | 'changes_requested' | 'pending_final_approval';

// Modern interface (v3.5.0, updated in migration 18)
export interface AssetStageProgress {
  id: string;
  asset_id: string;
  project_id: string;
  stage_order: number;
  status: StageStatus;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  notes?: string;
  notification_sent: boolean;
  notification_sent_at?: string;
  approvals_required: number; // Migration 18: Number of reviewers assigned
  approvals_received: number; // Migration 18: Number who have approved
  created_at: string;
  updated_at: string;
}

// Deprecated: Use AssetStageProgress
export interface MockupStageProgress {
  id: string;
  asset_id: string; // Updated to match migration 13 (was mockup_id)
  project_id: string;
  stage_order: number;
  status: StageStatus;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  notes?: string;
  notification_sent: boolean;
  notification_sent_at?: string;
  approvals_required: number; // Migration 18
  approvals_received: number; // Migration 18
  created_at: string;
  updated_at: string;
}

// Helper type for UI - asset with stage progress (v3.5.0)
export interface AssetWithProgress extends Asset {
  progress?: AssetStageProgress[];
  current_stage?: number; // The stage currently in_review or last approved
  overall_status?: 'not_started' | 'in_progress' | 'approved' | 'changes_requested';
}

// Deprecated: Use AssetWithProgress
export interface MockupWithProgress extends CardMockup {
  progress?: MockupStageProgress[];
  current_stage?: number; // The stage currently in_review or last approved
  overall_status?: 'not_started' | 'in_progress' | 'approved' | 'changes_requested';
}

// Stage progress with workflow stage details (for display)
export interface AssetStageProgressWithDetails extends AssetStageProgress {
  stage_name?: string;
  stage_color?: WorkflowStageColor;
}

// Deprecated: Use AssetStageProgressWithDetails
export interface MockupStageProgressWithDetails extends MockupStageProgress {
  stage_name?: string;
  stage_color?: WorkflowStageColor;
}

// User-Level Approval Tracking (Migration 18)

// Individual user approval record for a stage
export interface MockupStageUserApproval {
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
  updated_at: string;
}

// Approval progress summary for a stage
export interface ApprovalProgress {
  stage_order: number;
  stage_name?: string;
  stage_color?: WorkflowStageColor;
  approvals_required: number;
  approvals_received: number;
  is_complete: boolean;
  user_approvals: MockupStageUserApproval[];
}

// Approvals grouped by stage for display
export interface ApprovalsByStage {
  [stage_order: number]: MockupStageUserApproval[];
}

// Complete approval summary for an asset
export interface AssetApprovalSummary {
  approvals_by_stage: ApprovalsByStage;
  progress_summary: { [stage_order: number]: ApprovalProgress };
  final_approval?: {
    approved_by: string;
    approved_at: string;
    notes?: string;
  };
}