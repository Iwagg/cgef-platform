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
