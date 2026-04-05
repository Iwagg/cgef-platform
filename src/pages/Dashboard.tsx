import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, CheckCircle, Clock, ArrowRight, FileCheck, AlertTriangle, Building2 } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { PILLARS, FRAMEWORKS } from '../lib/cgef-framework';
import { getCGSTierColor, getCGSTierLabel, computeFrameworkCoverage } from '../lib/scoring';
import type { Assessment, AssessmentScore, ActionPlan, AssessmentResponse } from '../lib/types';

interface DashboardData {
  latestScore: AssessmentScore | null;
  latestResponses: AssessmentResponse[];
  recentAssessments: Assessment[];
  actionPlans: ActionPlan[];
  openActions: number;
  overdueActions: number;
}

export function Dashboard() {
  const { organization } = useAuthStore();
  const [data, setData] = useState<DashboardData>({
    latestScore: null,
    latestResponses: [],
    recentAssessments: [],
    actionPlans: [],
    openActions: 0,
    overdueActions: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!organization?.id) { setLoading(false); return; }
    try {
      const [assessmentsRes, actionsRes] = await Promise.all([
        supabase.from('assessments').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('action_plans').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false }),
      ]);

      const assessments = assessmentsRes.data || [];
      const actions = actionsRes.data || [];

      // Find the latest completed assessment
      const latestCompleted = assessments.find(a => a.status === 'completed');
      let latestScore: AssessmentScore | null = null;
      let latestResponses: AssessmentResponse[] = [];

      if (latestCompleted) {
        const [scoreRes, responsesRes] = await Promise.all([
          supabase.from('assessment_scores').select('*').eq('assessment_id', latestCompleted.id).order('computed_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('assessment_responses').select('*').eq('assessment_id', latestCompleted.id),
        ]);
        latestScore = scoreRes.data;
        latestResponses = responsesRes.data || [];
      }

      const today = new Date().toISOString().split('T')[0];
      const overdueActions = actions.filter(a => a.status !== 'completed' && a.status !== 'cancelled' && a.due_date && a.due_date < today).length;
      const openActions = actions.filter(a => a.status === 'open' || a.status === 'in_progress').length;

      setData({ latestScore, latestResponses, recentAssessments: assessments, actionPlans: actions.slice(0, 5), openActions, overdueActions });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Empty state — no org (shouldn't happen if Onboarding works, but safety net)
  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Building2 className="w-12 h-12 text-brand-slate-300" />
        <p className="text-brand-slate-500">Aucune organisation configurée.</p>
        <Link to="/onboarding" className="btn-primary">Configurer mon espace</Link>
      </div>
    );
  }

  const { latestScore, latestResponses, recentAssessments, actionPlans, openActions, overdueActions } = data;

  const radarData = PILLARS.map(p => ({
    pillar: p.id,
    score: latestScore?.pillar_scores?.[p.id] ?? 0,
    fullMark: 5,
  }));

  const barData = FRAMEWORKS.slice(0, 6).map(fw => ({
    name: fw.name.split(' ')[0],
    coverage: latestResponses.length > 0 ? computeFrameworkCoverage(latestResponses, fw.id) : 0,
    fill: fw.color,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-brand-slate-900">Tableau de bord</h1>
        <p className="text-brand-slate-500 mt-1">{organization.name} · Vue d&apos;ensemble de votre posture de sécurité</p>
      </div>

      {/* No assessment yet */}
      {!latestScore && (
        <div className="card bg-gradient-to-r from-brand-green-50 to-brand-blue-50 border-brand-green-200">
          <div className="card-body flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold text-brand-slate-900">Démarrez votre première évaluation CGEF™</h2>
              <p className="text-brand-slate-600 mt-1 text-sm">Évaluez votre maturité sur 120 processus et 8 piliers pour obtenir votre score CGS®.</p>
            </div>
            <Link to="/assessments" className="btn-primary flex items-center gap-2">
              Lancer une évaluation <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* KPI row */}
      {latestScore && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Score CGS®',
              value: latestScore.cgs_tier,
              sub: getCGSTierLabel(latestScore.cgs_tier),
              icon: Shield,
              color: getCGSTierColor(latestScore.cgs_tier),
              bg: 'bg-brand-slate-50',
            },
            {
              label: 'Score global',
              value: `${latestScore.global_score.toFixed(2)}/5`,
              sub: `CMI™ : ${latestScore.cmi_index}/100`,
              icon: TrendingUp,
              color: '#2E7D32',
              bg: 'bg-brand-green-50',
            },
            {
              label: 'Actions ouvertes',
              value: openActions.toString(),
              sub: overdueActions > 0 ? `${overdueActions} en retard` : 'Tout à jour',
              icon: overdueActions > 0 ? AlertTriangle : CheckCircle,
              color: overdueActions > 0 ? '#D32F2F' : '#2E7D32',
              bg: overdueActions > 0 ? 'bg-red-50' : 'bg-brand-green-50',
            },
            {
              label: 'Équivalence CGEF™',
              value: latestScore.equivalence_applies ? 'Active' : 'Non atteinte',
              sub: latestScore.equivalence_applies ? 'Couverture 100%' : 'Piliers < 3.0 détectés',
              icon: FileCheck,
              color: latestScore.equivalence_applies ? '#2E7D32' : '#F57C00',
              bg: latestScore.equivalence_applies ? 'bg-brand-green-50' : 'bg-orange-50',
            },
          ].map((kpi, i) => (
            <div key={i} className={`card ${kpi.bg}`}>
              <div className="card-body">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-brand-slate-500">{kpi.label}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: kpi.color + '20' }}>
                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                </div>
                <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-sm text-brand-slate-500 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      {latestScore && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Radar */}
          <div className="card">
            <div className="card-header"><h2 className="font-semibold text-brand-slate-900">Maturité par Pilier CGEF™</h2></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="pillar" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10 }} tickCount={6} />
                  <Radar name="Score" dataKey="score" stroke="#2E7D32" fill="#2E7D32" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Framework coverage */}
          <div className="card">
            <div className="card-header"><h2 className="font-semibold text-brand-slate-900">Couverture Réglementaire (%)</h2></div>
            <div className="card-body">
              {latestResponses.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-brand-slate-400">
                  Complétez une évaluation pour voir la couverture
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} barSize={32}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v) => [`${v}%`, 'Couverture']} />
                    <Bar dataKey="coverage" radius={[4, 4, 0, 0]} fill="#2E7D32" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent assessments */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-brand-slate-900">Évaluations récentes</h2>
            <Link to="/assessments" className="text-sm text-brand-green-600 hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="card-body divide-y divide-brand-slate-100">
            {recentAssessments.length === 0 ? (
              <p className="text-brand-slate-400 text-sm py-4 text-center">Aucune évaluation</p>
            ) : recentAssessments.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="font-medium text-brand-slate-900 text-sm">{a.name}</p>
                  <p className="text-xs text-brand-slate-400 mt-0.5">{new Date(a.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  a.status === 'completed' ? 'bg-brand-green-100 text-brand-green-700' :
                  a.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-brand-slate-100 text-brand-slate-600'
                }`}>
                  {a.status === 'completed' ? 'Complété' : a.status === 'in_progress' ? 'En cours' : 'Brouillon'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-brand-slate-900">Plans d&apos;action prioritaires</h2>
            <Link to="/action-plans" className="text-sm text-brand-green-600 hover:underline flex items-center gap-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="card-body divide-y divide-brand-slate-100">
            {actionPlans.length === 0 ? (
              <p className="text-brand-slate-400 text-sm py-4 text-center">Aucun plan d&apos;action</p>
            ) : actionPlans.filter(a => a.status !== 'completed').slice(0, 4).map(a => {
              const today = new Date().toISOString().split('T')[0];
              const overdue = a.due_date && a.due_date < today;
              return (
                <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock className={`w-4 h-4 flex-shrink-0 ${overdue ? 'text-red-500' : 'text-brand-slate-400'}`} />
                    <div className="min-w-0">
                      <p className="font-medium text-brand-slate-900 text-sm truncate">{a.title}</p>
                      {a.due_date && <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500 font-medium' : 'text-brand-slate-400'}`}>
                        {overdue ? 'En retard — ' : ''}{new Date(a.due_date).toLocaleDateString('fr-FR')}
                      </p>}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${
                    a.priority === 'critical' ? 'bg-red-100 text-red-700' :
                    a.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    a.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {a.priority === 'critical' ? 'Critique' : a.priority === 'high' ? 'Haute' : a.priority === 'medium' ? 'Moyenne' : 'Basse'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
