import { useState } from 'react';
import { Shield, Target, TrendingUp, ChevronRight } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { mockMaturityDomains } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';

const maturityLevels = [
  { level: 1, label: 'Initial', description: 'Ad-hoc processes, reactive security posture', color: '#ef4444' },
  { level: 2, label: 'Developing', description: 'Basic controls defined but inconsistently applied', color: '#f97316' },
  { level: 3, label: 'Defined', description: 'Standardized processes documented and followed', color: '#eab308' },
  { level: 4, label: 'Managed', description: 'Metrics-driven, proactive risk management', color: '#3b82f6' },
  { level: 5, label: 'Optimized', description: 'Continuous improvement, industry leadership', color: '#22c55e' },
];

const domainDetails: Record<string, { score: number; controls: string[]; gaps: string[]; recommendations: string[] }> = {
  'Governance': {
    score: 3.8,
    controls: ['Information Security Policy', 'IS Management Committee', 'Security KPIs Dashboard'],
    gaps: ['IS governance metrics not yet automated', 'Board-level cyber reporting quarterly only'],
    recommendations: ['Automate IS KPI reporting', 'Increase board reporting to monthly', 'Define IS governance maturity targets'],
  },
  'Risk Management': {
    score: 3.2,
    controls: ['Risk register maintained', 'Quarterly risk reviews', 'Risk treatment plans'],
    gaps: ['No automated risk scoring', 'Third-party risk not fully integrated', 'No real-time risk dashboards'],
    recommendations: ['Implement automated risk scoring', 'Integrate vendor risk into main register', 'Deploy real-time risk monitoring'],
  },
  'Identity & Access': {
    score: 3.5,
    controls: ['MFA deployed', 'Access reviews quarterly', 'RBAC implemented'],
    gaps: ['PAM not yet deployed for all privileged accounts', 'Joiners/movers/leavers process partially automated'],
    recommendations: ['Complete PAM deployment (Q3 2026)', 'Automate ILM processes fully'],
  },
  'Security Operations': {
    score: 3.1,
    controls: ['SIEM deployed', 'EDR on 95% endpoints', 'SOC monitoring 24/7'],
    gaps: ['Vulnerability scanning not covering all systems', 'Alert triage partially manual', 'No SOAR platform'],
    recommendations: ['Deploy full vulnerability management', 'Implement SOAR', 'Tune SIEM rules to reduce false positives'],
  },
};

export function CyberMaturity() {
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  const globalScore = mockMaturityDomains.reduce((s, d) => s + d.score * d.weight, 0) / mockMaturityDomains.reduce((s, d) => s + d.weight, 0);
  const radarData = mockMaturityDomains.map((d) => ({ domain: d.domain, score: d.score, target: d.target }));
  const detail = selectedDomain ? domainDetails[selectedDomain] : null;

  const getColor = (score: number) => {
    if (score >= 4.5) return '#22c55e';
    if (score >= 3.5) return '#3b82f6';
    if (score >= 2.5) return '#eab308';
    if (score >= 1.5) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Cyber Maturity Assessment"
        subtitle="Detailed maturity evaluation across 9 security domains based on CGEF framework"
        breadcrumb={[{ label: 'Security' }, { label: 'Cyber Maturity' }]}
        actions={
          <button className="btn btn-primary btn-sm">
            <Shield className="w-3.5 h-3.5" />
            Start Assessment
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Global Maturity Score" value={globalScore.toFixed(1)} unit="/ 5.0" trend={0.3} trendLabel="vs Q1 2026" icon={<Shield className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Target Score" value="4.0" unit="/ 5.0" sublabel="by Q4 2026" icon={<Target className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Domains at Target" value={mockMaturityDomains.filter(d => d.score >= d.target - 0.5).length} sublabel={`of ${mockMaturityDomains.length} domains`} icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" />
        <MetricCard label="Improvement YTD" value="+0.3" sublabel="maturity points" icon={<TrendingUp className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" />
      </div>

      {/* Maturity level legend */}
      <div className="flex gap-3 flex-wrap mb-6">
        {maturityLevels.map((m) => (
          <div key={m.level} className="flex items-center gap-2 text-xs">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: m.color }} />
            <span className="text-slate-400">{m.level} — {m.label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Radar */}
        <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Maturity Radar</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="domain" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Radar name="Target" dataKey="target" stroke="#1d4ed8" fill="#3b82f6" fillOpacity={0.06} strokeWidth={1} strokeDasharray="4 4" />
                <Radar name="Current" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Domain bars */}
        <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Domain Breakdown</h3>
          <div className="space-y-3.5">
            {mockMaturityDomains.map((d) => (
              <div
                key={d.domain}
                className={`cursor-pointer rounded-lg p-3 transition-colors ${selectedDomain === d.domain ? 'bg-brand-500/10 border border-brand-500/20' : 'hover:bg-white/4'}`}
                onClick={() => setSelectedDomain(selectedDomain === d.domain ? null : d.domain)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-300 font-medium">{d.domain}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">Target: {d.target}</span>
                    <span className="text-sm font-bold" style={{ color: getColor(d.score) }}>{d.score.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div key={level} className="flex-1 h-2 rounded-sm transition-all" style={{ backgroundColor: level <= d.score ? getColor(d.score) : 'rgba(255,255,255,0.08)' }} />
                  ))}
                </div>
                {selectedDomain === d.domain && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-brand-400">
                    <ChevronRight className="w-3 h-3" /> View details below
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Domain detail */}
      {selectedDomain && detail && (
        <div className="bg-surface-850 rounded-xl border border-brand-500/20 p-5 animate-fade-in">
          <h3 className="text-sm font-semibold text-slate-200 mb-4">{selectedDomain} — Detailed Assessment</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wide mb-2">Implemented Controls</h4>
              <ul className="space-y-1.5">
                {detail.controls.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400 mt-0.5">✓</span>{c}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">Identified Gaps</h4>
              <ul className="space-y-1.5">
                {detail.gaps.map((g) => (
                  <li key={g} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-amber-400 mt-0.5">△</span>{g}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-brand-400 uppercase tracking-wide mb-2">Recommendations</h4>
              <ul className="space-y-1.5">
                {detail.recommendations.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-brand-400 mt-0.5">→</span>{r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
