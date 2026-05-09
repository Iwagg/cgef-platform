import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, CircleCheck as CheckCircle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { PILLARS, getProcessesByPillar, getMaturityColor, getMaturityLabel } from '../lib/cgef-framework';
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

  useEffect(() => { fetchData(); }, [id]);

  useEffect(() => {
    const interval = setInterval(() => { if (responses.size > 0) saveResponses(); }, 30000);
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
      responsesRes.data?.forEach((r) => { responsesMap.set(r.process_id, r); });
      setResponses(responsesMap);
      if (assessmentRes.data?.status === 'draft') {
        await supabase.from('assessments').update({ status: 'in_progress' }).eq('id', id);
      }
    } catch (error) { console.error('Error fetching data:', error); }
    finally { setLoading(false); }
  }

  const saveResponses = useCallback(async () => {
    if (!id || !user?.id) return;
    setSaving(true);
    try {
      const responsesToSave = Array.from(responses.values()).map((r) => ({
        assessment_id: id, process_id: r.process_id, pillar_id: r.pillar_id,
        maturity_level: r.maturity_level, evidence: r.evidence || null, notes: r.notes || null,
        answered_by: user.id, answered_at: new Date().toISOString(),
      }));
      for (const response of responsesToSave) {
        await supabase.from('assessment_responses').upsert(response, { onConflict: 'assessment_id,process_id' });
      }
      setLastSaved(new Date());
    } catch (error) { console.error('Error saving responses:', error); }
    finally { setSaving(false); }
  }, [id, user?.id, responses]);

  const handleResponseChange = (processId: string, field: keyof AssessmentResponse, value: number | string) => {
    const existing = responses.get(processId) || {
      id: '', assessment_id: id!, process_id: processId, pillar_id: currentPillar,
      maturity_level: 0, answered_by: user?.id || '', answered_at: new Date().toISOString(),
    };
    setResponses(new Map(responses.set(processId, { ...existing, [field]: value })));
  };

  const completeAssessment = async () => {
    if (!id) return;
    await saveResponses();
    const responseArray = Array.from(responses.values());
    const scoreResult = computeScore(responseArray);
    await supabase.from('assessment_scores').insert({
      assessment_id: id, global_score: scoreResult.globalScore, cgs_tier: scoreResult.cgsTier,
      cmi_index: scoreResult.cmiIndex, pillar_scores: scoreResult.pillarScores,
      equivalence_applies: scoreResult.equivalenceApplies,
    });
    await supabase.from('assessments').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    navigate(`/assessments/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!assessment) {
    return <div className="text-center py-12 text-slate-500 text-sm">Assessment not found</div>;
  }

  const processes = getProcessesByPillar(currentPillar);
  const currentPillarData = PILLARS.find((p) => p.id === currentPillar)!;
  const pillarIndex = PILLARS.findIndex((p) => p.id === currentPillar);
  const evaluatedCount = Array.from(responses.values()).filter((r) => r.maturity_level > 0).length;
  const totalProcesses = PILLARS.reduce((sum, p) => sum + getProcessesByPillar(p.id).length, 0);

  return (
    <div className="flex gap-5 p-6 max-w-screen-2xl mx-auto">
      <div className="w-56 flex-shrink-0">
        <div className="bg-surface-850 border border-white/8 rounded-xl overflow-hidden sticky top-6">
          <div className="px-4 py-3 border-b border-white/8">
            <h3 className="text-xs font-semibold text-slate-200">Pillars</h3>
            <p className="text-xs text-slate-500 mt-0.5">{evaluatedCount}/{totalProcesses} evaluated</p>
          </div>
          <div>
            {PILLARS.map((pillar) => {
              const pillarProcesses = getProcessesByPillar(pillar.id);
              const pillarEvaluated = pillarProcesses.filter((p) => responses.get(p.id)?.maturity_level).length;
              const isComplete = pillarEvaluated === pillarProcesses.length;
              return (
                <button key={pillar.id} onClick={() => setCurrentPillar(pillar.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left border-b border-white/5 last:border-0 transition-colors ${currentPillar === pillar.id ? 'bg-brand-500/15 text-brand-300' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${currentPillar === pillar.id ? 'bg-brand-500 text-white' : 'bg-white/8 text-slate-400'}`}>
                      {pillar.id.slice(1)}
                    </span>
                    <span className="text-xs font-medium truncate max-w-[100px]">{pillar.name.split(' ')[0]}</span>
                  </div>
                  {isComplete && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-sm">{currentPillar.slice(1)}</span>
            <div>
              <h1 className="text-lg font-bold text-slate-100">{currentPillarData.name}</h1>
              <p className="text-xs text-slate-500">{currentPillarData.description}</p>
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            {saving && <span>Saving...</span>}
            {lastSaved && !saving && <span>Saved {lastSaved.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>}
          </div>
        </div>

        <div className="space-y-3">
          {processes.map((process) => (
            <ProcessCard key={process.id} process={process} response={responses.get(process.id)}
              onChange={(field, value) => handleResponseChange(process.id, field, value)} />
          ))}
        </div>

        <div className="flex items-center justify-between pt-4">
          <button onClick={() => { if (pillarIndex > 0) setCurrentPillar(PILLARS[pillarIndex - 1].id); }}
            disabled={pillarIndex === 0} className="btn btn-secondary btn-sm">
            <ArrowLeft className="w-3.5 h-3.5" /> Previous
          </button>
          <button onClick={saveResponses} className="btn btn-outline btn-sm">
            <Save className="w-3.5 h-3.5" /> Save
          </button>
          {pillarIndex < PILLARS.length - 1 ? (
            <button onClick={() => setCurrentPillar(PILLARS[pillarIndex + 1].id)} className="btn btn-primary btn-sm">
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button onClick={completeAssessment} className="btn btn-primary btn-sm">
              <CheckCircle className="w-3.5 h-3.5" /> Complete Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ProcessCard({
  process, response, onChange,
}: {
  process: ReturnType<typeof getProcessesByPillar>[0];
  response?: AssessmentResponse;
  onChange: (field: keyof AssessmentResponse, value: number | string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const maturityLevel = response?.maturity_level || 0;

  return (
    <div className="bg-surface-850 border border-white/8 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-500">{process.id}</span>
              {maturityLevel > 0 && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getMaturityColor(maturityLevel) }} />}
            </div>
            <h3 className="text-sm font-semibold text-slate-200">{process.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{process.description}</p>
          </div>
          <button className="btn-ghost btn-icon p-1.5">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="mt-3">
          <label className="label">Maturity Level</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((level) => (
              <button key={level} onClick={(e) => { e.stopPropagation(); onChange('maturity_level', level); }}
                className={`flex-1 py-2.5 rounded-lg border-2 transition-all text-center ${maturityLevel === level ? 'border-transparent text-white' : 'border-white/10 hover:border-white/20 text-slate-400'}`}
                style={{ backgroundColor: maturityLevel === level ? getMaturityColor(level) : 'transparent' }}
              >
                <span className="font-bold text-sm block">{level}</span>
                <span className="text-xs block mt-0.5 leading-tight">{getMaturityLabel(level)}</span>
              </button>
            ))}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-white/8 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-400">Objective</span>
              </div>
              <p className="text-xs text-slate-400 bg-white/4 p-3 rounded-lg leading-relaxed">{process.objective}</p>
            </div>
            <div>
              <label className="label">Maturity Criteria</label>
              <div className="space-y-2">
                {Object.entries(process.maturityCriteria).map(([level, criteria]) => (
                  <div key={level} className={`p-3 rounded-lg border ${maturityLevel === parseInt(level) ? 'border-brand-500/30 bg-brand-500/5' : 'border-white/8'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: getMaturityColor(parseInt(level)) }}>
                        {level}
                      </span>
                      <span className="text-xs font-medium text-slate-300">{getMaturityLabel(parseInt(level))}</span>
                    </div>
                    <ul className="text-xs text-slate-400 ml-7 list-disc space-y-0.5">
                      {criteria.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            {Object.keys(process.regulatoryMappings).length > 0 && (
              <div>
                <label className="label">Regulatory Mappings</label>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(process.regulatoryMappings).map(([framework, refs]) => (
                    <span key={framework} className="text-xs px-2 py-0.5 bg-brand-500/15 text-brand-400 border border-brand-500/20 rounded font-mono">
                      {framework.toUpperCase()}: {refs?.join(', ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="label">Evidence / References</label>
              <textarea value={response?.evidence || ''} onChange={(e) => onChange('evidence', e.target.value)}
                className="input resize-none text-xs" rows={2} placeholder="Documents, links, references..."
                onClick={(e) => e.stopPropagation()} />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea value={response?.notes || ''} onChange={(e) => onChange('notes', e.target.value)}
                className="input resize-none text-xs" rows={2} placeholder="Observations, comments..."
                onClick={(e) => e.stopPropagation()} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
