import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When the .env is missing, App renders a setup screen instead of crashing on import
export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project')
);

export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);

// Helper: log audit event (organization_id is filled in by a database trigger)
export async function logAudit(
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    metadata: metadata || {},
  }).then(() => {});
}

// Evidence files live in the private "evidence" bucket under <organization_id>/
export const EVIDENCE_BUCKET = 'evidence';
