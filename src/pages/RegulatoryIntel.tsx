import { useEffect, useState } from 'react';
import { Bell, Calendar, ExternalLink, Clock, Globe, TrendingUp, TriangleAlert as AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { supabase } from '../lib/supabase';
import type { RegulatoryAlertRow, RegulatoryDeadlineRow } from '../lib/db-types';

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

function toDeadline(r: RegulatoryDeadlineRow): Deadline {
  const daysLeft = Math.ceil((new Date(r.deadline_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return { id: r.id, title: r.title, framework: r.framework_id, date: r.deadline_date, daysLeft, type: (r.event_type as Deadline['type']) ?? 'reporting' };
}

function toAlert(r: RegulatoryAlertRow): RegAlert {
  return {
    id: r.id, framework: r.framework_id, title: r.title, description: r.description ?? '', severity: r.severity,
    deadline: r.deadline ?? undefined, sourceUrl: r.source_url ?? undefined, date: r.published_at,
    isNew: Date.now() - new Date(r.published_at).getTime() < 30 * 24 * 60 * 60 * 1000,
  };
}

const typeLabel: Record<string, string> = { reporting: 'Reporting', implementation: 'Implementation', audit: 'Audit' };
const sevBorderColor: Record<string, string> = { high: 'border-l-red-500', medium: 'border-l-amber-500', low: 'border-l-emerald-500' };

export function RegulatoryIntel() {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [ALERTS, setAlerts] = useState<RegAlert[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  useEffect(() => {
    const todayIso = new Date().toISOString().slice(0, 10);
    supabase.from('regulatory_alerts').select('*').order('published_at', { ascending: false })
      .then(({ data }) => setAlerts(((data ?? []) as RegulatoryAlertRow[]).map(toAlert)));
    supabase.from('regulatory_calendars').select('*').gte('deadline_date', todayIso).order('deadline_date')
      .then(({ data }) => setDeadlines(((data ?? []) as RegulatoryDeadlineRow[]).map(toDeadline)));
  }, []);
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
        <MetricCard label="New (30 days)" value={newCount} sublabel="recently published" icon={<TrendingUp className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Next Deadline" value={nextDeadline ? `D-${nextDeadline.daysLeft}` : '—'} sublabel={nextDeadline?.title.slice(0, 22) || 'No upcoming'} icon={<Calendar className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
        <MetricCard label="Frameworks Monitored" value={new Set(ALERTS.map((a) => a.framework)).size} sublabel="with active alerts" icon={<Globe className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
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
