export type UserRole = 'analyst' | 'manager' | 'ciso' | 'admin';
export type AssessmentStatus = 'draft' | 'in_progress' | 'completed';
export type CGSTier = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B';
export type PillarId = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8';
export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';
export type ActionStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';

export interface Organization {
  id: string;
  name: string;
  sector?: string;
  employee_count?: number;
  country?: string;
  nis2_entity_type?: string;
  is_oiv?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  organization_id?: string;
  full_name: string;
  role: UserRole;
  mfa_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Assessment {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  status: AssessmentStatus;
  framework_scope: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface AssessmentResponse {
  id: string;
  assessment_id: string;
  process_id: string;
  maturity_level: number;
  evidence?: string;
  notes?: string;
  evaluated_by: string;
  evaluated_at: string;
}

export interface AssessmentScore {
  id: string;
  assessment_id: string;
  global_score: number;
  cgs_tier: CGSTier;
  cmi_index: number;
  pillar_scores: Record<PillarId, number>;
  equivalence_applies: boolean;
  computed_at: string;
  algorithm_version?: string;
}

export interface ActionPlan {
  id: string;
  organization_id: string;
  assessment_id?: string;
  process_id?: string;
  title: string;
  description?: string;
  priority: ActionPriority;
  status: ActionStatus;
  responsible?: string;
  due_date?: string;
  estimated_cost?: number;
  currency?: string;
  created_at: string;
  updated_at: string;
}

export interface Pillar {
  id: PillarId;
  name: string;
  description: string;
  processCount: number;
  weight: number;
}

export interface Process {
  id: string;
  pillarId: PillarId;
  name: string;
  description: string;
  objective: string;
  maturityCriteria: Record<number, string[]>;
  regulatoryMappings: Partial<Record<string, string[]>>;
}

export interface Framework {
  id: string;
  name: string;
  version: string;
  controlsCount: number;
  color: string;
}

export interface ScoreResult {
  globalScore: number;
  cgsTier: CGSTier;
  cmiIndex: number;
  pillarScores: Record<PillarId, number>;
  equivalenceApplies: boolean;
  completionRate: number;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  organization_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface RegulatoryAlert {
  id: string;
  framework_id: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  deadline?: string;
  source_url?: string;
  created_at: string;
  is_read: boolean;
}
