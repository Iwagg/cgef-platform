import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, CircleCheck as CheckCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import {
  PILLARS,
  getProcessesByPillar,
  getMaturityColor,
  getMaturityLabel,
} from '../lib/cgef-framework';
import { computeScore } from '../lib/scoring';
import type { Assessment, AssessmentResponse, PillarId } from '../lib/types';

export function AssessmentEvaluate() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [responses, setResponses] = useState<Map<string, AssessmentResponse>>(new Map());
  const [currentPillar, setCurrentPillar] = useState<PillarId>('P1');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (responses.size > 0) {
        saveResponses();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [responses]);

  async function fetchData() {
    if (!id) return;

    try {
      const [assessmentRes, responsesRes] = await Promise.all([
        supabase.from('assessments').select('*').eq('id', id).single(),
        supabase.from('assessment_responses').select('*').eq('assessment_id', id),
      ]);

      setAssessment(assessmentRes.data);

      const responsesMap = new Map<string, AssessmentResponse>();
      responsesRes.data?.forEach((r) => {
        responsesMap.set(r.process_id, r);
      });
      setResponses(responsesMap);

      if (assessmentRes.data?.status === 'draft') {
        await supabase
          .from('assessments')
          .update({ status: 'in_progress' })
          .eq('id', id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const saveResponses = useCallback(async () => {
    if (!id || !user?.id) return;

    setSaving(true);
    try {
      const responsesToSave = Array.from(responses.values()).map((r) => ({
        assessment_id: id,
        process_id: r.process_id,
        maturity_level: r.maturity_level,
        evidence: r.evidence || null,
        notes: r.notes || null,
        evaluated_by: user.id,
        evaluated_at: new Date().toISOString(),
      }));

      for (const response of responsesToSave) {
        await supabase.from('assessment_responses').upsert(response, {
          onConflict: 'assessment_id,process_id',
        });
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving responses:', error);
    } finally {
      setSaving(false);
    }
  }, [id, user?.id, responses]);

  const handleResponseChange = (
    processId: string,
    field: keyof AssessmentResponse,
    value: number | string
  ) => {
    const existing = responses.get(processId) || {
      id: '',
      assessment_id: id!,
      process_id: processId,
      maturity_level: 0,
      evaluated_by: user?.id || '',
      evaluated_at: new Date().toISOString(),
    };

    const updated = { ...existing, [field]: value };
    setResponses(new Map(responses.set(processId, updated)));
  };

  const completeAssessment = async () => {
    if (!id) return;

    await saveResponses();

    const responseArray = Array.from(responses.values());
    const scoreResult = computeScore(responseArray);

    await supabase.from('assessment_scores').insert({
      assessment_id: id,
      global_score: scoreResult.globalScore,
      cgs_tier: scoreResult.cgsTier,
      cmi_index: scoreResult.cmiIndex,
      pillar_scores: scoreResult.pillarScores,
      equivalence_applies: scoreResult.equivalenceApplies,
    });

    await supabase
      .from('assessments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id);

    navigate(`/assessments/${id}`);
  };

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
      </div>
    );
  }

  const processes = getProcessesByPillar(currentPillar);
  const currentPillarData = PILLARS.find((p) => p.id === currentPillar)!;
  const pillarIndex = PILLARS.findIndex((p) => p.id === currentPillar);

  const evaluatedCount = Array.from(responses.values()).filter(
    (r) => r.maturity_level > 0
  ).length;
  const totalProcesses = PILLARS.reduce(
    (sum, p) => sum + getProcessesByPillar(p.id).length,
    0
  );

  return (
    <div className="flex gap-6">
      <div className="w-64 flex-shrink-0">
        <div className="card sticky top-6">
          <div className="card-header">
            <h3 className="font-semibold text-brand-slate-900">Piliers</h3>
            <p className="text-sm text-brand-slate-500 mt-1">
              {evaluatedCount}/{totalProcesses} processus evalues
            </p>
          </div>
          <div className="card-body p-0">
            {PILLARS.map((pillar) => {
              const pillarProcesses = getProcessesByPillar(pillar.id);
              const pillarEvaluated = pillarProcesses.filter(
                (p) => responses.get(p.id)?.maturity_level
              ).length;
              const isComplete = pillarEvaluated === pillarProcesses.length;

              return (
                <button
                  key={pillar.id}
                  onClick={() => setCurrentPillar(pillar.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left border-b border-brand-slate-100 last:border-0 transition-colors ${
                    currentPillar === pillar.id
                      ? 'bg-brand-green-50 text-brand-green-700'
                      : 'hover:bg-brand-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentPillar === pillar.id
                          ? 'bg-brand-green-500 text-white'
                          : 'bg-brand-slate-100 text-brand-slate-600'
                      }`}
                    >
                      {pillar.id.slice(1)}
                    </span>
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {pillar.name.split(' ')[0]}
                    </span>
                  </div>
                  {isComplete && (
                    <CheckCircle className="w-5 h-5 text-brand-green-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-full bg-brand-green-500 text-white flex items-center justify-center font-bold">
                {currentPillar.slice(1)}
              </span>
              <h1 className="text-2xl font-bold text-brand-slate-900">
                {currentPillarData.name}
              </h1>
            </div>
            <p className="text-brand-slate-500">{currentPillarData.description}</p>
          </div>
          <div className="text-right">
            {saving && (
              <span className="text-sm text-brand-slate-500">Sauvegarde...</span>
            )}
            {lastSaved && !saving && (
              <span className="text-sm text-brand-slate-500">
                Sauvegarde: {lastSaved.toLocaleTimeString('fr-FR')}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {processes.map((process) => (
            <ProcessCard
              key={process.id}
              process={process}
              response={responses.get(process.id)}
              onChange={(field, value) =>
                handleResponseChange(process.id, field, value)
              }
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-6">
          <button
            onClick={() => {
              if (pillarIndex > 0) {
                setCurrentPillar(PILLARS[pillarIndex - 1].id);
              }
            }}
            disabled={pillarIndex === 0}
            className="btn-outline"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Pilier precedent
          </button>

          <button onClick={saveResponses} className="btn-outline">
            <Save className="w-4 h-4 mr-2" />
            Sauvegarder
          </button>

          {pillarIndex < PILLARS.length - 1 ? (
            <button
              onClick={() => setCurrentPillar(PILLARS[pillarIndex + 1].id)}
              className="btn-primary"
            >
              Pilier suivant
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          ) : (
            <button onClick={completeAssessment} className="btn-primary">
              <CheckCircle className="w-4 h-4 mr-2" />
              Terminer l'evaluation
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProcessCard({
  process,
  response,
  onChange,
}: {
  process: ReturnType<typeof getProcessesByPillar>[0];
  response?: AssessmentResponse;
  onChange: (field: keyof AssessmentResponse, value: number | string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const maturityLevel = response?.maturity_level || 0;

  return (
    <div className="card">
      <div className="card-body">
        <div
          className="flex items-start justify-between cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-brand-slate-400">
                {process.id}
              </span>
              {maturityLevel > 0 && (
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getMaturityColor(maturityLevel) }}
                />
              )}
            </div>
            <h3 className="font-semibold text-brand-slate-900">{process.name}</h3>
            <p className="text-sm text-brand-slate-500 mt-1">{process.description}</p>
          </div>
          <button className="p-1 hover:bg-brand-slate-100 rounded transition-colors">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-brand-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-brand-slate-400" />
            )}
          </button>
        </div>

        <div className="mt-4">
          <label className="label">Niveau de maturite</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('maturity_level', level);
                }}
                className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                  maturityLevel === level
                    ? 'border-transparent text-white'
                    : 'border-brand-slate-200 hover:border-brand-slate-300 text-brand-slate-600'
                }`}
                style={{
                  backgroundColor:
                    maturityLevel === level
                      ? getMaturityColor(level)
                      : 'transparent',
                }}
              >
                <span className="font-bold">{level}</span>
                <span className="text-xs block mt-0.5">
                  {getMaturityLabel(level)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-brand-slate-200 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-brand-slate-400" />
                <span className="text-sm font-medium text-brand-slate-700">
                  Objectif
                </span>
              </div>
              <p className="text-sm text-brand-slate-600 bg-brand-slate-50 p-3 rounded-lg">
                {process.objective}
              </p>
            </div>

            <div>
              <label className="label">Criteres de maturite</label>
              <div className="space-y-2">
                {Object.entries(process.maturityCriteria).map(([level, criteria]) => (
                  <div
                    key={level}
                    className={`p-3 rounded-lg border ${
                      maturityLevel === parseInt(level)
                        ? 'border-brand-green-300 bg-brand-green-50'
                        : 'border-brand-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: getMaturityColor(parseInt(level)) }}
                      >
                        {level}
                      </span>
                      <span className="text-sm font-medium text-brand-slate-700">
                        {getMaturityLabel(parseInt(level))}
                      </span>
                    </div>
                    <ul className="text-sm text-brand-slate-600 ml-8 list-disc">
                      {criteria.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {Object.keys(process.regulatoryMappings).length > 0 && (
              <div>
                <label className="label">Mappings reglementaires</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(process.regulatoryMappings).map(
                    ([framework, refs]) => (
                      <span
                        key={framework}
                        className="text-xs px-2 py-1 bg-brand-slate-100 text-brand-slate-600 rounded"
                      >
                        {framework.toUpperCase()}: {refs?.join(', ')}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="label">Preuves / evidences</label>
              <textarea
                value={response?.evidence || ''}
                onChange={(e) => onChange('evidence', e.target.value)}
                className="input min-h-[80px]"
                placeholder="Documents, liens, references..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                value={response?.notes || ''}
                onChange={(e) => onChange('notes', e.target.value)}
                className="input min-h-[80px]"
                placeholder="Observations, commentaires..."
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
