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
