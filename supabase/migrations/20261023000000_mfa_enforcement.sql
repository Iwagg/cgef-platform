/*
  # CGEF Platform® — MFA obligatoire côté base

  Un utilisateur qui a activé la double authentification (facteur TOTP vérifié)
  n'accède aux données qu'avec une session AAL2, c'est-à-dire après avoir saisi
  son code. Sans cette règle, le mot de passe seul suffirait à interroger l'API.

  Politiques RESTRICTIVE : elles s'ajoutent (ET logique) aux politiques existantes.
*/

CREATE OR REPLACE FUNCTION public.mfa_satisfied()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(auth.jwt()->>'aal', 'aal1') = 'aal2'
      OR NOT EXISTS (
        SELECT 1 FROM auth.mfa_factors
        WHERE user_id = auth.uid() AND status = 'verified'
      );
$$;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'organizations', 'assessments', 'assessment_responses', 'assessment_scores', 'action_plans',
    'risks', 'controls', 'incidents', 'evidences', 'policy_documents', 'assets', 'third_parties',
    'projects', 'compliance_requirements', 'org_frameworks', 'clients', 'audit_logs',
    'board_pack_jobs', 'notifications'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Require MFA when enrolled" ON public.%I', t);
    EXECUTE format($p$CREATE POLICY "Require MFA when enrolled" ON public.%I AS RESTRICTIVE
      FOR ALL TO authenticated USING ((SELECT public.mfa_satisfied())) WITH CHECK ((SELECT public.mfa_satisfied()))$p$, t);
  END LOOP;
END $$;

-- profiles : son propre profil reste lisible (l'écran de connexion en a besoin avant le code)
DROP POLICY IF EXISTS "Require MFA when enrolled" ON public.profiles;
CREATE POLICY "Require MFA when enrolled" ON public.profiles AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT public.mfa_satisfied()))
  WITH CHECK (id = (SELECT auth.uid()) OR (SELECT public.mfa_satisfied()));

-- Fichiers de preuves
DROP POLICY IF EXISTS "Evidence requires MFA when enrolled" ON storage.objects;
CREATE POLICY "Evidence requires MFA when enrolled" ON storage.objects AS RESTRICTIVE
  FOR ALL TO authenticated
  USING (bucket_id <> 'evidence' OR (SELECT public.mfa_satisfied()))
  WITH CHECK (bucket_id <> 'evidence' OR (SELECT public.mfa_satisfied()));

-- Les RPC SECURITY DEFINER contournent la RLS : on y applique la même règle
CREATE OR REPLACE FUNCTION public.list_org_members()
RETURNS TABLE (id UUID, full_name TEXT, email TEXT, role TEXT, mfa_enabled BOOLEAN, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.full_name, u.email::TEXT, p.role, p.mfa_enabled, p.created_at
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.organization_id = public.current_org_id() AND public.mfa_satisfied()
  ORDER BY public.role_level(p.role) DESC, p.full_name;
$$;

CREATE OR REPLACE FUNCTION public.require_mfa()
RETURNS VOID LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.mfa_satisfied() THEN
    RAISE EXCEPTION 'Code de double authentification requis' USING ERRCODE = '42501';
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.set_member_role(p_profile_id UUID, p_role TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_target public.profiles;
BEGIN
  PERFORM public.require_mfa();
  IF NOT public.has_min_role('ciso') THEN
    RAISE EXCEPTION 'Droits insuffisants' USING ERRCODE = '42501';
  END IF;
  IF public.role_level(p_role) = 0 THEN RAISE EXCEPTION 'Rôle invalide : %', p_role; END IF;
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
  PERFORM public.require_mfa();
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

REVOKE EXECUTE ON FUNCTION public.require_mfa() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.require_mfa() TO authenticated;
