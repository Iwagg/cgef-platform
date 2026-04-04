import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile, Organization, UserRole } from '../lib/types';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: { full_name?: string; role?: UserRole }) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  organization: null,
  loading: false,
  initialized: false,

  initialize: async () => {
    try {
      set({ loading: true });

      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        let organization = null;
        if (profile?.organization_id) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', profile.organization_id)
            .maybeSingle();
          organization = org;
        }

        set({ user: session.user, profile, organization });
      }

      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, organization: null });
        } else if (event === 'SIGNED_IN' && session?.user) {
          set({ user: session.user });
          (async () => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            let organization = null;
            if (profile?.organization_id) {
              const { data: org } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', profile.organization_id)
                .maybeSingle();
              organization = org;
            }

            set({ profile, organization });
          })();
        }
      });
    } finally {
      set({ loading: false, initialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      if (error) throw error;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, profile: null, organization: null });
    } finally {
      set({ loading: false });
    }
  },

  updateProfile: async (data: { full_name?: string; role?: UserRole }) => {
    const { profile } = get();
    if (!profile) return;

    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', profile.id);

    if (error) throw error;

    set({ profile: { ...profile, ...data } });
  },
}));
