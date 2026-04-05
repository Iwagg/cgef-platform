import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[CGEF] Variables d\'environnement Supabase manquantes.\n' +
    'Créez un fichier .env avec VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.\n' +
    'Consultez .env.example pour référence.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper: log audit event
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
