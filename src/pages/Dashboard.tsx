import { useNavigate } from 'react-router-dom';
import { TriangleAlert as AlertTriangle, Shield, CircleCheck as CheckCircle, Clock, Activity, ArrowRight, Target, FileText, Zap, ChartBar as BarChart2, ChevronRight } from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area
} from 'recharts';
import {
  mockDashboardKPIs, mockRisks, mockActionPlans, mockMaturityDomains,
  mockComplianceTimeline
} from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { RiskBadge, StatusBadge } from '../components/ui/StatusBadge';

const radarData = mockMaturityDomains.map((d) => ({
  domain: d.domain,
  score: d.score,
  target: d.target,
}));

const riskMatrixColors = [
  ['low', 'low', 'medium', 'high', 'critical'],
  ['low', 'medium', 'medium', 'high', 'critical'],
  ['low', 'medium', 'high', 'critical', 'critical'],
  ['medium', 'high', 'critical', 'critical', 'critical'],
  ['high', 'critical', 'critical', 'critical', 'critical'],
];

const colorMap: Record<string, string> = {
  low: 'bg-emerald-500/15 text-emerald-300',
  medium: 'bg-amber-500/15 text-amber-300',
  high: 'bg-orange-500/15 text-orange-300',
  critical: 'bg-red-500/20 text-red-300',
};

const riskMatrix: number[][] = [
  [0, 0, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 1, 2, 2, 1],
  [0, 0, 1, 2, 1],
  [0, 0, 0, 1, 1],
];

const kpis = mockDashboardKPIs;
const criticalRisks = mockRisks.filter((r) => r.severity === 'critical');
const highRisks = mockRisks.filter((r) => r.severity === 'high');
const openActions = mockActionPlans.filter((a) => a.status === 'in_progress' || a.status === 'todo');
const overdueActions = mockActionPlans.filter((a) => a.status !== 'done' && new Date(a.dueDate) < new Date());

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{name: string; color: string; value: number}>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-800 border border-white/10 rounded-lg p-3 shadow-modal text-xs">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-slate-200 font-semibold">{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

export function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <PageHeader
        title="Executive Dashboard"
        subtitle="Nexus Finance Group — Cyber governance overview · May 2026"
        actions={
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/reporting')}>
            <FileText className="w-3.5 h-3.5" />
            Export Report
          </button>
        }
      />

      {/* Top KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Cyber Maturity Score" value="3.2" unit="/ 5" trend={0.3} trendLabel="vs Q1" icon={<Shield className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" onClick={() => navigate('/maturity')} />
        <MetricCard label="Compliance Readiness" value="68%" trend={4} trendLabel="vs Q1" icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" onClick={() => navigate('/compliance')} />
        <MetricCard label="Critical Risks Open" value={kpis.criticalRisks} trend={-2} trendLabel="vs Q1" icon={<AlertTriangle className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" onClick={() => navigate('/risks')} />
        <MetricCard label="Overdue Action Plans" value={overdueActions.length} sublabel={`${openActions.length} total open`} icon={<Clock className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" onClick={() => navigate('/incidents')} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Audit Readiness" value={`${kpis.auditReadiness}%`} trend={8} trendLabel="vs Q1" icon={<Activity className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" onClick={() => navigate('/audit')} />
        <MetricCard label="Control Coverage" value={`${kpis.controlCoverage}%`} sublabel="controls implemented" icon={<Target className="w-4 h-4 text-blue-400" />} iconBg="bg-blue-500/15" onClick={() => navigate('/controls')} />
        <MetricCard label="Open Incidents" value={kpis.openIncidents} sublabel="1 critical active" icon={<Zap className="w-4 h-4 text-orange-400" />} iconBg="bg-orange-500/15" onClick={() => navigate('/incidents')} />
        <MetricCard label="Remediation Progress" value={`${kpis.actionPlanProgress}%`} sublabel="of actions on track" icon={<BarChart2 className="w-4 h-4 text-violet-400" />} iconBg="bg-violet-500/15" />
      </div>

      {/* Radar + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="bg-surface-850 rounded-xl border border-white/8 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Cyber Maturity by Domain</h3>
              <p className="text-xs text-slate-500 mt-0.5">Current vs Target maturity levels</p>
            </div>
            <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1" onClick={() => navigate('/maturity')}>
              Full assessment <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
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
            <div className="flex items-center gap-2"><div className="w-4 h-0.5 border-t border-dashed border-blue-700" /><span className="text-xs text-slate-400">Target</span></div>
          </div>
        </div>

        <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Risk Heatmap</h3>
              <p className="text-xs text-slate-500 mt-0.5">Likelihood × Impact matrix</p>
            </div>
            <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1" onClick={() => navigate('/risks')}>
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1 mb-3">
            <div className="flex items-center gap-1 mb-1.5">
              <span className="text-xs text-slate-600 w-14 text-right">↑ Impact</span>
              <div className="flex gap-1 flex-1">{[1,2,3,4,5].map((l) => <span key={l} className="flex-1 text-center text-xs text-slate-600">{l}</span>)}</div>
            </div>
            {riskMatrix.map((row, ri) => (
              <div key={ri} className="flex items-center gap-1">
                <span className="text-xs text-slate-600 w-14 text-right">{5 - ri}</span>
                <div className="flex gap-1 flex-1">
                  {row.map((count, ci) => (
                    <div key={ci} className={`flex-1 aspect-square rounded flex items-center justify-center text-xs font-bold ${colorMap[riskMatrixColors[ri][ci]]}`}>
                      {count > 0 ? count : ''}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-slate-600 w-14" />
              <div className="flex-1 text-center text-xs text-slate-600">Likelihood →</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/15">
              <p className="text-lg font-bold text-red-400">{criticalRisks.length}</p>
              <p className="text-xs text-slate-400">Critical</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-orange-500/10 border border-orange-500/15">
              <p className="text-lg font-bold text-orange-400">{highRisks.length}</p>
              <p className="text-xs text-slate-400">High</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance trend + Framework readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="bg-surface-850 rounded-xl border border-white/8 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Compliance Readiness Trend</h3>
              <p className="text-xs text-slate-500 mt-0.5">Jan–May 2026 across key frameworks</p>
            </div>
            <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1" onClick={() => navigate('/compliance')}>
              Compliance Center <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockComplianceTimeline} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <defs>
                  <linearGradient id="gIso" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gNis2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gDora" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.15}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} domain={[40, 90]} tickFormatter={(v: number) => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="iso" name="ISO 27001" stroke="#3b82f6" fill="url(#gIso)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="nis2" name="NIS2" stroke="#06b6d4" fill="url(#gNis2)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="dora" name="DORA" stroke="#a855f7" fill="url(#gDora)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="rgpd" name="RGPD" stroke="#22c55e" fill="none" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Framework Readiness</h3>
          <div className="space-y-3">
            {[
              { name: 'ISO 27001', pct: 68, color: '#3b82f6' },
              { name: 'NIS2', pct: 54, color: '#06b6d4' },
              { name: 'DORA', pct: 61, color: '#a855f7' },
              { name: 'RGPD', pct: 82, color: '#22c55e' },
              { name: 'NIST CSF', pct: 71, color: '#f59e0b' },
              { name: 'CIS Controls', pct: 75, color: '#6366f1' },
            ].map((f) => (
              <div key={f.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-400">{f.name}</span>
                  <span className="font-medium text-slate-300">{f.pct}%</span>
                </div>
                <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${f.pct}%`, backgroundColor: f.color }} />
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full btn btn-outline btn-sm" onClick={() => navigate('/compliance')}>
            Compliance Center
          </button>
        </div>
      </div>

      {/* Critical risks + Priority actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Top Critical Risks</h3>
              <p className="text-xs text-slate-500 mt-0.5">{criticalRisks.length + highRisks.length} risks require attention</p>
            </div>
            <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1" onClick={() => navigate('/risks')}>
              Risk register <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {mockRisks.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors cursor-pointer">
                <RiskBadge severity={r.severity} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{r.title}</p>
                  <p className="text-xs text-slate-500">{r.domain} · {r.owner.split(' ')[0]}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-200">{r.residualScore}</p>
                  <p className="text-xs text-slate-500">residual</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">Priority Action Plans</h3>
              <p className="text-xs text-slate-500 mt-0.5">{openActions.length} active · {overdueActions.length} overdue</p>
            </div>
            <button className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1" onClick={() => navigate('/incidents')}>
              All actions <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-white/5">
            {mockActionPlans.filter((a) => a.status !== 'done').slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <StatusBadge status={a.priority} size="sm" />
                    <p className="text-sm font-medium text-slate-200 truncate">{a.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${a.progress}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 flex-shrink-0">{a.progress}%</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-slate-500">{new Date(a.dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Board summary */}
      <div className="bg-gradient-to-r from-brand-950/80 to-surface-850 rounded-xl border border-brand-500/20 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-brand-500/20 flex items-center justify-center">
                <FileText className="w-3 h-3 text-brand-400" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">Board-Ready Summary</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Cyber maturity is progressing at <span className="text-slate-200 font-medium">3.2/5</span> with a target of 4.0 by Q4 2026.
              Top regulatory exposure: <span className="text-slate-200 font-medium">NIS2 (54%)</span> and <span className="text-slate-200 font-medium">DORA (61%)</span> — deadlines October 2026 and January 2027.
              <span className="text-red-400 font-medium"> 7 critical risks</span> are open including ransomware and third-party breach vectors.
              <span className="text-amber-400 font-medium"> 3 strategic programs</span> on track: PAM deployment, DORA ICT Resilience, and ISO 27001 recertification.
              Recommended board decision: approve €1.2M cyber investment roadmap for 2026–2027.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm flex-shrink-0" onClick={() => navigate('/reporting')}>
            Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
