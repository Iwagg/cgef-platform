import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { PILLARS, PROCESSES, FRAMEWORKS } from '../lib/cgef-framework';
import { getCGSTierColor, getCGSTierLabel, computeFrameworkCoverage } from '../lib/scoring';
import { shortPillarName } from '../lib/metrics';
import { downloadReport } from '../lib/pdf-report';
import { fmtDate } from '../lib/format';
import { ProgressBar } from '../components/ui/ProgressBar';
import { toast } from '../components/ui/Toast';
import { errorMessage } from '../hooks/useOrgTable';
import { useAuthStore } from '../stores/auth';
import type { Assessment, AssessmentResponse, AssessmentScore } from '../lib/types';

// Only frameworks that CGEF processes are actually mapped to can show a coverage figure
const MAPPED_FRAMEWORKS = FRAMEWORKS.filter((f) => PROCESSES.some((p) => p.regulatoryMappings[f.id]?.length));

export function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const organization = useAuthStore((s) => s.organization);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [score, setScore] = useState<AssessmentScore | null>(null);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      supabase.from('assessments').select('*').eq('id', id).single(),
      supabase.from('assessment_scores').select('*').eq('assessment_id', id).order('computed_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('assessment_responses').select('*').eq('assessment_id', id),
    ]).then(([assessmentRes, scoreRes, responsesRes]) => {
      if (cancelled) return;
      setAssessment(assessmentRes.data);
      setScore(scoreRes.data);
      setResponses((responsesRes.data ?? []) as AssessmentResponse[]);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-3">Assessment not found</p>
        <Link to="/assessments" className="text-brand-400 hover:text-brand-300 text-sm transition-colors">Back to assessments</Link>
      </div>
    );
  }

  const header = (
    <div className="flex items-center gap-3">
      <Link to="/assessments" className="btn btn-ghost btn-icon"><ArrowLeft className="w-4 h-4" /></Link>
      <div>
        <h1 className="text-xl font-bold text-slate-100">{assessment.name}</h1>
        <p className="text-xs text-slate-500 mt-0.5">Assessment · {fmtDate(assessment.completed_at ?? assessment.created_at, 'long')}</p>
      </div>
    </div>
  );

  if (!score) {
    return (
      <div className="page-container space-y-6">
        {header}
        <div className="bg-surface-850 border border-white/8 rounded-xl p-8 text-center">
          <p className="text-sm text-slate-300 mb-1">This assessment has not been scored yet.</p>
          <p className="text-xs text-slate-500 mb-4">{responses.length} of {PROCESSES.length} processes evaluated. Complete it to compute the CGS® score.</p>
          <Link to={`/assessments/${id}/evaluate`} className="btn btn-primary btn-sm">Continue Assessment</Link>
        </div>
      </div>
    );
  }

  const pillarScores = score.pillar_scores;
  const radarData = PILLARS.map((pillar) => ({ name: shortPillarName(pillar.name), score: Number(pillarScores[pillar.id] || 0), fullMark: 5 }));
  const coverage = MAPPED_FRAMEWORKS.map((f) => ({ ...f, coverage: computeFrameworkCoverage(responses, f.id) }));

  const exportPdf = () => {
    try {
      downloadReport({
        title: `CGEF Assessment — ${assessment.name}`,
        organization: organization?.name ?? 'Organisation',
        audience: 'Board / CISO',
        filename: `cgef-assessment-${assessment.name.replace(/\W+/g, '-').toLowerCase()}.pdf`,
        sections: [
          {
            title: 'CGS Score',
            metrics: [
              { label: 'CGS Tier', value: `${score.cgs_tier} (${getCGSTierLabel(score.cgs_tier)})` },
              { label: 'Global Score', value: `${Number(score.global_score).toFixed(2)} / 5` },
              { label: 'CMI Index', value: `${score.cmi_index}%` },
              { label: 'Equivalence', value: score.equivalence_applies ? 'Applicable' : 'N/A' },
            ],
            paragraphs: [`Assessment completed on ${fmtDate(assessment.completed_at, 'long')}, ${responses.length} processes evaluated.${assessment.scope ? ` Scope: ${assessment.scope}.` : ''}`],
          },
          {
            title: 'Maturity by Pillar',
            table: { columns: ['Pillar', 'Score', 'Weight'], widths: [70, 15, 15], rows: PILLARS.map((p) => [`${p.id} - ${p.name}`, Number(pillarScores[p.id] || 0).toFixed(2), `${Math.round(p.weight * 100)}%`]) },
          },
          {
            title: 'Framework Coverage (processes at level 3 or above)',
            table: { columns: ['Framework', 'Coverage'], widths: [70, 30], rows: coverage.map((f) => [f.name, `${f.coverage}%`]) },
          },
          {
            title: 'Weakest Processes',
            table: {
              columns: ['Process', 'Name', 'Level'], widths: [18, 66, 16],
              rows: [...responses].sort((a, b) => a.maturity_level - b.maturity_level).slice(0, 15)
                .map((r) => [r.process_id, PROCESSES.find((p) => p.id === r.process_id)?.name ?? '', String(r.maturity_level)]),
            },
          },
        ],
      });
    } catch (err) {
      toast({ type: 'error', title: 'Export failed', message: errorMessage(err) });
    }
  };

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        {header}
        <button className="btn btn-secondary btn-sm" onClick={exportPdf}><Download className="w-3.5 h-3.5" /> Export PDF</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-850 border border-white/8 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">CGS Score</p>
          <p className="text-4xl font-bold" style={{ color: getCGSTierColor(score.cgs_tier) }}>{score.cgs_tier}</p>
          <p className="text-xs text-slate-500 mt-1">{getCGSTierLabel(score.cgs_tier)}</p>
        </div>
        <div className="bg-surface-850 border border-white/8 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Global Score</p>
          <p className="text-4xl font-bold text-slate-100">{Number(score.global_score).toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">out of 5.00</p>
        </div>
        <div className="bg-surface-850 border border-white/8 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">CMI Index</p>
          <p className="text-4xl font-bold text-brand-400">{score.cmi_index}%</p>
          <p className="text-xs text-slate-500 mt-1">Cyber Maturity</p>
        </div>
        <div className="bg-surface-850 border border-white/8 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Equivalence</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            {score.equivalence_applies
              ? <><CheckCircle className="w-7 h-7 text-emerald-400" /><span className="text-sm font-semibold text-emerald-400">Applicable</span></>
              : <><AlertTriangle className="w-7 h-7 text-amber-400" /><span className="text-sm font-semibold text-amber-400">N/A</span></>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-850 border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8"><h2 className="text-sm font-semibold text-slate-200">Maturity Radar</h2></div>
          <div className="p-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 9, fill: '#64748b' }} />
                <Radar name="Maturity" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-850 border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8"><h2 className="text-sm font-semibold text-slate-200">Scores by Pillar</h2></div>
          <div className="p-5 space-y-4">
            {PILLARS.map((pillar) => {
              const pillarScore = Number(pillarScores[pillar.id] || 0);
              return (
                <div key={pillar.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-300">{pillar.id} – {pillar.name}</span>
                    <span className="text-xs text-slate-400">{pillarScore.toFixed(1)}/5</span>
                  </div>
                  <ProgressBar value={(pillarScore / 5) * 100} size="xs" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-surface-850 border border-white/8 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-slate-200">Framework Coverage</h2>
          <p className="text-xs text-slate-500 mt-0.5">Share of mapped CGEF processes evaluated at maturity level 3 or above</p>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          {coverage.map((f) => (
            <div key={f.id} className="text-center p-3 bg-white/4 rounded-xl">
              <p className="text-xl font-bold text-brand-400 mb-1">{f.coverage}%</p>
              <p className="text-xs font-medium text-slate-300">{f.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
