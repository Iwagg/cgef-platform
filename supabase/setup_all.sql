-- CGEF Platform : les 6 migrations réunies, à exécuter UNE fois sur un projet Supabase vierge.
-- Généré à partir de supabase/migrations/ (ne pas modifier à la main).

-- ════════ 20260301000000_base_schema.sql ════════
/*
  # CGEF Platform® — Schéma de base

  Les migrations suivantes (20260328…, 20260404…, 20260405…) modifient ces tables
  sans jamais les créer : cette migration doit donc être exécutée en premier sur
  un projet Supabase vierge.

  Tables : organizations, profiles, assessments, assessment_responses,
           assessment_scores, action_plans
  Les politiques RLS sont créées par les migrations suivantes.
*/

-- ── organizations ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  sector          TEXT,
  employee_count  INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── profiles (1 ligne par utilisateur auth.users) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL DEFAULT '',
  role            TEXT NOT NULL DEFAULT 'analyst'
                  CHECK (role IN ('analyst', 'manager', 'ciso', 'admin')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── assessments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  scope               TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'in_progress', 'completed')),
  frameworks_in_scope TEXT[] NOT NULL DEFAULT '{}',
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── assessment_responses ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessment_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  process_id      TEXT NOT NULL,
  pillar_id       TEXT NOT NULL,
  maturity_level  SMALLINT NOT NULL CHECK (maturity_level BETWEEN 0 AND 5),
  evidence        TEXT,
  notes           TEXT,
  answered_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  answered_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, process_id)
);

-- ── assessment_scores ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assessment_scores (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  global_score        NUMERIC(4, 2) NOT NULL,
  cgs_tier            TEXT NOT NULL CHECK (cgs_tier IN ('AAA', 'AA', 'A', 'BBB', 'BB', 'B')),
  cmi_index           INTEGER NOT NULL,
  pillar_scores       JSONB NOT NULL DEFAULT '{}',
  equivalence_applies BOOLEAN NOT NULL DEFAULT false,
  computed_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── action_plans ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.action_plans (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id     UUID REFERENCES public.assessments(id) ON DELETE CASCADE,
  target_pillar     TEXT,
  target_process    TEXT,
  title             TEXT NOT NULL,
  description       TEXT,
  priority          TEXT NOT NULL DEFAULT 'medium'
                    CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status            TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  owner_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date          DATE,
  estimated_effort  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS activée (politiques ajoutées par les migrations suivantes) ────────────
ALTER TABLE public.organizations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_plans         ENABLE ROW LEVEL SECURITY;

-- ── Création automatique du profil à l'inscription ─────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'analyst')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── updated_at automatique ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_assessments_updated_at ON public.assessments;
CREATE TRIGGER trg_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_action_plans_updated_at ON public.action_plans;
CREATE TRIGGER trg_action_plans_updated_at
  BEFORE UPDATE ON public.action_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ════════ 20260328025316_fix_security_and_performance_issues.sql ════════
/*
  # Security and Performance Fixes

  1. Missing Indexes
    - Add index on action_plans.owner_id for FK performance
    - Add index on assessment_responses.answered_by for FK performance  
    - Add index on assessments.created_by for FK performance

  2. RLS Policy Optimization
    - Replace auth.uid() with (select auth.uid()) for all policies
    - This prevents re-evaluation per row and improves query performance

  3. Function Search Path
    - Set explicit search_path on functions to prevent mutable search_path issues

  4. Cleanup Duplicate Policies
    - Remove redundant SELECT policies where multiple exist
*/

-- 1. Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_action_plans_owner ON action_plans(owner_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_answered_by ON assessment_responses(answered_by);
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);

-- 2. Fix function search_path issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'analyst'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 3. Drop and recreate RLS policies with optimized auth function calls

-- Organizations policies
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON organizations;

CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can manage organizations"
  ON organizations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'ciso')
    )
  );

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = (select auth.uid()));

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can view organization profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- Assessments policies
DROP POLICY IF EXISTS "Users can view organization assessments" ON assessments;
DROP POLICY IF EXISTS "Users can create assessments" ON assessments;
DROP POLICY IF EXISTS "Users can update organization assessments" ON assessments;
DROP POLICY IF EXISTS "Users can delete organization assessments" ON assessments;

CREATE POLICY "Users can view organization assessments"
  ON assessments FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create assessments"
  ON assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update organization assessments"
  ON assessments FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete organization assessments"
  ON assessments FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- Assessment responses policies
DROP POLICY IF EXISTS "Users can view assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Users can create assessment responses" ON assessment_responses;
DROP POLICY IF EXISTS "Users can update assessment responses" ON assessment_responses;

CREATE POLICY "Users can view assessment responses"
  ON assessment_responses FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create assessment responses"
  ON assessment_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update assessment responses"
  ON assessment_responses FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

-- Assessment scores policies
DROP POLICY IF EXISTS "Users can view assessment scores" ON assessment_scores;
DROP POLICY IF EXISTS "Users can manage assessment scores" ON assessment_scores;

CREATE POLICY "Users can view assessment scores"
  ON assessment_scores FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can insert assessment scores"
  ON assessment_scores FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

-- Action plans policies
DROP POLICY IF EXISTS "Users can view action plans" ON action_plans;
DROP POLICY IF EXISTS "Users can create action plans" ON action_plans;
DROP POLICY IF EXISTS "Users can update action plans" ON action_plans;
DROP POLICY IF EXISTS "Users can delete action plans" ON action_plans;

CREATE POLICY "Users can view action plans"
  ON action_plans FOR SELECT
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can create action plans"
  ON action_plans FOR INSERT
  TO authenticated
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can update action plans"
  ON action_plans FOR UPDATE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  )
  WITH CHECK (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );

CREATE POLICY "Users can delete action plans"
  ON action_plans FOR DELETE
  TO authenticated
  USING (
    assessment_id IN (
      SELECT a.id FROM assessments a
      JOIN profiles p ON p.organization_id = a.organization_id
      WHERE p.id = (select auth.uid())
    )
  );


-- ════════ 20260404012444_cleanup_unused_indexes_and_merge_policies.sql ════════
/*
  # Cleanup Unused Indexes and Merge Duplicate Policies

  1. Remove Unused Indexes
    - Drop indexes that have never been used to reduce storage overhead
    - Note: These can be recreated if query patterns change

  2. Merge Multiple Permissive Policies
    - Combine duplicate SELECT policies for organizations table
    - Combine duplicate SELECT policies for profiles table
    - Using single policies with OR conditions for better performance
*/

-- 1. Drop unused indexes
DROP INDEX IF EXISTS idx_profiles_organization;
DROP INDEX IF EXISTS idx_assessments_organization;
DROP INDEX IF EXISTS idx_assessments_status;
DROP INDEX IF EXISTS idx_responses_assessment;
DROP INDEX IF EXISTS idx_responses_pillar;
DROP INDEX IF EXISTS idx_action_plans_assessment;
DROP INDEX IF EXISTS idx_action_plans_status;
DROP INDEX IF EXISTS idx_action_plans_owner;
DROP INDEX IF EXISTS idx_assessment_responses_answered_by;
DROP INDEX IF EXISTS idx_assessments_created_by;

-- 2. Fix multiple permissive policies for organizations

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON organizations;

-- Create single SELECT policy
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );

-- Create separate INSERT/UPDATE/DELETE policies for admins only
CREATE POLICY "Admins can insert organizations"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'ciso')
    )
  );

CREATE POLICY "Admins can update organizations"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'ciso')
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'ciso')
    )
  );

CREATE POLICY "Admins can delete organizations"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid()) AND role IN ('admin', 'ciso')
    )
  );

-- 3. Fix multiple permissive policies for profiles

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view organization profiles" ON profiles;

-- Create single merged SELECT policy
CREATE POLICY "Users can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid())
    OR
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE id = (select auth.uid())
    )
  );


-- ════════ 20260405000000_complete_schema.sql ════════
/*
  # CGEF Platform® — Schéma Complet v2.0
  
  Corrections :
  1. Recréation des index de performance supprimés par la migration précédente
  2. Ajout des 8 tables manquantes : audit_logs, regulatory_alerts, board_pack_jobs,
     sector_benchmarks, notifications, mfa_configs, framework_registry, regulatory_calendars
  3. Ajout des colonnes manquantes dans les tables existantes
  4. Politiques RLS pour les nouvelles tables
*/

-- ── 1. RECRÉATION DES INDEX DE PERFORMANCE (supprimés par la migration 20260404) ──
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_organization ON assessments(organization_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_responses_assessment ON assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_responses_pillar ON assessment_responses(process_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_assessment ON action_plans(assessment_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_status ON action_plans(status);
CREATE INDEX IF NOT EXISTS idx_action_plans_owner ON action_plans(owner_id);

-- ── 2. COLONNES MANQUANTES ────────────────────────────────────────────────────────

-- organizations : colonnes supplémentaires
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country CHAR(2) DEFAULT 'FR';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_oiv BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS nis2_entity_type VARCHAR(50);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- profiles : colonnes supplémentaires
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- action_plans : colonnes supplémentaires
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES profiles(id);
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12, 2);
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'EUR';
ALTER TABLE action_plans ADD COLUMN IF NOT EXISTS ctm_phase SMALLINT CHECK (ctm_phase BETWEEN 1 AND 5);

-- assessment_scores : colonne version algorithme
ALTER TABLE assessment_scores ADD COLUMN IF NOT EXISTS algorithm_version VARCHAR(20) DEFAULT 'v1.0';

-- ── 3. TABLE : audit_logs (APPEND ONLY — immuable) ──────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  action        VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id   UUID,
  metadata      JSONB DEFAULT '{}',
  ip_address    INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "CISOs can read org audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p
      WHERE p.user_id = (SELECT auth.uid()) AND p.role IN ('ciso', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ── 4. TABLE : framework_registry ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS framework_registry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            VARCHAR(50) UNIQUE NOT NULL,
  name            VARCHAR(255) NOT NULL,
  version         VARCHAR(50) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'active',
  controls_count  INTEGER NOT NULL DEFAULT 0,
  mappings_json   JSONB DEFAULT '{}',
  metadata        JSONB DEFAULT '{}',
  ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at    TIMESTAMPTZ,
  retired_at      TIMESTAMPTZ
);

ALTER TABLE framework_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All users can read active frameworks"
  ON framework_registry FOR SELECT TO authenticated
  USING (status = 'active');

-- Seed des référentiels actifs
INSERT INTO framework_registry (code, name, version, status, controls_count, activated_at) VALUES
  ('ISO27001_2022', 'ISO 27001:2022', '2022', 'active', 93, now()),
  ('NIS2', 'NIS2', '2022', 'active', 21, now()),
  ('DORA', 'DORA', '2022', 'active', 30, now()),
  ('RGPD', 'RGPD', '2016', 'active', 99, now()),
  ('NIST_CSF_2', 'NIST CSF 2.0', '2024', 'active', 106, now()),
  ('CIS_V8', 'CIS Controls v8.1', '2023', 'active', 153, now()),
  ('SOC2', 'SOC 2 Type II', '2022', 'active', 64, now()),
  ('PCI_DSS_V4', 'PCI-DSS v4.0', '2024', 'active', 281, now())
ON CONFLICT (code) DO NOTHING;

-- ── 5. TABLE : regulatory_alerts ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulatory_alerts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id    VARCHAR(50) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  description     TEXT,
  severity        VARCHAR(10) NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  deadline        DATE,
  source_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  published_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE regulatory_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read regulatory alerts"
  ON regulatory_alerts FOR SELECT TO authenticated USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_reg_alerts_severity ON regulatory_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_reg_alerts_framework ON regulatory_alerts(framework_id);

-- ── 6. TABLE : regulatory_calendars ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulatory_calendars (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id    VARCHAR(50) NOT NULL,
  title           VARCHAR(500) NOT NULL,
  deadline_date   DATE NOT NULL,
  event_type      VARCHAR(50) NOT NULL DEFAULT 'reporting',
  description     TEXT,
  is_recurring    BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE regulatory_calendars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read regulatory calendars"
  ON regulatory_calendars FOR SELECT TO authenticated USING (true);

-- ── 7. TABLE : board_pack_jobs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_pack_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_id   UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  requested_by    UUID NOT NULL REFERENCES auth.users(id),
  format          VARCHAR(50) NOT NULL DEFAULT 'board',
  language        CHAR(2) NOT NULL DEFAULT 'fr',
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  file_url        TEXT,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE board_pack_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own org board pack jobs"
  ON board_pack_jobs FOR ALL TO authenticated
  USING (
    organization_id IN (
      SELECT p.organization_id FROM profiles p WHERE p.user_id = (SELECT auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_board_pack_jobs_org ON board_pack_jobs(organization_id);
CREATE INDEX IF NOT EXISTS idx_board_pack_jobs_status ON board_pack_jobs(status);

-- ── 8. TABLE : sector_benchmarks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sector_benchmarks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector          VARCHAR(100) NOT NULL,
  pillar_id       CHAR(2) NOT NULL,
  avg_score       NUMERIC(4, 2) NOT NULL,
  p25_score       NUMERIC(4, 2),
  p75_score       NUMERIC(4, 2),
  sample_count    INTEGER NOT NULL DEFAULT 0,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sector_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All authenticated users can read benchmarks"
  ON sector_benchmarks FOR SELECT TO authenticated USING (true);

-- Seed de données de benchmark sectorielles
INSERT INTO sector_benchmarks (sector, pillar_id, avg_score, p25_score, p75_score, sample_count) VALUES
  ('Finance', 'P1', 3.8, 3.2, 4.3, 42), ('Finance', 'P2', 3.6, 3.0, 4.1, 42),
  ('Finance', 'P3', 4.0, 3.5, 4.5, 42), ('Finance', 'P4', 3.7, 3.1, 4.2, 42),
  ('Santé', 'P1', 2.9, 2.3, 3.5, 28), ('Santé', 'P2', 2.7, 2.1, 3.3, 28),
  ('Santé', 'P3', 3.2, 2.6, 3.8, 28), ('Santé', 'P4', 2.8, 2.2, 3.4, 28),
  ('Industrie', 'P1', 2.5, 1.9, 3.1, 35), ('Industrie', 'P2', 2.3, 1.7, 2.9, 35),
  ('Industrie', 'P3', 2.6, 2.0, 3.2, 35), ('Industrie', 'P4', 2.4, 1.8, 3.0, 35)
ON CONFLICT DO NOTHING;

-- ── 9. TABLE : notifications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  type            VARCHAR(50) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  body            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT false,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- ── 10. TABLE : mfa_configs ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mfa_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_id       VARCHAR(255),
  backup_codes    TEXT[],
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE mfa_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own MFA config"
  ON mfa_configs FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ── 11. TRIGGER updated_at sur organizations ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_organizations_updated_at') THEN
    CREATE TRIGGER trg_organizations_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_updated_at') THEN
    CREATE TRIGGER trg_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── 12. FONCTION : handle_new_user (correction) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, full_name, role, mfa_enabled)
  VALUES (
    NEW.id,
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'analyst',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;


-- ════════ 20260509121548_fix_handle_new_user_execute_permissions.sql ════════
/*
  # Fix SECURITY DEFINER function exposure

  The `handle_new_user()` function is a trigger function that should only be
  called internally by the database trigger, never directly via the REST API.

  Changes:
  - Revoke EXECUTE on `handle_new_user()` from `anon` role
  - Revoke EXECUTE on `handle_new_user()` from `authenticated` role
  - Revoke EXECUTE on `handle_new_user()` from `public` (covers all roles)

  This prevents the function from being called via `/rest/v1/rpc/handle_new_user`
  while still allowing the trigger to invoke it normally.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;


-- ════════ 20261022000000_grc_modules.sql ════════
/*
  # CGEF Platform® — Modules GRC v2.1

  1. Fonctions d'aide RLS (current_org_id, current_user_role, has_min_role)
     → corrige la récursion infinie de la politique SELECT sur profiles
  2. Protection des profils : rôle et organisation modifiables uniquement via RPC
  3. RPC : create_organization, join_organization, set_member_role, remove_member
  4. action_plans rattachés à l'organisation (plans d'action hors évaluation)
  5. Tables métier : risks, controls, incidents, evidences, policy_documents,
     assets, third_parties, projects, compliance_requirements, org_frameworks,
     clients
  6. Journal d'audit automatique, références lisibles (R-001…), stockage des preuves
  7. Contenu initial de la veille réglementaire
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. FONCTIONS D'AIDE RLS
-- ═══════════════════════════════════════════════════════════════════════════════

-- SECURITY DEFINER : lit profiles sans repasser par sa RLS (évite la récursion)
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.role_level(p_role TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_role WHEN 'analyst' THEN 1 WHEN 'manager' THEN 2
                     WHEN 'ciso' THEN 3 WHEN 'admin' THEN 4 ELSE 0 END;
$$;

CREATE OR REPLACE FUNCTION public.has_min_role(p_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.role_level(public.current_user_role()) >= public.role_level(p_role);
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. PROFILES & ORGANIZATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS target_maturity NUMERIC(2, 1) NOT NULL DEFAULT 4.0;

-- Politiques profiles non récursives
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view organization profiles" ON public.profiles;
CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) OR organization_id = (SELECT public.current_org_id()));

-- Politiques organizations : création via RPC uniquement
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Admins can insert organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can delete organizations" ON public.organizations;
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT TO authenticated
  USING (id = (SELECT public.current_org_id()));
CREATE POLICY "Admins can update organizations"
  ON public.organizations FOR UPDATE TO authenticated
  USING (id = (SELECT public.current_org_id()) AND (SELECT public.has_min_role('ciso')))
  WITH CHECK (id = (SELECT public.current_org_id()));
CREATE POLICY "Admins can delete organizations"
  ON public.organizations FOR DELETE TO authenticated
  USING (id = (SELECT public.current_org_id()) AND (SELECT public.has_min_role('admin')));

-- Un utilisateur ne peut pas changer lui-même son rôle ni son organisation :
-- seules les RPC ci-dessous (qui posent cgef.privileged) le peuvent.
-- auth.uid() est NULL dans l'éditeur SQL / service_role : l'admin Supabase garde la main.
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND COALESCE(current_setting('cgef.privileged', true), '') <> 'on'
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
          OR NEW.user_id IS DISTINCT FROM OLD.user_id
          OR NEW.id IS DISTINCT FROM OLD.id) THEN
    RAISE EXCEPTION 'Le rôle et l''organisation ne peuvent être modifiés que par un administrateur'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RPC
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_organization(p_name TEXT, p_sector TEXT, p_country TEXT)
RETURNS public.organizations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org public.organizations;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501'; END IF;
  IF public.current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'Vous appartenez déjà à une organisation';
  END IF;
  IF COALESCE(trim(p_name), '') = '' THEN RAISE EXCEPTION 'Nom d''organisation requis'; END IF;

  INSERT INTO public.organizations (name, sector, country)
  -- country est CHAR(2) : « OTHER » ou une valeur invalide devient NULL
  VALUES (trim(p_name), NULLIF(p_sector, ''),
          CASE WHEN length(trim(COALESCE(p_country, ''))) = 2 THEN upper(trim(p_country)) END)
  RETURNING * INTO v_org;

  PERFORM set_config('cgef.privileged', 'on', true);
  UPDATE public.profiles SET organization_id = v_org.id, role = 'admin' WHERE id = auth.uid();
  PERFORM set_config('cgef.privileged', 'off', true);

  -- Référentiels activés par défaut
  INSERT INTO public.org_frameworks (organization_id, framework)
  VALUES (v_org.id, 'ISO 27001'), (v_org.id, 'NIS2'), (v_org.id, 'DORA'), (v_org.id, 'RGPD')
  ON CONFLICT DO NOTHING;

  RETURN v_org;
END; $$;

CREATE OR REPLACE FUNCTION public.join_organization(p_org_id UUID)
RETURNS public.organizations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_org public.organizations;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Non authentifié' USING ERRCODE = '42501'; END IF;
  IF public.current_org_id() IS NOT NULL THEN
    RAISE EXCEPTION 'Vous appartenez déjà à une organisation';
  END IF;
  SELECT * INTO v_org FROM public.organizations WHERE id = p_org_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organisation introuvable'; END IF;

  PERFORM set_config('cgef.privileged', 'on', true);
  UPDATE public.profiles SET organization_id = v_org.id, role = 'analyst' WHERE id = auth.uid();
  PERFORM set_config('cgef.privileged', 'off', true);

  RETURN v_org;
END; $$;

CREATE OR REPLACE FUNCTION public.set_member_role(p_profile_id UUID, p_role TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target public.profiles;
BEGIN
  IF NOT public.has_min_role('ciso') THEN
    RAISE EXCEPTION 'Droits insuffisants' USING ERRCODE = '42501';
  END IF;
  IF public.role_level(p_role) = 0 THEN RAISE EXCEPTION 'Rôle invalide : %', p_role; END IF;
  -- Un CISO ne peut pas attribuer un rôle supérieur au sien
  IF public.role_level(p_role) > public.role_level(public.current_user_role()) THEN
    RAISE EXCEPTION 'Vous ne pouvez pas attribuer un rôle supérieur au vôtre' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_target FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND OR v_target.organization_id IS DISTINCT FROM public.current_org_id() THEN
    RAISE EXCEPTION 'Membre introuvable';
  END IF;
  IF public.role_level(v_target.role) > public.role_level(public.current_user_role()) THEN
    RAISE EXCEPTION 'Vous ne pouvez pas modifier un membre de rang supérieur' USING ERRCODE = '42501';
  END IF;
  -- Garder au moins un administrateur
  IF v_target.role = 'admin' AND p_role <> 'admin' AND (
    SELECT count(*) FROM public.profiles
    WHERE organization_id = v_target.organization_id AND role = 'admin'
  ) <= 1 THEN
    RAISE EXCEPTION 'L''organisation doit conserver au moins un administrateur';
  END IF;

  PERFORM set_config('cgef.privileged', 'on', true);
  UPDATE public.profiles SET role = p_role WHERE id = p_profile_id;
  PERFORM set_config('cgef.privileged', 'off', true);
END; $$;

CREATE OR REPLACE FUNCTION public.remove_member(p_profile_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target public.profiles;
BEGIN
  IF NOT public.has_min_role('admin') THEN
    RAISE EXCEPTION 'Droits insuffisants' USING ERRCODE = '42501';
  END IF;
  IF p_profile_id = auth.uid() THEN RAISE EXCEPTION 'Vous ne pouvez pas vous retirer vous-même'; END IF;
  SELECT * INTO v_target FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND OR v_target.organization_id IS DISTINCT FROM public.current_org_id() THEN
    RAISE EXCEPTION 'Membre introuvable';
  END IF;

  PERFORM set_config('cgef.privileged', 'on', true);
  UPDATE public.profiles SET organization_id = NULL, role = 'analyst' WHERE id = p_profile_id;
  PERFORM set_config('cgef.privileged', 'off', true);
END; $$;

-- Liste des membres avec e-mail (auth.users n'est pas exposé à l'API)
CREATE OR REPLACE FUNCTION public.list_org_members()
RETURNS TABLE (id UUID, full_name TEXT, email TEXT, role TEXT, mfa_enabled BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, u.email::TEXT, p.role, p.mfa_enabled, p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.organization_id = public.current_org_id()
  ORDER BY public.role_level(p.role) DESC, p.full_name;
$$;

REVOKE EXECUTE ON FUNCTION public.create_organization(TEXT, TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.join_organization(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_member_role(UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.remove_member(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_org_members() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.create_organization(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_org_members() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. FONCTIONS GÉNÉRIQUES : référence lisible, journal d'audit
-- ═══════════════════════════════════════════════════════════════════════════════

-- Attribue R-001, R-002… par organisation (préfixe passé en argument du trigger)
CREATE OR REPLACE FUNCTION public.set_record_ref()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_next INTEGER;
BEGIN
  IF NEW.ref IS NULL OR NEW.ref = '' THEN
    PERFORM pg_advisory_xact_lock(hashtext(TG_TABLE_NAME || NEW.organization_id::TEXT));
    EXECUTE format(
      'SELECT COALESCE(MAX((regexp_match(ref, ''(\d+)$''))[1]::INTEGER), 0) + 1 FROM %I.%I WHERE organization_id = $1',
      TG_TABLE_SCHEMA, TG_TABLE_NAME)
    INTO v_next USING NEW.organization_id;
    NEW.ref := TG_ARGV[0] || '-' || lpad(v_next::TEXT, 3, '0');
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.log_record_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row JSONB;
BEGIN
  v_row := to_jsonb(CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END);
  INSERT INTO public.audit_logs (user_id, organization_id, action, resource_type, resource_id, metadata)
  VALUES (
    auth.uid(),
    (v_row->>'organization_id')::UUID,
    lower(TG_OP),
    TG_TABLE_NAME,
    (v_row->>'id')::UUID,
    jsonb_build_object('ref', v_row->>'ref', 'title', COALESCE(v_row->>'title', v_row->>'name'))
  );
  RETURN NULL;
END; $$;

-- audit_logs : organization_id rempli automatiquement pour logAudit() côté client
CREATE OR REPLACE FUNCTION public.fill_audit_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN NEW.organization_id := public.current_org_id(); END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_audit_logs_org ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_org BEFORE INSERT ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fill_audit_org();

-- Applique RLS « même organisation » + triggers standards à une table métier
CREATE OR REPLACE FUNCTION public.setup_org_table(p_table TEXT, p_ref_prefix TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (organization_id)', 'idx_' || p_table || '_org', p_table);

  EXECUTE format('DROP POLICY IF EXISTS "Org members can read" ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS "Org members can insert" ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS "Org members can update" ON public.%I', p_table);
  EXECUTE format('DROP POLICY IF EXISTS "Managers can delete" ON public.%I', p_table);
  EXECUTE format($p$CREATE POLICY "Org members can read" ON public.%I FOR SELECT TO authenticated
    USING (organization_id = (SELECT public.current_org_id()))$p$, p_table);
  EXECUTE format($p$CREATE POLICY "Org members can insert" ON public.%I FOR INSERT TO authenticated
    WITH CHECK (organization_id = (SELECT public.current_org_id()))$p$, p_table);
  EXECUTE format($p$CREATE POLICY "Org members can update" ON public.%I FOR UPDATE TO authenticated
    USING (organization_id = (SELECT public.current_org_id()))
    WITH CHECK (organization_id = (SELECT public.current_org_id()))$p$, p_table);
  EXECUTE format($p$CREATE POLICY "Managers can delete" ON public.%I FOR DELETE TO authenticated
    USING (organization_id = (SELECT public.current_org_id()) AND (SELECT public.has_min_role('manager')))$p$, p_table);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', p_table, p_table);
  EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at()', p_table, p_table);

  EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_audit ON public.%I', p_table, p_table);
  EXECUTE format('CREATE TRIGGER trg_%s_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I
    FOR EACH ROW EXECUTE FUNCTION public.log_record_change()', p_table, p_table);

  IF p_ref_prefix IS NOT NULL THEN
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_ref ON public.%I', p_table, p_table);
    EXECUTE format('CREATE TRIGGER trg_%s_ref BEFORE INSERT ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.set_record_ref(%L)', p_table, p_table, p_ref_prefix);
  END IF;
END; $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. ACTION PLANS : rattachement à l'organisation
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.action_plans ALTER COLUMN assessment_id DROP NOT NULL;
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS ref TEXT;
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100);
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS linked_risk_ref TEXT;
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS linked_control_ref TEXT;
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS linked_incident_ref TEXT;

UPDATE public.action_plans ap SET organization_id = a.organization_id
FROM public.assessments a WHERE ap.assessment_id = a.id AND ap.organization_id IS NULL;
DELETE FROM public.action_plans WHERE organization_id IS NULL;
ALTER TABLE public.action_plans ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.action_plans ALTER COLUMN organization_id SET DEFAULT public.current_org_id();

-- Statuts du tableau Kanban
ALTER TABLE public.action_plans DROP CONSTRAINT IF EXISTS action_plans_status_check;
UPDATE public.action_plans SET status = 'todo' WHERE status = 'open';
UPDATE public.action_plans SET status = 'done' WHERE status = 'completed';
ALTER TABLE public.action_plans ALTER COLUMN status SET DEFAULT 'todo';
ALTER TABLE public.action_plans ADD CONSTRAINT action_plans_status_check
  CHECK (status IN ('todo', 'in_progress', 'blocked', 'done', 'cancelled'));
ALTER TABLE public.action_plans DROP CONSTRAINT IF EXISTS action_plans_org_ref_key;
ALTER TABLE public.action_plans ADD CONSTRAINT action_plans_org_ref_key UNIQUE (organization_id, ref);

DROP POLICY IF EXISTS "Users can view action plans" ON public.action_plans;
DROP POLICY IF EXISTS "Users can create action plans" ON public.action_plans;
DROP POLICY IF EXISTS "Users can update action plans" ON public.action_plans;
DROP POLICY IF EXISTS "Users can delete action plans" ON public.action_plans;
DROP TRIGGER IF EXISTS trg_action_plans_updated_at ON public.action_plans;
SELECT public.setup_org_table('action_plans', 'AP');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. TABLES MÉTIER
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Registre des risques ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.risks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref             TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  category        TEXT,
  domain          TEXT,
  owner           TEXT,
  asset           TEXT,
  likelihood      SMALLINT NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact          SMALLINT NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  inherent_score  SMALLINT GENERATED ALWAYS AS (likelihood * impact) STORED,
  residual_score  SMALLINT CHECK (residual_score BETWEEN 0 AND 25),
  severity        TEXT GENERATED ALWAYS AS (
                    CASE WHEN likelihood * impact >= 15 THEN 'critical'
                         WHEN likelihood * impact >= 10 THEN 'high'
                         WHEN likelihood * impact >= 5  THEN 'medium'
                         ELSE 'low' END) STORED,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'mitigating', 'accepted', 'closed')),
  treatment       TEXT NOT NULL DEFAULT 'mitigate' CHECK (treatment IN ('mitigate', 'accept', 'transfer', 'avoid')),
  trend           TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('increasing', 'stable', 'decreasing')),
  control_refs    TEXT[] NOT NULL DEFAULT '{}',
  due_date        DATE,
  last_reviewed   DATE DEFAULT CURRENT_DATE,
  created_by      UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ref)
);
SELECT public.setup_org_table('risks', 'R');

-- ── Bibliothèque de contrôles ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.controls (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref             TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  domain          TEXT,
  status          TEXT NOT NULL DEFAULT 'not_implemented' CHECK (status IN ('implemented', 'partial', 'not_implemented')),
  effectiveness   SMALLINT NOT NULL DEFAULT 0 CHECK (effectiveness BETWEEN 0 AND 5),
  frameworks      TEXT[] NOT NULL DEFAULT '{}',
  owner           TEXT,
  last_review     DATE,
  next_review     DATE,
  created_by      UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ref)
);
SELECT public.setup_org_table('controls', 'C');

-- ── Incidents de sécurité ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref             TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  severity        TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'remediated', 'resolved')),
  category        TEXT,
  affected_systems TEXT,
  affected_users  INTEGER NOT NULL DEFAULT 0 CHECK (affected_users >= 0),
  reported_by     TEXT,
  assigned_to     TEXT,
  reported_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at     TIMESTAMPTZ,
  root_cause      TEXT,
  impact          TEXT,
  lessons         TEXT,
  created_by      UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ref)
);
SELECT public.setup_org_table('incidents', 'INC');

-- ── Preuves d'audit ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.evidences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref             TEXT,
  title           TEXT NOT NULL,
  type            TEXT,
  control_ref     TEXT,
  framework       TEXT,
  status          TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'provided', 'reviewed', 'accepted', 'rejected')),
  file_path       TEXT,
  file_name       TEXT,
  file_size       BIGINT,
  mime_type       TEXT,
  uploaded_by     TEXT,
  uploaded_at     TIMESTAMPTZ,
  reviewer        TEXT,
  reviewed_at     TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ref)
);
SELECT public.setup_org_table('evidences', 'E');

-- ── Politiques & documents ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.policy_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref             TEXT,
  title           TEXT NOT NULL,
  version         TEXT NOT NULL DEFAULT '1.0',
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'expired')),
  framework       TEXT,
  owner           TEXT,
  content         TEXT,
  approved_by     TEXT,
  approved_at     TIMESTAMPTZ,
  last_review     DATE,
  next_review     DATE,
  created_by      UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ref)
);
SELECT public.setup_org_table('policy_documents', 'P');

-- Seuls les managers et plus peuvent approuver une politique
CREATE OR REPLACE FUNCTION public.check_policy_approval()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved')
     AND auth.uid() IS NOT NULL AND NOT public.has_min_role('manager') THEN
    RAISE EXCEPTION 'Seul un manager, CISO ou administrateur peut approuver une politique'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_policy_documents_approval ON public.policy_documents;
CREATE TRIGGER trg_policy_documents_approval
  BEFORE INSERT OR UPDATE ON public.policy_documents
  FOR EACH ROW EXECUTE FUNCTION public.check_policy_approval();

-- ── Actifs ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.assets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref             TEXT,
  name            TEXT NOT NULL,
  type            TEXT,
  criticality     TEXT NOT NULL DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low')),
  classification  TEXT,
  owner           TEXT,
  description     TEXT,
  risk_score      SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  last_review     DATE,
  created_by      UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ref)
);
SELECT public.setup_org_table('assets', 'A');

-- ── Tiers / fournisseurs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.third_parties (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref             TEXT,
  name            TEXT NOT NULL,
  category        TEXT,
  tier            SMALLINT NOT NULL DEFAULT 2 CHECK (tier BETWEEN 1 AND 3),
  risk_score      SMALLINT NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  status          TEXT NOT NULL DEFAULT 'under_review' CHECK (status IN ('approved', 'under_review', 'flagged')),
  dpa_status      TEXT NOT NULL DEFAULT 'pending' CHECK (dpa_status IN ('signed', 'pending', 'not_required')),
  contact         TEXT,
  annual_spend    NUMERIC(14, 2),
  last_assessment DATE,
  next_assessment DATE,
  created_by      UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ref)
);
SELECT public.setup_org_table('third_parties', 'TP');

-- ── Feuille de route / projets ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref               TEXT,
  title             TEXT NOT NULL,
  description       TEXT,
  category          TEXT,
  priority          TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status            TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'on_hold', 'completed')),
  owner             TEXT,
  start_date        DATE,
  end_date          DATE,
  progress          SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  budget            NUMERIC(14, 2) NOT NULL DEFAULT 0,
  maturity_impact   NUMERIC(3, 1),
  compliance_impact TEXT,
  created_by        UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ref),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
SELECT public.setup_org_table('projects', 'PRJ');

-- ── Exigences de conformité par référentiel ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.compliance_requirements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  framework       TEXT NOT NULL,
  ref             TEXT NOT NULL,
  title           TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'gap' CHECK (status IN ('compliant', 'partial', 'gap', 'na')),
  owner           TEXT,
  due_date        DATE,
  notes           TEXT,
  created_by      UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, framework, ref)
);
SELECT public.setup_org_table('compliance_requirements', NULL);

-- ── Référentiels suivis par l'organisation ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.org_frameworks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  framework            TEXT NOT NULL,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  certification_status TEXT NOT NULL DEFAULT 'Gap Analysis',
  auditor              TEXT,
  last_audit           DATE,
  next_audit           DATE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, framework)
);
SELECT public.setup_org_table('org_frameworks', NULL);

-- ── Portefeuille clients (cabinets de conseil) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.clients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL DEFAULT public.current_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  ref             TEXT,
  name            TEXT NOT NULL,
  sector          TEXT,
  size            TEXT,
  country         TEXT,
  cyber_score     SMALLINT NOT NULL DEFAULT 0 CHECK (cyber_score BETWEEN 0 AND 100),
  risk_level      TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('critical', 'high', 'medium', 'low')),
  consultant      TEXT,
  frameworks      TEXT[] NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'prospect', 'inactive')),
  last_activity   DATE DEFAULT CURRENT_DATE,
  notes           TEXT,
  created_by      UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, ref)
);
SELECT public.setup_org_table('clients', 'CL');

-- Les organisations existantes reçoivent les référentiels par défaut
INSERT INTO public.org_frameworks (organization_id, framework)
SELECT o.id, f.framework FROM public.organizations o
CROSS JOIN (VALUES ('ISO 27001'), ('NIS2'), ('DORA'), ('RGPD')) AS f(framework)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. STOCKAGE DES PREUVES (Supabase Storage)
--    Chemin des fichiers : <organization_id>/<uuid>-<nom du fichier>
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('evidence', 'evidence', false, 52428800)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Evidence read by org" ON storage.objects;
DROP POLICY IF EXISTS "Evidence upload by org" ON storage.objects;
DROP POLICY IF EXISTS "Evidence delete by managers" ON storage.objects;
CREATE POLICY "Evidence read by org" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = (SELECT public.current_org_id())::TEXT);
CREATE POLICY "Evidence upload by org" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'evidence' AND (storage.foldername(name))[1] = (SELECT public.current_org_id())::TEXT);
CREATE POLICY "Evidence delete by managers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'evidence' AND (storage.foldername(name))[1] = (SELECT public.current_org_id())::TEXT
         AND (SELECT public.has_min_role('manager')));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. AUTRES CORRECTIFS
-- ═══════════════════════════════════════════════════════════════════════════════

-- assessment_scores : suppression autorisée (recalcul d'une évaluation)
DROP POLICY IF EXISTS "Users can delete assessment scores" ON public.assessment_scores;
CREATE POLICY "Users can delete assessment scores"
  ON public.assessment_scores FOR DELETE TO authenticated
  USING (assessment_id IN (SELECT id FROM public.assessments WHERE organization_id = (SELECT public.current_org_id())));

-- notifications : chaque utilisateur peut supprimer les siennes
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. VEILLE RÉGLEMENTAIRE — contenu initial
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.regulatory_alerts (framework_id, title, description, severity, deadline, source_url, published_at)
SELECT * FROM (VALUES
  ('NIS2', 'NIS2 Annual Report — Deadline Approaching', 'Essential and important entities must submit their annual NIS2 compliance report to their national authority before 30 June 2026. Failure to comply may result in administrative sanctions.', 'high', DATE '2026-06-30', 'https://www.enisa.europa.eu', TIMESTAMPTZ '2026-04-01'),
  ('DORA', 'DORA — Major ICT Incident Reporting Now Mandatory', 'Since 17 January 2025, DORA is fully applicable. Financial entities must report major ICT incidents to their competent authority within defined timeframes: initial notification within 4 hours of classification.', 'high', NULL, 'https://www.eba.europa.eu', TIMESTAMPTZ '2026-01-17'),
  ('DORA', 'DORA TLPT — Threat-Led Penetration Testing Obligations', 'Significant financial entities must plan and conduct their first TLPT (Threat-Led Penetration Testing) cycle before end of 2026 in accordance with Article 26 of DORA. Coordination with authorities required.', 'medium', DATE '2026-12-31', NULL, TIMESTAMPTZ '2026-03-15'),
  ('RGPD', 'CNIL — Updated Cookie Consent Guidelines', 'The CNIL has published updated guidelines on cookie consent interfaces. Organisations must ensure their consent banners meet the new technical and UX requirements. Enforcement begins Q3 2026.', 'medium', NULL, 'https://www.cnil.fr', TIMESTAMPTZ '2026-02-20'),
  ('ISO 27001', 'ISO 27001:2022 — All Certifications Must Be on New Version', 'The transition period to ISO 27001:2022 ended October 2025. All certified organisations must now operate under the 2022 version. Upcoming audits will exclusively assess against the new controls annex.', 'high', NULL, 'https://www.iso.org', TIMESTAMPTZ '2026-01-01'),
  ('NIS2', 'NIS2 — Significant Incident Notification Timelines', 'Reminder: significant incidents must be notified to the competent authority within 24h (early warning), 72h (initial notification), and 1 month (final report). Supply chain incidents are also in scope.', 'medium', NULL, 'https://www.enisa.europa.eu', TIMESTAMPTZ '2026-03-01'),
  ('NIST CSF', 'NIST CSF 2.0 — Governance Function Added', 'NIST Cybersecurity Framework 2.0 introduces a new "Govern" function covering risk management strategy, supply chain risk, and organisational context. Organisations aligned to NIST CSF should update their control mappings.', 'low', NULL, 'https://www.nist.gov/cyberframework', TIMESTAMPTZ '2026-02-26')
) AS v(framework_id, title, description, severity, deadline, source_url, published_at)
WHERE NOT EXISTS (SELECT 1 FROM public.regulatory_alerts ra WHERE ra.title = v.title);

INSERT INTO public.regulatory_calendars (framework_id, title, deadline_date, event_type)
SELECT * FROM (VALUES
  ('NIS2', 'NIS2 Annual Compliance Report', DATE '2026-06-30', 'reporting'),
  ('DORA', 'DORA TLPT First Cycle', DATE '2026-12-31', 'audit'),
  ('DORA', 'DORA Critical Third-Party Annual Review', DATE '2026-09-30', 'reporting'),
  ('RGPD', 'RGPD — Annual Data Processing Review', DATE '2026-12-31', 'implementation'),
  ('ISO 27001', 'ISO 27001 Surveillance Audit', DATE '2026-10-15', 'audit'),
  ('NIS2', 'NIS2 Annual Compliance Report', DATE '2027-06-30', 'reporting'),
  ('DORA', 'DORA Register of Information Submission', DATE '2027-04-30', 'reporting')
) AS v(framework_id, title, deadline_date, event_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.regulatory_calendars rc WHERE rc.title = v.title AND rc.deadline_date = v.deadline_date
);

