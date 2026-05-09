import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { PILLARS, FRAMEWORKS } from '../lib/cgef-framework';
import { getCGSTierColor, getCGSTierLabel, computeFrameworkCoverage } from '../lib/scoring';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { Assessment, AssessmentScore } from '../lib/types';

export function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [score, setScore] = useState<AssessmentScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const [assessmentRes, scoreRes] = await Promise.all([
          supabase.from('assessments').select('*').eq('id', id).single(),
          supabase.from('assessment_scores').select('*').eq('assessment_id', id).order('computed_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        setAssessment(assessmentRes.data);
        setScore(scoreRes.data);
      } catch (error) { console.error('Error fetching assessment:', error); }
      finally { setLoading(false); }
    }
    fetchData();
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

  const mockScore: AssessmentScore = score || {
    id: 'mock', assessment_id: id!, global_score: 3.45, cgs_tier: 'A', cmi_index: 61,
    pillar_scores: { P1: 3.8, P2: 3.4, P3: 3.2, P4: 3.6, P5: 3.0, P6: 3.5, P7: 3.4, P8: 3.7 },
    equivalence_applies: true, computed_at: new Date().toISOString(),
  };

  const radarData = PILLARS.map((pillar) => ({
    pillar: pillar.id, name: pillar.name.split(' ')[0],
    score: mockScore.pillar_scores[pillar.id] || 0, fullMark: 5,
  }));

  return (
    <div className="page-container space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/assessments" className="btn btn-ghost btn-icon"><ArrowLeft className="w-4 h-4" /></Link>
          <div>
            <h1 className="text-xl font-bold text-slate-100">{assessment.name}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Assessment · {new Date(assessment.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <button className="btn btn-secondary btn-sm"><Download className="w-3.5 h-3.5" /> Export PDF</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-850 border border-white/8 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">CGS Score</p>
          <p className="text-4xl font-bold" style={{ color: getCGSTierColor(mockScore.cgs_tier) }}>{mockScore.cgs_tier}</p>
          <p className="text-xs text-slate-500 mt-1">{getCGSTierLabel(mockScore.cgs_tier)}</p>
        </div>
        <div className="bg-surface-850 border border-white/8 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Global Score</p>
          <p className="text-4xl font-bold text-slate-100">{mockScore.global_score.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-1">out of 5.00</p>
        </div>
        <div className="bg-surface-850 border border-white/8 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">CMI Index</p>
          <p className="text-4xl font-bold text-brand-400">{mockScore.cmi_index}%</p>
          <p className="text-xs text-slate-500 mt-1">Cyber Maturity</p>
        </div>
        <div className="bg-surface-850 border border-white/8 rounded-xl p-4 text-center">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Equivalence</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            {mockScore.equivalence_applies
              ? <><CheckCircle className="w-7 h-7 text-emerald-400" /><span className="text-sm font-semibold text-emerald-400">Applicable</span></>
              : <><AlertTriangle className="w-7 h-7 text-amber-400" /><span className="text-sm font-semibold text-amber-400">N/A</span></>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-850 border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8">
            <h2 className="text-sm font-semibold text-slate-200">Maturity Radar</h2>
          </div>
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
          <div className="px-5 py-4 border-b border-white/8">
            <h2 className="text-sm font-semibold text-slate-200">Scores by Pillar</h2>
          </div>
          <div className="p-5 space-y-4">
            {PILLARS.map((pillar) => {
              const pillarScore = mockScore.pillar_scores[pillar.id] || 0;
              return (
                <div key={pillar.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-300">{pillar.id} – {pillar.name.split(' ')[0]}</span>
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
        </div>
        <div className="p-5 grid grid-cols-3 md:grid-cols-6 gap-3">
          {FRAMEWORKS.map((framework) => {
            const coverage = computeFrameworkCoverage([], framework.id);
            return (
              <div key={framework.id} className="text-center p-3 bg-white/4 rounded-xl">
                <p className="text-xl font-bold text-brand-400 mb-1">{coverage}%</p>
                <p className="text-xs font-medium text-slate-300">{framework.name.split(' ')[0]}</p>
                <p className="text-xs text-slate-500">{framework.controlsCount} controls</p>
              </div>
            );
          })}
        </div>
      </div>

      {assessment.status !== 'completed' && (
        <div className="flex justify-center">
          <Link to={`/assessments/${id}/evaluate`} className="btn btn-primary">Continue Assessment</Link>
        </div>
      )}
    </div>
  );
}
