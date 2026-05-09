import { useState } from 'react';
import { Building2, Plus, Search, TrendingDown, Users, ChartBar as BarChart2 } from 'lucide-react';
import { mockOrganizations } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { FrameworkBadge, RiskBadge } from '../components/ui/StatusBadge';

export function ClientsOrganisations() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const filtered = mockOrganizations.filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()));

  const avgScore = Math.round(mockOrganizations.reduce((s, o) => s + o.cyberScore, 0) / mockOrganizations.length);
  const highRisk = mockOrganizations.filter((o) => o.riskLevel === 'High').length;

  return (
    <div className="page-container">
      <PageHeader
        title="Clients & Organisations"
        subtitle="Portfolio view of all client engagements and cyber posture scores"
        breadcrumb={[{ label: 'Management' }, { label: 'Clients & Organisations' }]}
        actions={
          <div className="flex gap-2">
            <div className="flex border border-white/10 rounded-lg overflow-hidden">
              {(['grid', 'list'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-200'}`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm"><Plus className="w-3.5 h-3.5" />Add Client</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Clients" value={mockOrganizations.length} sublabel="organisations" icon={<Building2 className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Avg. Cyber Score" value={`${avgScore}%`} trend={3} trendLabel="portfolio avg" icon={<BarChart2 className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="High Risk Clients" value={highRisk} sublabel="require attention" icon={<TrendingDown className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
        <MetricCard label="Consultants Active" value={3} sublabel="assigned" icon={<Users className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 h-9 text-sm" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} clients</span>
      </div>

      {view === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((org) => (
            <div key={org.id} className="bg-surface-850 rounded-xl border border-white/8 p-5 hover:border-white/15 hover:bg-surface-800 transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-400">
                    {org.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{org.name}</h3>
                    <p className="text-xs text-slate-500">{org.sector} · {org.size}</p>
                  </div>
                </div>
                <RiskBadge severity={org.riskLevel.toLowerCase() as 'high' | 'medium' | 'low' | 'critical'} />
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400">Cyber Score</span>
                  <span className="text-sm font-bold text-slate-200">{org.cyberScore}%</span>
                </div>
                <ProgressBar value={org.cyberScore} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {org.frameworks.slice(0, 3).map((f) => <FrameworkBadge key={f} framework={f} />)}
                {org.frameworks.length > 3 && <span className="text-xs text-slate-500">+{org.frameworks.length - 3}</span>}
              </div>

              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Consultant: <span className="text-slate-300">{org.consultant.split(' ')[0]}</span></span>
                <span className="text-slate-500">Last active: <span className="text-slate-300">{new Date(org.lastActivity).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'list' && (
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-800 border-b border-white/8">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Organisation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Sector</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Cyber Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Risk Level</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Frameworks</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Consultant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr key={org.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">{org.name.charAt(0)}</div>
                      <div><p className="font-medium text-slate-200">{org.name}</p><p className="text-xs text-slate-500">{org.size}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{org.sector}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/8 rounded-full overflow-hidden"><div className="h-full rounded-full bg-brand-500" style={{ width: `${org.cyberScore}%` }} /></div>
                      <span className="text-sm font-bold text-slate-200">{org.cyberScore}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RiskBadge severity={org.riskLevel.toLowerCase() as 'high' | 'medium' | 'low' | 'critical'} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><div className="flex gap-1 flex-wrap">{org.frameworks.slice(0, 2).map(f => <FrameworkBadge key={f} framework={f} />)}{org.frameworks.length > 2 && <span className="text-xs text-slate-500">+{org.frameworks.length - 2}</span>}</div></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{org.consultant.split(' ')[0]}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{new Date(org.lastActivity).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
