import { useNavigate } from 'react-router-dom';
import { TriangleAlert as AlertTriangle, Shield, CircleCheck as CheckCircle, Clock, Activity, ArrowRight, Target, FileText, Zap, ChartBar as BarChart2, ChevronRight } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area
} from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { RiskBadge, StatusBadge } from '../components/ui/StatusBadge';
import { useOrgTable } from '../hooks/useOrgTable';
import { useAssessmentHistory } from '../hooks/useAssessmentHistory';
import { useAuthStore } from '../stores/auth';
import { PILLARS } from '../lib/cgef-framework';
import { frameworkStats, riskMatrix, shortPillarName, FRAMEWORK_COLORS } from '../lib/metrics';
import { fmtDate, firstName, isOverdue } from '../lib/format';
import type { Risk, RemediationAction, Incident, Control, Evidence, ComplianceRequirement, OrgFramework } from '../lib/db-types';
import type { PillarId } from '../lib/types';

// Same thresholds as the generated risks.severity column
const cellSeverity = (impact: number, likelihood: number) => {
  const s = impact * likelihood;
  return s >= 15 ? 'critical' : s >= 10 ? 'high' : s >= 5 ? 'medium' : 'low';
};

const colorMap: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-300',
  medium: 'bg-amber-500/15 text-amber-300',
  high: 'bg-orange-500/15 text-orange-300',
  critical: 'bg-red-500/20 text-red-300',
};

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function ScoreTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 border border-white/10 rounded-lg p-3 shadow-modal text-xs">
      <p className="text-slate-300 font-medium mb-1">{label}</p>
      <p className="text-slate-200 font-semibold">{payload[0].value.toFixed(2)} / 5</p>
    </div>
  );
}

function Panel({ title, subtitle, link, onLink, children, className = '' }: { title: string; subtitle?: string; link?: string; onLink?: () => void; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-surface-850 rounded-xl border border-white/8 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {link && <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1" onClick={onLink}>{link} <ChevronRight className="w-3.5 h-3.5" /></button>}
      </div>
      {children}
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const organization = useAuthStore((s) => s.organization);
  const risks = useOrgTable<Risk>('risks').rows;
  const actions = useOrgTable<RemediationAction>('action_plans').rows.filter((a) => a.status !== 'cancelled');
  const incidents = useOrgTable<Incident>('incidents').rows;
  const controls = useOrgTable<Control>('controls').rows;
  const evidences = useOrgTable<Evidence>('evidences').rows;
  const requirements = useOrgTable<ComplianceRequirement>('compliance_requirements', {}, true).rows;
  const frameworks = useOrgTable<OrgFramework>('org_frameworks', { orderBy: 'framework', ascending: true }).rows;
  const { history, latest, previous } = useAssessmentHistory();

  const target = Number(organization?.target_maturity ?? 4);
  const maturity = latest ? Number(latest.score.global_score) : null;
  const maturityTrend = latest && previous ? Math.round((Number(latest.score.global_score) - Number(previous.score.global_score)) * 10) / 10 : undefined;
  const pillarScores = (latest?.score.pillar_scores ?? {}) as Record<PillarId, number>;
  const radarData = PILLARS.map((p) => ({ domain: shortPillarName(p.name), score: Number(pillarScores[p.id] ?? 0), target }));

  const openRisks = risks.filter((r) => r.status !== 'closed');
  const criticalRisks = openRisks.filter((r) => r.severity === 'critical');
  const highRisks = openRisks.filter((r) => r.severity === 'high');
  const topRisks = [...openRisks].sort((a, b) => b.inherent_score - a.inherent_score).slice(0, 5);
  const matrix = riskMatrix(risks);

  const openActions = actions.filter((a) => a.status !== 'done');
  const overdueActions = openActions.filter((a) => isOverdue(a.due_date));
  const priorityActions = [...openActions].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || (a.due_date ?? '9').localeCompare(b.due_date ?? '9')).slice(0, 5);
  const remediationProgress = actions.length ? Math.round(actions.reduce((s, a) => s + a.progress, 0) / actions.length) : 0;

  const openIncidents = incidents.filter((i) => i.status === 'open' || i.status === 'investigating');
  const criticalIncidents = openIncidents.filter((i) => i.severity === 'critical').length;
  const implementedControls = controls.filter((c) => c.status === 'implemented').length;
  const controlCoverage = controls.length ? Math.round(((implementedControls + controls.filter((c) => c.status === 'partial').length * 0.5) / controls.length) * 100) : 0;
  const auditReadiness = evidences.length ? Math.round((evidences.filter((e) => e.status === 'accepted').length / evidences.length) * 100) : 0;

  const fwStats = frameworks.filter((f) => f.is_active).map((f) => frameworkStats(requirements, f.framework)).filter((s) => s.total > 0);
  const complianceReadiness = fwStats.length ? Math.round(fwStats.reduce((s, f) => s + f.percentage, 0) / fwStats.length) : 0;
  const weakest = [...fwStats].sort((a, b) => a.percentage - b.percentage).slice(0, 2);

  const scoreHistory = history.map((h) => ({ date: fmtDate(h.assessment.completed_at), score: Number(h.score.global_score) }));
  const now = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const isEmpty = !latest && !risks.length && !controls.length && !requirements.length;

  return (
    <div className="page-container">
      <PageHeader
        title="Executive Dashboard"
        subtitle={`${organization?.name ?? 'Your organisation'} — Cyber governance overview · ${now}`}
        actions={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/reporting')}><FileText className="w-3.5 h-3.5" />Export Report</button>}
      />

      {isEmpty && (
        <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-100 mb-2">Welcome to CGEF Platform — let’s get started</h3>
          <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside">
            <li><button className="text-brand-400 hover:underline" onClick={() => navigate('/assessments')}>Run your first CGEF maturity assessment</button> to obtain your CGS® score.</li>
            <li><button className="text-brand-400 hover:underline" onClick={() => navigate('/risks')}>Register your main cyber risks</button> and <button className="text-brand-400 hover:underline" onClick={() => navigate('/controls')}>controls</button>.</li>
            <li><button className="text-brand-400 hover:underline" onClick={() => navigate('/compliance')}>Load the standard requirements</button> for NIS2, DORA, ISO 27001 or RGPD.</li>
            <li>Invite your team from <button className="text-brand-400 hover:underline" onClick={() => navigate('/settings?tab=team')}>Settings → Team</button>.</li>
          </ol>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Cyber Maturity Score" value={maturity != null ? maturity.toFixed(1) : '—'} unit={maturity != null ? '/ 5' : undefined} trend={maturityTrend} trendLabel={maturityTrend != null ? 'vs previous' : undefined} sublabel={latest ? `CGS® ${latest.score.cgs_tier}` : 'no assessment yet'} icon={<Shield className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" onClick={() => navigate('/maturity')} />
        <MetricCard label="Compliance Readiness" value={`${complianceReadiness}%`} sublabel={`${fwStats.length} framework(s) tracked`} icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" onClick={() => navigate('/compliance')} />
        <MetricCard label="Critical Risks Open" value={criticalRisks.length} sublabel={`${openRisks.length} open risks`} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" onClick={() => navigate('/risks')} />
        <MetricCard label="Overdue Action Plans" value={overdueActions.length} sublabel={`${openActions.length} total open`} icon={<Clock className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" onClick={() => navigate('/incidents')} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Audit Readiness" value={`${auditReadiness}%`} sublabel="evidence accepted" icon={<Activity className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" onClick={() => navigate('/audit')} />
        <MetricCard label="Control Coverage" value={`${controlCoverage}%`} sublabel={`${implementedControls}/${controls.length} implemented`} icon={<Target className="w-4 h-4 text-blue-400" />} iconBg="bg-blue-500/15" onClick={() => navigate('/controls')} />
        <MetricCard label="Open Incidents" value={openIncidents.length} sublabel={`${criticalIncidents} critical active`} icon={<Zap className="w-4 h-4 text-orange-400" />} iconBg="bg-orange-500/15" onClick={() => navigate('/incidents')} />
        <MetricCard label="Remediation Progress" value={`${remediationProgress}%`} sublabel="average action progress" icon={<BarChart2 className="w-4 h-4 text-violet-400" />} iconBg="bg-violet-500/15" onClick={() => navigate('/incidents')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Panel title="Cyber Maturity by Pillar" subtitle="Current vs target maturity levels" link="Full assessment" onLink={() => navigate('/maturity')} className="lg:col-span-2">
          {latest ? (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Radar name="Target" dataKey="target" stroke="#1d4ed8" fill="#3b82f6" fillOpacity={0.06} strokeWidth={1} strokeDasharray="4 4" />
                    <Radar name="Current" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-6 mt-1 justify-center">
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 bg-brand-500" /><span className="text-xs text-slate-400">Current</span></div>
                <div className="flex items-center gap-2"><div className="w-4 h-0.5 border-t border-dashed border-blue-700" /><span className="text-xs text-slate-400">Target ({target.toFixed(1)})</span></div>
              </div>
            </>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-slate-400 mb-3">Complete a CGEF assessment to see your maturity radar.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/assessments')}>Start Assessment</button>
            </div>
          )}
        </Panel>

        <Panel title="Risk Heatmap" subtitle="Open risks · likelihood × impact" link="View all" onLink={() => navigate('/risks')}>
          <div className="space-y-1 mb-3">
            {matrix.map((row, ri) => (
              <div key={ri} className="flex items-center gap-1">
                <span className="text-xs text-slate-600 w-14 text-right">{ri === 0 ? '↑ Impact 5' : 5 - ri}</span>
                <div className="flex gap-1 flex-1">
                  {row.map((count, ci) => (
                    <div key={ci} className={`flex-1 aspect-square rounded flex items-center justify-center text-xs font-bold ${colorMap[cellSeverity(5 - ri, ci + 1)]}`}>{count > 0 ? count : ''}</div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-slate-600 w-14" />
              <div className="flex gap-1 flex-1">{[1, 2, 3, 4, 5].map((l) => <span key={l} className="flex-1 text-center text-xs text-slate-600">{l}</span>)}</div>
            </div>
            <div className="text-center text-xs text-slate-600">Likelihood →</div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/15"><p className="text-lg font-bold text-red-400">{criticalRisks.length}</p><p className="text-xs text-slate-400">Critical</p></div>
            <div className="text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/15"><p className="text-lg font-bold text-orange-400">{highRisks.length}</p><p className="text-xs text-slate-400">High</p></div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Panel title="Maturity Score History" subtitle="Global CGEF score of each completed assessment" link="Assessments" onLink={() => navigate('/assessments')} className="lg:col-span-2">
          <div className="h-52">
            {scoreHistory.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={scoreHistory} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <defs><linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 5]} />
                  <Tooltip content={<ScoreTooltip />} />
                  <Area type="monotone" dataKey="score" name="Score" stroke="#3b82f6" fill="url(#gScore)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-500 text-center px-6">
                {scoreHistory.length === 1 ? `One assessment so far (${scoreHistory[0].score.toFixed(2)} / 5). The trend appears after your next assessment.` : 'No completed assessment yet.'}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Framework Readiness">
          <div className="space-y-3">
            {fwStats.map((f) => (
              <div key={f.framework}>
                <div className="flex justify-between text-xs mb-1"><span className="text-slate-400">{f.framework}</span><span className="font-medium text-slate-300">{f.percentage}%</span></div>
                <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${f.percentage}%`, backgroundColor: FRAMEWORK_COLORS[f.framework] ?? '#3b82f6' }} /></div>
              </div>
            ))}
            {fwStats.length === 0 && <p className="text-xs text-slate-500">No requirements tracked yet.</p>}
          </div>
          <button className="mt-4 w-full btn btn-outline btn-sm" onClick={() => navigate('/compliance')}>Compliance Center</button>
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <div><h3 className="text-sm font-semibold text-slate-200">Top Risks</h3><p className="text-xs text-slate-500 mt-0.5">{criticalRisks.length + highRisks.length} risks require attention</p></div>
            <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1" onClick={() => navigate('/risks')}>Risk register <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="divide-y divide-white/5">
            {topRisks.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => navigate('/risks')}>
                <RiskBadge severity={r.severity} />
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-slate-200 truncate">{r.title}</p><p className="text-xs text-slate-500">{r.ref} · {r.domain ?? '—'} · {firstName(r.owner)}</p></div>
                <div className="text-right flex-shrink-0"><p className="text-sm font-bold text-slate-200">{r.residual_score ?? r.inherent_score}</p><p className="text-xs text-slate-500">{r.residual_score != null ? 'residual' : 'inherent'}</p></div>
              </div>
            ))}
            {topRisks.length === 0 && <p className="px-5 py-8 text-center text-xs text-slate-500">No open risks.</p>}
          </div>
        </div>

        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <div><h3 className="text-sm font-semibold text-slate-200">Priority Action Plans</h3><p className="text-xs text-slate-500 mt-0.5">{openActions.length} active · {overdueActions.length} overdue</p></div>
            <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1" onClick={() => navigate('/incidents')}>All actions <ArrowRight className="w-3.5 h-3.5" /></button>
          </div>
          <div className="divide-y divide-white/5">
            {priorityActions.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => navigate('/incidents')}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5"><StatusBadge status={a.priority} size="sm" /><p className="text-sm font-medium text-slate-200 truncate">{a.title}</p></div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden"><div className="h-full rounded-full bg-brand-500" style={{ width: `${a.progress}%` }} /></div>
                    <span className="text-xs text-slate-500 flex-shrink-0">{a.progress}%</span>
                  </div>
                </div>
                <p className={`text-xs flex-shrink-0 ${isOverdue(a.due_date) ? 'text-red-400' : 'text-slate-500'}`}>{a.due_date ? fmtDate(a.due_date, 'day') : '—'}</p>
              </div>
            ))}
            {priorityActions.length === 0 && <p className="px-5 py-8 text-center text-xs text-slate-500">No open actions.</p>}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-brand-950/80 to-surface-850 rounded-xl border border-brand-500/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-brand-500/20 flex items-center justify-center"><FileText className="w-3 h-3 text-brand-400" /></div>
              <h3 className="text-sm font-semibold text-slate-200">Board-Ready Summary</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              {maturity != null
                ? <>Cyber maturity stands at <span className="text-slate-200 font-medium">{maturity.toFixed(1)}/5 (CGS® {latest?.score.cgs_tier})</span> against a target of {target.toFixed(1)}. </>
                : <>No maturity assessment has been completed yet. </>}
              {weakest.length > 0 && <>Lowest regulatory readiness: {weakest.map((w, i) => <span key={w.framework}>{i > 0 && ' and '}<span className="text-slate-200 font-medium">{w.framework} ({w.percentage}%)</span></span>)}. </>}
              <span className={criticalRisks.length ? 'text-red-400 font-medium' : 'text-slate-200 font-medium'}>{criticalRisks.length} critical risk(s)</span> open
              {openIncidents.length > 0 && <>, <span className="text-orange-400 font-medium">{openIncidents.length} incident(s)</span> under handling</>}
              {overdueActions.length > 0 && <>, <span className="text-amber-400 font-medium">{overdueActions.length} overdue action(s)</span></>}.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm flex-shrink-0" onClick={() => navigate('/reporting')}>Generate Report</button>
        </div>
      </div>
    </div>
  );
}
