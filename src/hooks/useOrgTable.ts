import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { toast } from '../components/ui/Toast';

interface Options {
  orderBy?: string;
  ascending?: boolean;
}

// Columns managed by the database (defaults, triggers, generated columns) — never sent on insert/update
const READ_ONLY = ['id', 'organization_id', 'ref', 'created_by', 'created_at', 'updated_at', 'inherent_score', 'severity'];

function stripReadOnly(data: Record<string, unknown>, keepRef: boolean) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (READ_ONLY.includes(k) && !(keepRef && k === 'ref')) continue;
    out[k] = v === '' ? null : v;
  }
  return out;
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return String(err);
}

/**
 * CRUD access to an organisation-scoped table. RLS already restricts rows to the
 * caller's organisation; the explicit filter keeps queries index-friendly.
 * `keepRef` is for tables where `ref` is user-supplied (compliance_requirements).
 */
export function useOrgTable<T extends { id: string }>(table: string, { orderBy = 'created_at', ascending = false }: Options = {}, keepRef = false) {
  const organizationId = useAuthStore((s) => s.organization?.id);
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('organization_id', organizationId)
      .order(orderBy, { ascending });
    if (error) {
      setError(error.message);
      toast({ type: 'error', title: 'Could not load data', message: error.message });
    } else {
      setError(null);
      setRows((data ?? []) as T[]);
    }
    setLoading(false);
  }, [table, organizationId, orderBy, ascending]);

  useEffect(() => { reload(); }, [reload]);

  const create = useCallback(async (values: Partial<T>): Promise<T> => {
    const { data, error } = await supabase
      .from(table)
      .insert({ ...stripReadOnly(values as Record<string, unknown>, keepRef), organization_id: organizationId })
      .select()
      .single();
    if (error) throw error;
    setRows((prev) => (ascending ? [...prev, data as T] : [data as T, ...prev]));
    return data as T;
  }, [table, organizationId, ascending, keepRef]);

  const update = useCallback(async (id: string, values: Partial<T>): Promise<T> => {
    const { data, error } = await supabase
      .from(table)
      .update(stripReadOnly(values as Record<string, unknown>, keepRef))
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setRows((prev) => prev.map((r) => (r.id === id ? (data as T) : r)));
    return data as T;
  }, [table, keepRef]);

  const remove = useCallback(async (id: string) => {
    // RLS silently filters deletes the user is not allowed to make, so check the row count
    const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data?.length) throw new Error('Delete refused: manager role or higher required.');
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, [table]);

  return { rows, loading, error, reload, create, update, remove, setRows };
}
