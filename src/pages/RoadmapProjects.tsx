import { useState } from 'react';
import { Map, Plus, Search, TrendingUp, Calendar } from 'lucide-react';
import { mockProjects } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';

const categoryColors: Record<string, string> = {
  Compliance: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  Security: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  Regulatory: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  Architecture: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20',
  Cloud: 'bg-sky-500/15 text-sky-400 border border-sky-500/20',
  Training: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

const priorityColors: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-slate-500',
};

export function RoadmapProjects() {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState<'board' | 'list'>('board');

  const filtered = mockProjects.filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()));

  const inProgress = mockProjects.filter((p) => p.status === 'in_progress').length;
  const planning = mockProjects.filter((p) => p.status === 'planning').length;
  const totalBudget = mockProjects.reduce((s, p) => s + p.budget, 0);
  const avgProgress = Math.round(mockProjects.filter(p => p.status === 'in_progress').reduce((s, p) => s + p.progress, 0) / inProgress);

  return (
    <div className="page-container">
      <PageHeader
        title="Roadmap & Projects"
        subtitle="Strategic cyber security initiatives, budget tracking, and delivery timeline"
        breadcrumb={[{ label: 'Planning' }, { label: 'Roadmap & Projects' }]}
        actions={
          <div className="flex gap-2">
            <div className="flex border border-white/10 rounded-lg overflow-hidden">
              {(['board', 'list'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-200'}`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <Plus className="w-3.5 h-3.5" />
              New Initiative
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Initiatives" value={inProgress} sublabel="in progress" icon={<Map className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Avg. Progress" value={`${avgProgress}%`} trend={8} trendLabel="vs Q1" icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="In Planning" value={planning} sublabel="upcoming" icon={<Calendar className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" />
        <MetricCard label="Total Budget" value={`€${(totalBudget / 1000).toFixed(0)}K`} sublabel="approved 2026" icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" />
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input className="input pl-9 h-9 text-sm max-w-xs" placeholder="Search initiatives..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {view === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className={`bg-surface-850 rounded-xl border-l-2 border border-white/8 ${priorityColors[p.priority]} hover:border-white/15 transition-all cursor-pointer p-5`}>
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${categoryColors[p.category] ?? 'bg-slate-500/15 text-slate-400 border border-slate-500/20'}`}>
                  {p.category}
                </span>
                <StatusBadge status={p.status} size="sm" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1 leading-snug">{p.title}</h3>
              <p className="text-xs text-slate-500 mb-3">Owner: {p.owner.split(' ')[0]} · {new Date(p.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</p>
              <ProgressBar value={p.progress} size="sm" showLabel className="mb-3" />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/4 rounded-lg p-2 text-center">
                  <p className="text-slate-300 font-semibold">€{(p.budget / 1000).toFixed(0)}K</p>
                  <p className="text-slate-500">Budget</p>
                </div>
                <div className="bg-white/4 rounded-lg p-2 text-center">
                  <p className="text-emerald-400 font-semibold">{p.maturityImpact}</p>
                  <p className="text-slate-500">Maturity</p>
                </div>
                <div className="bg-white/4 rounded-lg p-2 text-center">
                  <p className="text-brand-400 font-semibold text-[10px] leading-tight">{p.complianceImpact.split(' ')[0]}</p>
                  <p className="text-slate-500">Compliance</p>
                </div>
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Initiative</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Progress</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Maturity Impact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">End Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{p.title}</p>
                    <p className="text-xs text-slate-500">{p.owner.split(' ')[0]}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${categoryColors[p.category] ?? 'bg-slate-500/15 text-slate-400 border border-slate-500/20'}`}>
                      {p.category}
                    </span>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} size="sm" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell w-32"><ProgressBar value={p.progress} size="sm" showLabel /></td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-300">€{(p.budget / 1000).toFixed(0)}K</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm font-semibold text-emerald-400">{p.maturityImpact}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-400">{new Date(p.endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Strategic Initiative" size="lg"
        actions={<><button className="btn btn-outline btn-sm" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary btn-sm">Create Initiative</button></>}
      >
        <div className="space-y-4">
          <div><label className="label">Initiative Title</label><input className="input" placeholder="e.g., Zero Trust Architecture Migration" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Category</label>
              <select className="select"><option>Compliance</option><option>Security</option><option>Regulatory</option><option>Architecture</option><option>Cloud</option><option>Training</option></select>
            </div>
            <div><label className="label">Priority</label>
              <select className="select"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Start Date</label><input type="date" className="input" /></div>
            <div><label className="label">End Date</label><input type="date" className="input" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Budget (€)</label><input type="number" className="input" placeholder="0" /></div>
            <div><label className="label">Owner</label><input className="input" placeholder="Initiative owner" /></div>
          </div>
          <div><label className="label">Expected Maturity Impact</label><input className="input" placeholder="e.g., +0.8" /></div>
        </div>
      </Modal>
    </div>
  );
}
