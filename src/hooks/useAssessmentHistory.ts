import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import type { Assessment, AssessmentResponse, AssessmentScore } from '../lib/types';

export interface ScoredAssessment {
  assessment: Assessment;
  score: AssessmentScore;
}

/**
 * Completed CGEF assessments with their latest score (oldest first), plus the
 * responses of the most recent one — the source of truth for maturity figures.
 */
export function useAssessmentHistory() {
  const organizationId = useAuthStore((s) => s.organization?.id);
  const [history, setHistory] = useState<ScoredAssessment[]>([]);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: assessments } = await supabase
        .from('assessments')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: true });
      const ids = (assessments ?? []).map((a) => a.id);
      if (!ids.length) {
        if (!cancelled) { setHistory([]); setResponses([]); setLoading(false); }
        return;
      }
      const { data: scores } = await supabase
        .from('assessment_scores')
        .select('*')
        .in('assessment_id', ids)
        .order('computed_at', { ascending: false });
      const latestByAssessment = new Map<string, AssessmentScore>();
      (scores ?? []).forEach((s) => { if (!latestByAssessment.has(s.assessment_id)) latestByAssessment.set(s.assessment_id, s); });
      const scored = (assessments as Assessment[])
        .filter((a) => latestByAssessment.has(a.id))
        .map((a) => ({ assessment: a, score: latestByAssessment.get(a.id)! }));

      let latestResponses: AssessmentResponse[] = [];
      const last = scored[scored.length - 1];
      if (last) {
        const { data } = await supabase.from('assessment_responses').select('*').eq('assessment_id', last.assessment.id);
        latestResponses = (data ?? []) as AssessmentResponse[];
      }
      if (!cancelled) { setHistory(scored); setResponses(latestResponses); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [organizationId]);

  const latest = history[history.length - 1] ?? null;
  const previous = history[history.length - 2] ?? null;
  return { history, latest, previous, responses, loading };
}
