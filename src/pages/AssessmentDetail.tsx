import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Share2, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { PILLARS, FRAMEWORKS } from '../lib/cgef-framework';
import { getCGSTierColor, getCGSTierLabel, computeFrameworkCoverage } from '../lib/scoring';
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
          supabase
            .from('assessment_scores')
            .select('*')
            .eq('assessment_id', id)
            .order('computed_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        setAssessment(assessmentRes.data);
        setScore(scoreRes.data);
      } catch (error) {
        console.error('Error fetching assessment:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="text-center py-12">
        <p className="text-brand-slate-500">Evaluation non trouvee</p>
        <Link to="/assessments" className="text-brand-green-600 hover:underline mt-2 inline-block">
          Retour aux evaluations
        </Link>
      </div>
    );
  }

  const mockScore: AssessmentScore = score || {
    id: 'mock',
    assessment_id: id!,
    global_score: 3.45,
    cgs_tier: 'A',
    cmi_index: 61,
    pillar_scores: { P1: 3.8, P2: 3.4, P3: 3.2, P4: 3.6, P5: 3.0, P6: 3.5, P7: 3.4, P8: 3.7 },
    equivalence_applies: true,
    computed_at: new Date().toISOString(),
  };

  if (!mockScore) return null;
  const radarData = PILLARS.map((pillar) => ({
    pillar: pillar.id,
    name: pillar.name.split(' ')[0],
    score: mockScore.pillar_scores[pillar.id] || 0,
    fullMark: 5,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/assessments"
            className="p-2 hover:bg-brand-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-brand-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-slate-900">
              {assessment.name}
            </h1>
            <p className="text-brand-slate-500 mt-1">
              Evaluation du {new Date(assessment.created_at).toLocaleDateString('fr-FR')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-outline">
            <Share2 className="w-4 h-4 mr-2" />
            Partager
          </button>
          <button className="btn-primary">
            <Download className="w-4 h-4 mr-2" />
            Exporter PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-body text-center">
            <p className="text-sm text-brand-slate-500 mb-2">Score CGS</p>
            <p
              className="text-4xl font-bold"
              style={{ color: getCGSTierColor(mockScore.cgs_tier) }}
            >
              {mockScore.cgs_tier}
            </p>
            <p className="text-sm text-brand-slate-500 mt-1">
              {getCGSTierLabel(mockScore.cgs_tier)}
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <p className="text-sm text-brand-slate-500 mb-2">Score global</p>
            <p className="text-4xl font-bold text-brand-slate-900">
              {mockScore.global_score.toFixed(2)}
            </p>
            <p className="text-sm text-brand-slate-500 mt-1">sur 5.00</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <p className="text-sm text-brand-slate-500 mb-2">Indice CMI</p>
            <p className="text-4xl font-bold text-brand-blue-600">
              {mockScore.cmi_index}%
            </p>
            <p className="text-sm text-brand-slate-500 mt-1">Cyber Maturity</p>
          </div>
        </div>

        <div className="card">
          <div className="card-body text-center">
            <p className="text-sm text-brand-slate-500 mb-2">Equivalence</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              {mockScore.equivalence_applies ? (
                <>
                  <CheckCircle className="w-8 h-8 text-brand-green-500" />
                  <span className="text-lg font-semibold text-brand-green-600">
                    Applicable
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-8 h-8 text-orange-500" />
                  <span className="text-lg font-semibold text-orange-600">
                    Non applicable
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-brand-slate-900">
              Radar de maturite
            </h2>
          </div>
          <div className="card-body">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Maturite"
                    dataKey="score"
                    stroke="#2E7D32"
                    fill="#2E7D32"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-brand-slate-900">
              Scores par pilier
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {PILLARS.map((pillar) => {
                const pillarScore = mockScore.pillar_scores[pillar.id] || 0;
                const percentage = (pillarScore / 5) * 100;
                return (
                  <div key={pillar.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-brand-slate-700">
                        {pillar.id} - {pillar.name}
                      </span>
                      <span className="text-sm text-brand-slate-500">
                        {pillarScore.toFixed(1)}/5
                      </span>
                    </div>
                    <div className="h-2 bg-brand-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getScoreColor(pillarScore),
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-brand-slate-900">
            Couverture des referentiels
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {FRAMEWORKS.map((framework) => {
              const coverage = computeFrameworkCoverage([], framework.id);
              return (
                <div
                  key={framework.id}
                  className="text-center p-4 bg-brand-slate-50 rounded-lg"
                >
                  <div
                    className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${framework.color}20` }}
                  >
                    <span
                      className="text-xl font-bold"
                      style={{ color: framework.color }}
                    >
                      {coverage}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-brand-slate-900">
                    {framework.name.split(' ')[0]}
                  </p>
                  <p className="text-xs text-brand-slate-500">
                    {framework.controlsCount} controles
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {assessment.status !== 'completed' && (
        <div className="flex justify-center">
          <Link to={`/assessments/${id}/evaluate`} className="btn-primary">
            Continuer l'evaluation
          </Link>
        </div>
      )}
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 4) return '#1565C0';
  if (score >= 3) return '#43A047';
  if (score >= 2) return '#FDD835';
  return '#D32F2F';
}
