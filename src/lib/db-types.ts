// Row types for the organisation-scoped GRC tables (see supabase/migrations/20261022000000_grc_modules.sql)

export type Severity = 'critical' | 'high' | 'medium' | 'low';

interface OrgRow {
  id: string;
  organization_id: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Risk extends OrgRow {
  ref: string;
  title: string;
  description: string | null;
  category: string | null;
  domain: string | null;
  owner: string | null;
  asset: string | null;
  likelihood: number;
  impact: number;
  inherent_score: number;
  residual_score: number | null;
  severity: Severity;
  status: 'open' | 'mitigating' | 'accepted' | 'closed';
  treatment: 'mitigate' | 'accept' | 'transfer' | 'avoid';
  trend: 'increasing' | 'stable' | 'decreasing';
  control_refs: string[];
  due_date: string | null;
  last_reviewed: string | null;
}

export interface Control extends OrgRow {
  ref: string;
  title: string;
  description: string | null;
  domain: string | null;
  status: 'implemented' | 'partial' | 'not_implemented';
  effectiveness: number;
  frameworks: string[];
  owner: string | null;
  last_review: string | null;
  next_review: string | null;
}

export interface Incident extends OrgRow {
  ref: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: 'open' | 'investigating' | 'remediated' | 'resolved';
  category: string | null;
  affected_systems: string | null;
  affected_users: number;
  reported_by: string | null;
  assigned_to: string | null;
  reported_at: string;
  resolved_at: string | null;
  root_cause: string | null;
  impact: string | null;
  lessons: string | null;
}

export interface RemediationAction extends OrgRow {
  ref: string;
  assessment_id: string | null;
  title: string;
  description: string | null;
  priority: Severity;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  progress: number;
  owner_name: string | null;
  due_date: string | null;
  estimated_effort: string | null;
  estimated_cost: number | null;
  linked_risk_ref: string | null;
  linked_control_ref: string | null;
  linked_incident_ref: string | null;
}

export interface Evidence extends OrgRow {
  ref: string;
  title: string;
  type: string | null;
  control_ref: string | null;
  framework: string | null;
  status: 'requested' | 'provided' | 'reviewed' | 'accepted' | 'rejected';
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string | null;
  reviewer: string | null;
  reviewed_at: string | null;
  notes: string | null;
}

export interface PolicyDocument extends OrgRow {
  ref: string;
  title: string;
  version: string;
  status: 'draft' | 'under_review' | 'approved' | 'expired';
  framework: string | null;
  owner: string | null;
  content: string | null;
  approved_by: string | null;
  approved_at: string | null;
  last_review: string | null;
  next_review: string | null;
}

export interface Asset extends OrgRow {
  ref: string;
  name: string;
  type: string | null;
  criticality: Severity;
  classification: string | null;
  owner: string | null;
  description: string | null;
  risk_score: number;
  last_review: string | null;
}

export interface ThirdParty extends OrgRow {
  ref: string;
  name: string;
  category: string | null;
  tier: number;
  risk_score: number;
  status: 'approved' | 'under_review' | 'flagged';
  dpa_status: 'signed' | 'pending' | 'not_required';
  contact: string | null;
  annual_spend: number | null;
  last_assessment: string | null;
  next_assessment: string | null;
}

export interface Project extends OrgRow {
  ref: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: Severity;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed';
  owner: string | null;
  start_date: string | null;
  end_date: string | null;
  progress: number;
  budget: number;
  maturity_impact: number | null;
  compliance_impact: string | null;
}

export type RequirementStatus = 'compliant' | 'partial' | 'gap' | 'na';

export interface ComplianceRequirement extends OrgRow {
  framework: string;
  ref: string;
  title: string;
  status: RequirementStatus;
  owner: string | null;
  due_date: string | null;
  notes: string | null;
}

export interface OrgFramework extends OrgRow {
  framework: string;
  is_active: boolean;
  certification_status: string;
  auditor: string | null;
  last_audit: string | null;
  next_audit: string | null;
}

export interface Client extends OrgRow {
  ref: string;
  name: string;
  sector: string | null;
  size: string | null;
  country: string | null;
  cyber_score: number;
  risk_level: Severity;
  consultant: string | null;
  frameworks: string[];
  status: 'active' | 'prospect' | 'inactive';
  last_activity: string | null;
  notes: string | null;
}

export interface OrgMember {
  id: string;
  full_name: string;
  email: string;
  role: 'analyst' | 'manager' | 'ciso' | 'admin';
  mfa_enabled: boolean;
  created_at: string;
}

export interface RegulatoryAlertRow {
  id: string;
  framework_id: string;
  title: string;
  description: string | null;
  severity: 'high' | 'medium' | 'low';
  deadline: string | null;
  source_url: string | null;
  published_at: string;
}

export interface RegulatoryDeadlineRow {
  id: string;
  framework_id: string;
  title: string;
  deadline_date: string;
  event_type: string;
  description: string | null;
}

// Framework labels used across the app (codes stored as-is in DB columns)
export const FRAMEWORKS = ['ISO 27001', 'NIS2', 'DORA', 'RGPD', 'NIST CSF', 'CIS Controls', 'SOC 2', 'PCI-DSS'];
