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
