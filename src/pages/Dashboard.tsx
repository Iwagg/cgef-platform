import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, CircleCheck as CheckCircle, Clock, ArrowRight, FileCheck } from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { PILLARS, FRAMEWORKS } from '../lib/cgef-framework';
import { getCGSTierColor, getCGSTierLabel, computeFrameworkCoverage } from '../lib/scoring';
import type { Assessment, AssessmentScore, ActionPlan } from '../lib/types';

interface DashboardData {
  latestScore: AssessmentScore | null;
  recentAssessments: Assessment[];
  actionPlans: ActionPlan[];
}

const MOCK_SCORE: AssessmentScore = {
  id: 'mock',
  assessment_id: 'mock',
  global_score: 3.45,
  cgs_tier: 'A',
  cmi_index: 61,
  pillar_scores: { P1: 3.8, P2: 3.4, P3: 3.2, P4: 3.6, P5: 3.0, P6: 3.5, P7: 3.4, P8: 3.7 },
  equivalence_applies: true,
  computed_at: new Date().toISOString(),
};

export function Dashboard() {
  const { organization } = useAuthStore();
  const [data, setData] = useState<DashboardData>({
    latestScore: MOCK_SCORE,
    recentAssessments: [],
    actionPlans: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!organization?.id) {
        setLoading(false);
        return;
      }

      try {
        const [assessmentsRes, scoresRes, actionsRes] = await Promise.all([
          supabase
            .from('assessments')
            .select('*')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('assessment_scores')
            .select('*')
            .order('computed_at', { ascending: false })
            .limit(1),
          supabase
            .from('action_plans')
            .select('*')
            .eq('organization_id', organization.id)
            .order('created_at', { ascending: false }),
        ]);

        setData({
          latestScore: scoresRes.data?.[0] || MOCK_SCORE,
          recentAssessments: assessmentsRes.data || [],
          actionPlans: actionsRes.data || [],
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [organization?.id]);

  const score = data.latestScore || MOCK_SCORE;
  const radarData = PILLARS.map((pillar) => ({
    pillar: pillar.id,
    name: pillar.name.split(' ')[0],
    score: score.pillar_scores[pillar.id] || 0,
    fullMark: 5,
  }));

  const frameworkData = FRAMEWORKS.map((framework) => ({
    name: framework.name.split(' ')[0],
    coverage: computeFrameworkCoverage([], framework.id),
    color: framework.color,
  }));

  const actionStats = {
    open: data.actionPlans.filter((a) => a.status === 'open').length,
    inProgress: data.actionPlans.filter((a) => a.status === 'in_progress').length,
    overdue: data.actionPlans.filter(
      (a) => a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed'
    ).length,
    completed: data.actionPlans.filter((a) => a.status === 'completed').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-slate-900">Tableau de bord</h1>
          <p className="text-brand-slate-500 mt-1">
            Vue d'ensemble de votre posture cybersecurite
          </p>
        </div>
        <Link to="/assessments" className="btn-primary">
          Nouvelle evaluation
          <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ScoreCard
          title="Score CGS"
          value={score.cgs_tier}
          subtitle={getCGSTierLabel(score.cgs_tier)}
          color={getCGSTierColor(score.cgs_tier)}
          icon={<Shield className="w-6 h-6" />}
        />
        <ScoreCard
          title="Indice CMI"
          value={`${score.cmi_index}%`}
          subtitle="Cyber Maturity Index"
          color="#1565C0"
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <ScoreCard
          title="Actions ouvertes"
          value={actionStats.open + actionStats.inProgress}
          subtitle={`${actionStats.overdue} en retard`}
          color={actionStats.overdue > 0 ? '#F57C00' : '#2E7D32'}
          icon={<Clock className="w-6 h-6" />}
        />
        <ScoreCard
          title="Equivalence"
          value={score.equivalence_applies ? 'Oui' : 'Non'}
          subtitle="Principe d'equivalence"
          color={score.equivalence_applies ? '#2E7D32' : '#94A3B8'}
          icon={<FileCheck className="w-6 h-6" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-brand-slate-900">Maturite par pilier</h2>
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
            <h2 className="font-semibold text-brand-slate-900">Couverture referentiels</h2>
          </div>
          <div className="card-body">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={frameworkData} layout="vertical">
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="coverage" fill="#1565C0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-brand-slate-900">Scores par pilier</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {PILLARS.map((pillar) => {
                const pillarScore = score.pillar_scores[pillar.id] || 0;
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

        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-brand-slate-900">Actions prioritaires</h2>
            <Link to="/action-plans" className="text-sm text-brand-green-600 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="card-body">
            {actionStats.open + actionStats.inProgress === 0 ? (
              <div className="text-center py-8 text-brand-slate-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-brand-green-500" />
                <p>Aucune action en cours</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.actionPlans
                  .filter((a) => a.status !== 'completed')
                  .slice(0, 5)
                  .map((action) => (
                    <div
                      key={action.id}
                      className="flex items-start gap-3 p-3 bg-brand-slate-50 rounded-lg"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          action.priority === 'critical'
                            ? 'bg-red-500'
                            : action.priority === 'high'
                            ? 'bg-orange-500'
                            : 'bg-yellow-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-slate-900 truncate">
                          {action.title}
                        </p>
                        <p className="text-xs text-brand-slate-500">
                          {action.due_date
                            ? new Date(action.due_date).toLocaleDateString('fr-FR')
                            : 'Sans echeance'}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {data.recentAssessments.length > 0 && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-brand-slate-900">Evaluations recentes</h2>
            <Link to="/assessments" className="text-sm text-brand-green-600 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="card-body">
            <div className="divide-y divide-brand-slate-100">
              {data.recentAssessments.map((assessment) => (
                <Link
                  key={assessment.id}
                  to={`/assessments/${assessment.id}`}
                  className="flex items-center justify-between py-3 hover:bg-brand-slate-50 -mx-6 px-6 transition-colors"
                >
                  <div>
                    <p className="font-medium text-brand-slate-900">{assessment.name}</p>
                    <p className="text-sm text-brand-slate-500">
                      {new Date(assessment.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <StatusBadge status={assessment.status} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({
  title,
  value,
  subtitle,
  color,
  icon,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-brand-slate-500">{title}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>
              {value}
            </p>
            <p className="text-sm text-brand-slate-500 mt-1">{subtitle}</p>
          </div>
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${color}15`, color }}
          >
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    draft: { label: 'Brouillon', className: 'badge-neutral' },
    in_progress: { label: 'En cours', className: 'badge-warning' },
    completed: { label: 'Termine', className: 'badge-success' },
  };
  const { label, className } = config[status as keyof typeof config] || config.draft;
  return <span className={className}>{label}</span>;
}

function getScoreColor(score: number): string {
  if (score >= 4) return '#1565C0';
  if (score >= 3) return '#43A047';
  if (score >= 2) return '#FDD835';
  return '#D32F2F';
}
