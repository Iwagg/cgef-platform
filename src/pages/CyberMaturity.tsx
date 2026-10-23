import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Target, TrendingUp, ChevronRight } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { EmptyState, LoadingState, SubmitButton } from '../components/ui/Form';
import { useAction } from '../hooks/useAction';
import { useAssessmentHistory } from '../hooks/useAssessmentHistory';
import { useAuthStore } from '../stores/auth';
import { PILLARS, PROCESSES } from '../lib/cgef-framework';
import { hasRole } from '../lib/rbac';
import { fmtDate } from '../lib/format';
import { shortPillarName } from '../lib/metrics';
import type { PillarId } from '../lib/types';

const maturityLevels = [
  { level: 1, label: 'Initial', color: '#ef4444' },
  { level: 2, label: 'Repeatable', color: '#f97316' },
  { level: 3, label: 'Defined', color: '#eab308' },
  { level: 4, label: 'Managed', color: '#3b82f6' },
  { level: 5, label: 'Optimized', color: '#22c55e' },
];

const getColor = (score: number) => {
  if (score >= 4.5) return '#22c55e';
  if (score >= 3.5) return '#3b82f6';
  if (score >= 2.5) return '#eab308';
  if (score >= 1.5) return '#f97316';
  return '#ef4444';
};

export function CyberMaturity() {
  const navigate = useNavigate();
  const { profile, organization, updateOrganization } = useAuthStore();
  const { history, latest, previous, responses, loading } = useAssessmentHistory();
  const [selectedPillar, setSelectedPillar] = useState<PillarId | null>(null);
  const [targetDraft, setTargetDraft] = useState<string | null>(null);
  const { pending, run } = useAction();

  const target = Number(organization?.target_maturity ?? 4);
  const canEditTarget = hasRole(profile?.role, 'ciso');

  if (loading) return <div className="page-container"><LoadingState /></div>;

  const header = (
    <PageHeader
      title="Cyber Maturity Assessment"
      subtitle="Maturity across the 8 CGEF pillars, computed from your latest completed assessment"
      breadcrumb={[{ label: 'Security' }, { label: 'Cyber Maturity' }]}
      actions={<button className="btn btn-primary btn-sm" onClick={() => navigate('/assessments')}><Shield className="w-3.5 h-3.5" />{latest ? 'New Assessment' : 'Start Assessment'}</button>}
    />
  );

  if (!latest) {
    return (
      <div className="page-container">
        {header}
        <EmptyState
          title="No completed assessment yet"
          message="Run a CGEF assessment (8 pillars, 1–5 maturity scale). Once finalised, scores, radar and gap analysis appear here and on the dashboard."
          action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/assessments')}>Go to Assessments</button>}
        />
      </div>
    );
  }

  const pillarScores = latest.score.pillar_scores as Record<PillarId, number>;
  const globalScore = Number(latest.score.global_score);
  const trend = previous ? Math.round((globalScore - Number(previous.score.global_score)) * 10) / 10 : undefined;
  const radarData = PILLARS.map((p) => ({ domain: shortPillarName(p.name), score: Number(pillarScores[p.id] ?? 0), target }));
  const atTarget = PILLARS.filter((p) => (pillarScores[p.id] ?? 0) >= target - 0.5).length;

  const detail = selectedPillar ? (() => {
    const processes = PROCESSES.filter((p) => p.pillarId === selectedPillar);
    const levelOf = (id: string) => responses.find((r) => r.process_id === id)?.maturity_level ?? 0;
    const strengths = processes.filter((p) => levelOf(p.id) >= 4);
    const gaps = processes.filter((p) => levelOf(p.id) <= 2);
    const recommendations = gaps.map((p) => {
      const next = Math.min(5, Math.max(1, levelOf(p.id) + 1));
      return { process: p, level: next, criteria: p.maturityCriteria[next]?.[0] ?? p.objective };
    });
    return { processes, strengths, gaps, recommendations, levelOf };
  })() : null;

  const saveTarget = () => run(async () => {
    const value = Number(targetDraft);
    if (!(value >= 1 && value <= 5)) throw new Error('Target must be between 1 and 5');
    await updateOrganization({ target_maturity: Math.round(value * 10) / 10 });
    setTargetDraft(null);
  }, 'Target updated');

  return (
    <div className="page-container">
      {header}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Global Maturity Score" value={globalScore.toFixed(1)} unit="/ 5.0" trend={trend} trendLabel={previous ? 'vs previous' : undefined} sublabel={`${latest.score.cgs_tier} · ${latest.assessment.name}`} icon={<Shield className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Target Score" value={target.toFixed(1)} unit="/ 5.0" sublabel={canEditTarget ? 'click to edit' : 'set by CISO'} icon={<Target className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" onClick={canEditTarget ? () => setTargetDraft(String(target)) : undefined} />
        <MetricCard label="Pillars at Target" value={atTarget} sublabel={`of ${PILLARS.length} pillars (±0.5)`} icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" />
        <MetricCard label="CMI Index" value={latest.score.cmi_index} unit="/ 100" sublabel={`assessed ${fmtDate(latest.assessment.completed_at)}`} icon={<TrendingUp className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" />
      </div>

      {targetDraft !== null && (
        <div className="flex items-center gap-3 mb-5 p-3 bg-surface-850 border border-white/8 rounded-xl">
          <span className="text-sm text-slate-300">Target maturity</span>
          <input type="number" step={0.1} min={1} max={5} className="input h-8 w-24" value={targetDraft} onChange={(e) => setTargetDraft(e.target.value)} />
          <SubmitButton pending={pending} onClick={saveTarget}>Save</SubmitButton>
          <button className="btn btn-outline btn-sm" onClick={() => setTargetDraft(null)}>Cancel</button>
        </div>
      )}

      <div className="flex gap-3 flex-wrap mb-6">
        {maturityLevels.map((m) => (
          <div key={m.level} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: m.color }} />
            <span className="text-slate-400">{m.level} — {m.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Maturity Radar</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar name="Target" dataKey="target" stroke="#1d4ed8" fill="#3b82f6" fillOpacity={0.06} strokeWidth={1} strokeDasharray="4 4" />
                <Radar name="Current" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {history.length > 1 && <p className="text-xs text-slate-500 text-center">{history.length} completed assessments on record</p>}
        </div>

        <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Pillar Breakdown</h3>
          <div className="space-y-2">
            {PILLARS.map((p) => {
              const score = Number(pillarScores[p.id] ?? 0);
              return (
                <div
                  key={p.id}
                  className={`cursor-pointer rounded-lg p-3 transition-colors ${selectedPillar === p.id ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-white/4'}`}
                  onClick={() => setSelectedPillar(selectedPillar === p.id ? null : p.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-300 font-medium">{p.id} · {p.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">weight {Math.round(p.weight * 100)}%</span>
                      <span className="text-sm font-bold" style={{ color: getColor(score) }}>{score.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div key={level} className="flex-1 h-2 rounded-sm" style={{ backgroundColor: level <= Math.round(score) ? getColor(score) : 'rgba(255,255,255,0.08)' }} />
                    ))}
                  </div>
                  {selectedPillar === p.id && <div className="mt-2 flex items-center gap-1 text-xs text-brand-400"><ChevronRight className="w-3 h-3" /> View details below</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedPillar && detail && (
        <div className="bg-surface-850 rounded-xl border border-brand-500/20 p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">{PILLARS.find((p) => p.id === selectedPillar)?.name} — Detailed Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">Strengths (level ≥ 4)</h4>
              <ul className="space-y-1.5">
                {detail.strengths.map((p) => <li key={p.id} className="flex items-start gap-2 text-xs text-slate-300"><span className="text-emerald-400 mt-0.5">✓</span>{p.name} <span className="text-slate-500">({detail.levelOf(p.id)})</span></li>)}
                {detail.strengths.length === 0 && <li className="text-xs text-slate-500">None yet</li>}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Gaps (level ≤ 2)</h4>
              <ul className="space-y-1.5">
                {detail.gaps.map((p) => <li key={p.id} className="flex items-start gap-2 text-xs text-slate-300"><span className="text-amber-400 mt-0.5">△</span>{p.name} <span className="text-slate-500">({detail.levelOf(p.id) || 'not assessed'})</span></li>)}
                {detail.gaps.length === 0 && <li className="text-xs text-slate-500">No major gaps</li>}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-2">Next Steps</h4>
              <ul className="space-y-1.5">
                {detail.recommendations.map((r) => <li key={r.process.id} className="flex items-start gap-2 text-xs text-slate-300"><span className="text-brand-400 mt-0.5">→</span><span><span className="text-slate-400">{r.process.name} → L{r.level}:</span> {r.criteria}</span></li>)}
                {detail.recommendations.length === 0 && <li className="text-xs text-slate-500">Keep improving towards level 5</li>}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
