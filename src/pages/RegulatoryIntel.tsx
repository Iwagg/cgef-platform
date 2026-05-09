import { useState } from 'react';
import { Bell, Calendar, ExternalLink, Clock, Globe, TrendingUp, TriangleAlert as AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';

interface RegAlert {
  id: string;
  framework: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  deadline?: string;
  sourceUrl?: string;
  isNew: boolean;
  date: string;
}

interface Deadline {
  id: string;
  title: string;
  framework: string;
  date: string;
  daysLeft: number;
  type: 'reporting' | 'implementation' | 'audit';
}

const frameworkColors: Record<string, string> = {
  'NIS2': 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  'DORA': 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  'RGPD': 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  'ISO 27001': 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  'NIST CSF': 'bg-slate-500/15 text-slate-400 border border-slate-500/20',
};

const ALERTS: RegAlert[] = [
  { id: '1', framework: 'NIS2', title: 'NIS2 Annual Report — Deadline Approaching', description: 'Essential and important entities must submit their annual NIS2 compliance report to their national authority before 30 June 2026. Failure to comply may result in administrative sanctions.', severity: 'high', deadline: '2026-06-30', sourceUrl: 'https://www.enisa.europa.eu', isNew: true, date: '2026-04-01' },
  { id: '2', framework: 'DORA', title: 'DORA — Major ICT Incident Reporting Now Mandatory', description: 'Since 17 January 2025, DORA is fully applicable. Financial entities must report major ICT incidents to their competent authority within defined timeframes: initial notification within 4 hours of classification.', severity: 'high', sourceUrl: 'https://www.eba.europa.eu', isNew: false, date: '2026-01-17' },
  { id: '3', framework: 'DORA', title: 'DORA TLPT — Threat-Led Penetration Testing Obligations', description: 'Significant financial entities must plan and conduct their first TLPT (Threat-Led Penetration Testing) cycle before end of 2026 in accordance with Article 26 of DORA. Coordination with authorities required.', severity: 'medium', deadline: '2026-12-31', isNew: true, date: '2026-03-15' },
  { id: '4', framework: 'RGPD', title: 'CNIL — Updated Cookie Consent Guidelines', description: 'The CNIL has published updated guidelines on cookie consent interfaces. Organisations must ensure their consent banners meet the new technical and UX requirements. Enforcement begins Q3 2026.', severity: 'medium', isNew: false, date: '2026-02-20' },
  { id: '5', framework: 'ISO 27001', title: 'ISO 27001:2022 — All Certifications Must Be on New Version', description: 'The transition period to ISO 27001:2022 ended October 2025. All certified organisations must now operate under the 2022 version. Upcoming audits will exclusively assess against the new controls annex.', severity: 'high', isNew: false, date: '2026-01-01' },
  { id: '6', framework: 'NIS2', title: 'NIS2 — Significant Incident Notification Timelines', description: 'Reminder: significant incidents must be notified to the competent authority within 24h (early warning), 72h (initial notification), and 1 month (final report). Supply chain incidents are also in scope.', severity: 'medium', isNew: false, date: '2026-03-01' },
  { id: '7', framework: 'NIST CSF', title: 'NIST CSF 2.0 — Governance Function Added', description: 'NIST Cybersecurity Framework 2.0 introduces a new "Govern" function covering risk management strategy, supply chain risk, and organisational context. Organisations aligned to NIST CSF should update their control mappings.', severity: 'low', isNew: true, date: '2026-02-26' },
];

function getDeadlines(): Deadline[] {
  const today = new Date();
  const deadlines = [
    { id: 'd1', title: 'NIS2 Annual Compliance Report', framework: 'NIS2', date: '2026-06-30', type: 'reporting' as const },
    { id: 'd2', title: 'DORA TLPT First Cycle', framework: 'DORA', date: '2026-12-31', type: 'audit' as const },
    { id: 'd3', title: 'DORA Critical Third-Party Annual Review', framework: 'DORA', date: '2026-09-30', type: 'reporting' as const },
    { id: 'd4', title: 'RGPD — Annual Data Processing Review', framework: 'RGPD', date: '2026-12-31', type: 'implementation' as const },
    { id: 'd5', title: 'ISO 27001 Surveillance Audit', framework: 'ISO 27001', date: '2026-10-15', type: 'audit' as const },
  ];
  return deadlines.map((d) => {
    const target = new Date(d.date);
    const daysLeft = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { ...d, daysLeft };
  }).filter((d) => d.daysLeft > 0).sort((a, b) => a.daysLeft - b.daysLeft);
}

const typeLabel: Record<string, string> = { reporting: 'Reporting', implementation: 'Implementation', audit: 'Audit' };
const sevBorderColor: Record<string, string> = { high: 'border-l-red-500', medium: 'border-l-amber-500', low: 'border-l-emerald-500' };

export function RegulatoryIntel() {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const deadlines = getDeadlines();
  const filtered = ALERTS.filter((a) => filter === 'all' || a.severity === filter);
  const newCount = ALERTS.filter((a) => a.isNew).length;
  const highCount = ALERTS.filter((a) => a.severity === 'high').length;
  const nextDeadline = deadlines[0];

  return (
    <div className="page-container">
      <PageHeader
        title="Regulatory Intelligence"
        subtitle="Live regulatory alerts and compliance deadlines for NIS2, DORA, ISO 27001, RGPD, and more"
        breadcrumb={[{ label: 'Compliance' }, { label: 'Regulatory Intelligence' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Alerts" value={ALERTS.length} sublabel={`${highCount} critical`} icon={<Bell className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
        <MetricCard label="New This Week" value={newCount} sublabel="recently published" icon={<TrendingUp className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Next Deadline" value={nextDeadline ? `D-${nextDeadline.daysLeft}` : '—'} sublabel={nextDeadline?.title.slice(0, 22) || 'No upcoming'} icon={<Calendar className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
        <MetricCard label="Frameworks Monitored" value={7} sublabel="ISO, NIS2, DORA, RGPD..." icon={<Globe className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-slate-200">Regulatory Alerts</h2>
            <div className="flex gap-1.5">
              {(['all', 'high', 'medium', 'low'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${filter === f ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((alert) => (
              <div key={alert.id} className={`bg-surface-850 rounded-xl border border-white/8 border-l-2 ${sevBorderColor[alert.severity]} overflow-hidden`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${frameworkColors[alert.framework] ?? 'bg-slate-500/15 text-slate-400 border border-slate-500/20'}`}>
                          {alert.framework}
                        </span>
                        {alert.severity === 'high' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/15 text-red-400 border border-red-500/20">
                            <AlertTriangle className="w-3 h-3" /> Critical
                          </span>
                        )}
                        {alert.isNew && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-brand-500/15 text-brand-400 border border-brand-500/20">New</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-200 text-sm mb-1">{alert.title}</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>
                      <div className="flex items-center gap-4 mt-2.5 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {alert.deadline && (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Calendar className="w-3 h-3" />
                            Deadline: {new Date(alert.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>
                    {alert.sourceUrl && (
                      <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-brand-400 flex-shrink-0 transition-colors mt-0.5">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="bg-surface-850 border border-white/8 rounded-xl text-center py-12 text-slate-500 text-sm">No alerts for this filter.</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Upcoming Deadlines</h2>
          <div className="space-y-2.5">
            {deadlines.map((d) => {
              const urgent = d.daysLeft <= 30;
              const soon = d.daysLeft <= 90;
              return (
                <div key={d.id} className={`bg-surface-850 rounded-xl border border-white/8 border-l-2 overflow-hidden ${urgent ? 'border-l-red-500' : soon ? 'border-l-amber-500' : 'border-l-emerald-500'}`}>
                  <div className="p-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mb-1 ${frameworkColors[d.framework] ?? 'bg-slate-500/15 text-slate-400 border border-slate-500/20'}`}>
                        {d.framework}
                      </span>
                      <p className="text-xs font-medium text-slate-200 leading-snug">{d.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · {typeLabel[d.type]}
                      </p>
                    </div>
                    <div className={`text-right flex-shrink-0 ${urgent ? 'text-red-400' : soon ? 'text-amber-400' : 'text-emerald-400'}`}>
                      <p className="text-base font-bold leading-tight">D-{d.daysLeft}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/8">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Monitored Sources</p>
            </div>
            <div className="p-3">
              {[{ name: 'ANSSI', url: 'ssi.gouv.fr' }, { name: 'ENISA', url: 'enisa.europa.eu' }, { name: 'EUR-Lex', url: 'eur-lex.europa.eu' }, { name: 'CNIL', url: 'cnil.fr' }, { name: 'EBA / ESMA', url: 'eba.europa.eu' }, { name: 'ISO / IEC', url: 'iso.org' }].map((s) => (
                <div key={s.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-slate-300 font-medium">{s.name}</span>
                  <span className="text-xs text-slate-500">{s.url}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
