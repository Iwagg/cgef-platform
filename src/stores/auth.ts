import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, Organization } from '../lib/types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  initialized: boolean;
  // True when the user has a verified MFA factor but the session is still AAL1 (password only)
  mfaPending: boolean;
  verifyLoginMFA: (code: string) => Promise<void>;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Role changes go through the set_member_role RPC (see Settings > Team)
  updateProfile: (data: { full_name?: string; notification_prefs?: Record<string, boolean> }) => Promise<void>;
  updateOrganization: (data: Partial<Organization>) => Promise<void>;
  createOrganization: (name: string, sector: string, country: string) => Promise<void>;
  joinOrganization: (orgId: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  enableMFA: () => Promise<{ qr: string; secret: string } | null>;
  verifyMFA: (code: string) => Promise<boolean>;
  refreshProfile: () => Promise<void>;
}

async function loadProfileAndOrg(userId: string) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  let organization: Organization | null = null;
  if (profile?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', profile.organization_id)
      .maybeSingle();
    organization = org;
  }
  return { profile, organization };
}

async function isMfaPending() {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2';
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  organization: null,
  loading: false,
  initialized: false,
  mfaPending: false,

  initialize: async () => {
    try {
      set({ loading: true });
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { profile, organization } = await loadProfileAndOrg(session.user.id);
        set({ user: session.user, profile, organization, mfaPending: await isMfaPending() });
      }

      // Supabase calls made directly inside this callback deadlock the auth lock,
      // so the follow-up queries are deferred to the next tick (per supabase-js docs)
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, organization: null, mfaPending: false });
        } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY' || event === 'MFA_CHALLENGE_VERIFIED') && session?.user) {
          const user = session.user;
          setTimeout(async () => {
            const { profile, organization } = await loadProfileAndOrg(user.id);
            set({ user, profile, organization, mfaPending: await isMfaPending() });
          }, 0);
        }
      });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ mfaPending: await isMfaPending() });
    } finally {
      set({ loading: false });
    }
  },

  verifyLoginMFA: async (code) => {
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) throw listError;
    const factor = factors?.totp?.[0];
    if (!factor) throw new Error('No verified authenticator found');
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) throw error;
    set({ mfaPending: false });
  },

  signUp: async (email, password, fullName) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, profile: null, organization: null });
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (data) => {
    const { profile, user } = get();
    if (!profile || !user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);
    if (error) throw error;
    set({ profile: { ...profile, ...data } });
  },

  updateOrganization: async (data) => {
    const { organization } = get();
    if (!organization) return;
    const { error } = await supabase
      .from('organizations')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', organization.id);
    if (error) throw error;
    set({ organization: { ...organization, ...data } });
  },

  createOrganization: async (name, sector, country) => {
    const { user } = get();
    if (!user) throw new Error('Non authentifié');

    // RPC: creates the org and makes the caller its admin in one transaction
    const { data: org, error } = await supabase
      .rpc('create_organization', { p_name: name, p_sector: sector, p_country: country })
      .single<Organization>();
    if (error) throw error;

    const { profile } = get();
    set({
      organization: org,
      profile: profile ? { ...profile, organization_id: org.id, role: 'admin' } : null,
    });
  },

  joinOrganization: async (orgId) => {
    const { user } = get();
    if (!user) throw new Error('Non authentifié');

    if (!/^[0-9a-f-]{36}$/i.test(orgId)) throw new Error('Invalid organisation ID');
    const { data: org, error } = await supabase
      .rpc('join_organization', { p_org_id: orgId })
      .single<Organization>();
    if (error) throw error;

    const { profile } = get();
    set({ organization: org, profile: profile ? { ...profile, organization_id: orgId, role: 'analyst' } : null });
  },

  changePassword: async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  enableMFA: async () => {
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (error) throw error;
    if (data?.totp) {
      return { qr: data.totp.qr_code, secret: data.totp.secret };
    }
    return null;
  },

  verifyMFA: async (code) => {
    // `totp` only lists verified factors; the one being enrolled is in `all` with status "unverified"
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totpFactor = factors?.all?.find((f) => f.factor_type === 'totp' && f.status === 'unverified') ?? factors?.totp?.[0];
    if (!totpFactor) return false;

    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
    if (!challenge) return false;

    const { error } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code,
    });
    if (error) return false;

    const { profile, user } = get();
    if (profile && user) {
      await supabase.from('profiles').update({ mfa_enabled: true }).eq('user_id', user.id);
      set({ profile: { ...profile, mfa_enabled: true } });
    }
    return true;
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { profile, organization } = await loadProfileAndOrg(user.id);
    set({ profile, organization });
  },
}));
