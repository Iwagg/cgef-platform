import { useEffect, useState, useCallback } from 'react';
import { Shield, CheckCircle, AlertTriangle, Clock, ChevronRight, ExternalLink, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { FRAMEWORKS, PROCESSES } from '../lib/cgef-framework';
import type { AssessmentResponse, AssessmentScore } from '../lib/types';

interface FrameworkStats {
  total: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  coverage: number;
}

export function Compliance() {
  const { organization } = useAuthStore();
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);
  const [responses, setResponses] = useState<AssessmentResponse[]>([]);
  const [score, setScore] = useState<AssessmentScore | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!organization?.id) { setLoading(false); return; }
    try {
      const { data: assessments } = await supabase
        .from('assessments').select('id').eq('organization_id', organization.id)
        .eq('status', 'completed').order('completed_at', { ascending: false }).limit(1);

      if (assessments && assessments.length > 0) {
        const assessmentId = assessments[0].id;
        const [respRes, scoreRes] = await Promise.all([
          supabase.from('assessment_responses').select('*').eq('assessment_id', assessmentId),
          supabase.from('assessment_scores').select('*').eq('assessment_id', assessmentId).order('computed_at', { ascending: false }).limit(1).maybeSingle(),
        ]);
        setResponses(respRes.data || []);
        setScore(scoreRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getFrameworkStats = (frameworkId: string): FrameworkStats => {
    const relevantProcesses = PROCESSES.filter(p => p.regulatoryMappings[frameworkId]?.length);
    if (relevantProcesses.length === 0) return { total: 0, compliant: 0, partial: 0, nonCompliant: 0, coverage: 0 };

    const compliant = relevantProcesses.filter(p => responses.some(r => r.process_id === p.id && r.maturity_level >= 3)).length;
    const partial = relevantProcesses.filter(p => responses.some(r => r.process_id === p.id && r.maturity_level === 2)).length;
    const nonCompliant = relevantProcesses.length - compliant - partial;
    return {
      total: relevantProcesses.length,
      compliant,
      partial,
      nonCompliant,
      coverage: Math.round((compliant / relevantProcesses.length) * 100),
    };
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-green-500 border-t-transparent rounded-full" /></div>;
  }

  const hasData = responses.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-slate-900">Conformité Réglementaire</h1>
        <p className="text-brand-slate-500 mt-1">Mapping de votre maturité CGEF™ vers les référentiels réglementaires</p>
      </div>

      {/* Equivalence banner */}
      {score && (
        <div className={`card border ${score.equivalence_applies ? 'bg-gradient-to-r from-brand-green-50 to-brand-blue-50 border-brand-green-200' : 'bg-orange-50 border-orange-200'}`}>
          <div className="card-body flex items-start gap-4">
            <div className={`p-3 rounded-lg shadow-sm ${score.equivalence_applies ? 'bg-white' : 'bg-orange-100'}`}>
              <Shield className={`w-8 h-8 ${score.equivalence_applies ? 'text-brand-green-600' : 'text-orange-600'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-brand-slate-900">Principe d&apos;Équivalence CGEF™</h2>
              <p className="text-brand-slate-600 mt-1 text-sm">
                Si tous vos piliers atteignent le niveau 3 (Défini), vous êtes présumé conforme à l&apos;ensemble des référentiels majeurs.
              </p>
              <div className={`flex items-center gap-2 mt-3 ${score.equivalence_applies ? 'text-brand-green-700' : 'text-orange-700'}`}>
                {score.equivalence_applies
                  ? <><CheckCircle className="w-5 h-5 text-brand-green-500" /><span className="text-sm font-medium">Principe applicable — Couverture présumée à 100% sur tous les référentiels</span></>
                  : <><AlertTriangle className="w-5 h-5 text-orange-500" /><span className="text-sm font-medium">Principe non atteint — Des piliers sont inférieurs au seuil de 3.0</span></>
                }
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="card">
          <div className="card-body text-center py-12">
            <BarChart3 className="w-12 h-12 text-brand-slate-300 mx-auto mb-4" />
            <p className="text-brand-slate-500 font-medium">Aucune évaluation complétée</p>
            <p className="text-brand-slate-400 text-sm mt-1">Complétez une évaluation CGEF™ pour voir votre couverture réglementaire.</p>
          </div>
        </div>
      )}

      {/* Framework grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FRAMEWORKS.map(fw => {
          const stats = getFrameworkStats(fw.id);
          const isSelected = selectedFramework === fw.id;
          return (
            <button
              key={fw.id}
              onClick={() => setSelectedFramework(isSelected ? null : fw.id)}
              className={`card text-left transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-brand-green-500' : ''}`}
            >
              <div className="card-body">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fw.color }} />
                    <span className="font-semibold text-brand-slate-900 text-sm">{fw.name}</span>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-brand-slate-400 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl font-bold" style={{ color: fw.color }}>
                    {hasData ? `${stats.coverage}%` : '—'}
                  </span>
                  <span className="text-brand-slate-500 text-sm">couverture</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-brand-slate-100 rounded-full h-1.5 mb-3">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${hasData ? stats.coverage : 0}%`, backgroundColor: fw.color }} />
                </div>

                <div className="grid grid-cols-3 gap-1 text-xs text-center">
                  <div className="bg-green-50 rounded p-1.5">
                    <CheckCircle className="w-3 h-3 text-green-600 mx-auto mb-0.5" />
                    <div className="font-semibold text-green-700">{hasData ? stats.compliant : '—'}</div>
                    <div className="text-green-600">Conforme</div>
                  </div>
                  <div className="bg-yellow-50 rounded p-1.5">
                    <Clock className="w-3 h-3 text-yellow-600 mx-auto mb-0.5" />
                    <div className="font-semibold text-yellow-700">{hasData ? stats.partial : '—'}</div>
                    <div className="text-yellow-600">Partiel</div>
                  </div>
                  <div className="bg-red-50 rounded p-1.5">
                    <AlertTriangle className="w-3 h-3 text-red-600 mx-auto mb-0.5" />
                    <div className="font-semibold text-red-700">{hasData ? stats.nonCompliant : '—'}</div>
                    <div className="text-red-600">Non conf.</div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed view */}
      {selectedFramework && hasData && (() => {
        const fw = FRAMEWORKS.find(f => f.id === selectedFramework)!;
        const relevantProcesses = PROCESSES.filter(p => p.regulatoryMappings[selectedFramework]?.length);
        return (
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: fw.color }} />
                <h2 className="font-semibold text-brand-slate-900">{fw.name} — Détail par processus</h2>
              </div>
              <a href="#" className="text-sm text-brand-green-600 hover:underline flex items-center gap-1">
                Documentation <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="card-body">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {relevantProcesses.map(p => {
                  const resp = responses.find(r => r.process_id === p.id);
                  const level = resp?.maturity_level ?? 0;
                  const status = level >= 3 ? 'conforme' : level === 2 ? 'partiel' : 'non_conforme';
                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-brand-slate-100 hover:bg-brand-slate-50">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'conforme' ? 'bg-green-500' : status === 'partiel' ? 'bg-yellow-500' : 'bg-red-400'}`} />
                        <div className="min-w-0">
                          <span className="text-xs font-mono text-brand-slate-400 mr-2">{p.id}</span>
                          <span className="text-sm font-medium text-brand-slate-900">{p.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {level > 0 && (
                          <span className="text-xs text-brand-slate-500">Niv. {level}/5</span>
                        )}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${status === 'conforme' ? 'bg-green-100 text-green-700' : status === 'partiel' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {status === 'conforme' ? 'Conforme' : status === 'partiel' ? 'Partiel' : 'Non évalué'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
