import { useState } from 'react';
import { SquareCheck as CheckSquare, Plus, Search, Star } from 'lucide-react';
import { mockControls } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge, FrameworkBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';

const domains = ['All Domains', ...Array.from(new Set(mockControls.map((c) => c.domain)))];
const statuses = ['All', 'implemented', 'partial', 'not_implemented'];

function EffectivenessStars({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map((i) => (
        <Star key={i} className={`w-3 h-3 ${i <= level ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`} />
      ))}
    </div>
  );
}

export function ControlsLibrary() {
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('All Domains');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState<typeof mockControls[0] | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = mockControls.filter((c) => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (domain !== 'All Domains' && c.domain !== domain) return false;
    if (status !== 'All' && c.status !== status) return false;
    return true;
  });

  const implemented = mockControls.filter((c) => c.status === 'implemented').length;
  const partial = mockControls.filter((c) => c.status === 'partial').length;
  const coverage = Math.round((implemented / mockControls.length) * 100);

  return (
    <div className="page-container">
      <PageHeader
        title="Controls Library"
        subtitle="Security controls mapped to multiple regulatory frameworks"
        breadcrumb={[{ label: 'Security' }, { label: 'Controls Library' }]}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add Control
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Controls" value={mockControls.length} sublabel="in library" icon={<CheckSquare className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Implemented" value={implemented} sublabel={`${coverage}% coverage`} icon={<CheckSquare className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Partial" value={partial} sublabel="in progress" icon={<CheckSquare className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
        <MetricCard label="Control Coverage" value={`${coverage}%`} trend={3} trendLabel="vs Q1" icon={<CheckSquare className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" />
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 h-9 text-sm" placeholder="Search controls..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select h-9 text-sm w-auto min-w-[140px]" value={domain} onChange={(e) => setDomain(e.target.value)}>
          {domains.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="select h-9 text-sm w-auto min-w-[140px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          {statuses.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s === 'implemented' ? 'Implemented' : s === 'partial' ? 'Partial' : 'Not Implemented'}</option>)}
        </select>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} controls</span>
      </div>

      <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-800 border-b border-white/8">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Control</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Domain</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Effectiveness</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Frameworks</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">Next Review</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setSelected(c)}>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-200">{c.title}</p>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{c.domain}</td>
                <td className="px-4 py-3"><StatusBadge status={c.status} size="sm" /></td>
                <td className="px-4 py-3 hidden md:table-cell"><EffectivenessStars level={c.effectiveness} /></td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {c.frameworks.slice(0, 2).map((f) => <FrameworkBadge key={f} framework={f} />)}
                    {c.frameworks.length > 2 && <span className="text-xs text-slate-500">+{c.frameworks.length - 2}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{c.owner.split(' ')[0]}</td>
                <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-400">{new Date(c.nextReview).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-12 text-slate-500 text-sm">No controls match your filters.</div>}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-lg bg-surface-850 border-l border-white/8 flex flex-col shadow-modal">
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-500">{selected.id}</span>
                  <StatusBadge status={selected.status} size="sm" />
                </div>
                <h2 className="text-base font-semibold text-slate-100">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost btn-icon ml-3 flex-shrink-0">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/4 rounded-lg p-3"><p className="text-xs text-slate-500 mb-0.5">Domain</p><p className="text-sm font-medium text-slate-200">{selected.domain}</p></div>
                <div className="bg-white/4 rounded-lg p-3"><p className="text-xs text-slate-500 mb-0.5">Owner</p><p className="text-sm font-medium text-slate-200">{selected.owner.split(' ')[0]}</p></div>
                <div className="bg-white/4 rounded-lg p-3"><p className="text-xs text-slate-500 mb-0.5">Last Review</p><p className="text-sm font-medium text-slate-200">{new Date(selected.lastReview).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p></div>
                <div className="bg-white/4 rounded-lg p-3"><p className="text-xs text-slate-500 mb-0.5">Next Review</p><p className="text-sm font-medium text-slate-200">{new Date(selected.nextReview).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p></div>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Effectiveness</p>
                <EffectivenessStars level={selected.effectiveness} />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Framework Mapping</p>
                <div className="flex gap-2 flex-wrap">
                  {selected.frameworks.map((f) => <FrameworkBadge key={f} framework={f} />)}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-white/8 flex gap-2">
              <button className="btn btn-secondary btn-sm flex-1">Edit Control</button>
              <button className="btn btn-outline btn-sm">Link Evidence</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Control" size="lg"
        actions={<><button className="btn btn-outline btn-sm" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary btn-sm">Create Control</button></>}
      >
        <div className="space-y-4">
          <div><label className="label">Control Title</label><input className="input" placeholder="e.g., Multi-Factor Authentication for Privileged Accounts" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Domain</label><select className="select">{domains.slice(1).map(d => <option key={d}>{d}</option>)}</select></div>
            <div><label className="label">Owner</label><input className="input" placeholder="Control owner" /></div>
          </div>
          <div><label className="label">Implementation Status</label>
            <select className="select">
              <option value="not_implemented">Not Implemented</option>
              <option value="partial">Partial</option>
              <option value="implemented">Implemented</option>
            </select>
          </div>
          <div><label className="label">Framework Mapping</label>
            <div className="grid grid-cols-3 gap-2">
              {['ISO 27001', 'NIS2', 'DORA', 'RGPD', 'NIST CSF', 'CIS Controls', 'SOC 2'].map((f) => (
                <label key={f} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input type="checkbox" className="accent-brand-500" />{f}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
