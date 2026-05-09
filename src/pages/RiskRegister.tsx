import { useState } from 'react';
import { TriangleAlert as AlertTriangle, Plus, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { mockRisks } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { RiskBadge, StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { MetricCard } from '../components/ui/MetricCard';

const domains = ['All Domains', ...Array.from(new Set(mockRisks.map((r) => r.domain)))];
const severities = ['All', 'critical', 'high', 'medium', 'low'];
const statuses = ['All', 'open', 'mitigating', 'accepted', 'closed'];

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'increasing') return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
  if (trend === 'decreasing') return <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function ScoreCell({ score, max = 25 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 60 ? '#ef4444' : pct >= 40 ? '#f97316' : pct >= 20 ? '#eab308' : '#22c55e';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{score}</span>
    </div>
  );
}

export function RiskRegister() {
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('All Domains');
  const [severity, setSeverity] = useState('All');
  const [status, setStatus] = useState('All');
  const [selected, setSelected] = useState<typeof mockRisks[0] | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = mockRisks.filter((r) => {
    if (search && !r.title.toLowerCase().includes(search.toLowerCase()) && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (domain !== 'All Domains' && r.domain !== domain) return false;
    if (severity !== 'All' && r.severity !== severity) return false;
    if (status !== 'All' && r.status !== status) return false;
    return true;
  });

  const critical = mockRisks.filter((r) => r.severity === 'critical').length;
  const high = mockRisks.filter((r) => r.severity === 'high').length;

  return (
    <div className="page-container">
      <PageHeader
        title="Risk Register"
        subtitle="Centralized inventory of information security and cyber risks"
        breadcrumb={[{ label: 'Security' }, { label: 'Risk Register' }]}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" />
            Add Risk
          </button>
        }
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Risks" value={mockRisks.length} sublabel={`${mockRisks.filter(r => r.status === 'open').length} open`} icon={<AlertTriangle className="w-4 h-4 text-slate-400" />} iconBg="bg-slate-500/15" />
        <MetricCard label="Critical" value={critical} sublabel="require immediate action" icon={<AlertTriangle className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
        <MetricCard label="High" value={high} sublabel="action plan active" icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} iconBg="bg-orange-500/15" variant="warning" />
        <MetricCard label="Avg Residual Score" value="7.3" sublabel="target < 5.0" icon={<TrendingDown className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 h-9 text-sm" placeholder="Search risks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select h-9 text-sm w-auto min-w-[140px]" value={domain} onChange={(e) => setDomain(e.target.value)}>
          {domains.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="select h-9 text-sm w-auto min-w-[120px]" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          {severities.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Severities' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select className="select h-9 text-sm w-auto min-w-[120px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          {statuses.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} risks</span>
      </div>

      {/* Risk Table */}
      <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-800 border-b border-white/8">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">ID</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Risk</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Domain</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Severity</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Inherent</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Residual</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Trend</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Owner</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Due Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                onClick={() => setSelected(r)}
              >
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.id}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-200 leading-tight">{r.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 hidden lg:block truncate max-w-xs">{r.asset}</p>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs text-slate-400">{r.domain}</span>
                </td>
                <td className="px-4 py-3"><RiskBadge severity={r.severity} /></td>
                <td className="px-4 py-3 hidden md:table-cell"><ScoreCell score={r.inherentScore} /></td>
                <td className="px-4 py-3"><ScoreCell score={r.residualScore} /></td>
                <td className="px-4 py-3"><StatusBadge status={r.status} size="sm" /></td>
                <td className="px-4 py-3 hidden lg:table-cell"><TrendIcon trend={r.trend} /></td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{r.owner.split(' ')[0]}</td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{new Date(r.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">No risks match your filters.</div>
        )}
      </div>

      {/* Risk Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-xl bg-surface-850 border-l border-white/8 flex flex-col shadow-modal">
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-500">{selected.id}</span>
                  <RiskBadge severity={selected.severity} />
                  <StatusBadge status={selected.status} size="sm" />
                </div>
                <h2 className="text-base font-semibold text-slate-100">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost btn-icon ml-3 flex-shrink-0">
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Category', value: selected.category },
                  { label: 'Domain', value: selected.domain },
                  { label: 'Owner', value: selected.owner },
                  { label: 'Asset', value: selected.asset },
                  { label: 'Likelihood', value: `${selected.likelihood} / 5` },
                  { label: 'Impact', value: `${selected.impact} / 5` },
                  { label: 'Inherent Score', value: selected.inherentScore },
                  { label: 'Residual Score', value: selected.residualScore },
                  { label: 'Treatment', value: selected.treatment.charAt(0).toUpperCase() + selected.treatment.slice(1) },
                  { label: 'Due Date', value: new Date(selected.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) },
                ].map((f) => (
                  <div key={f.label} className="bg-white/4 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-slate-200">{f.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Linked Controls</h4>
                <div className="flex gap-2 flex-wrap">
                  {selected.controls.map((c) => (
                    <span key={c} className="text-xs bg-brand-500/15 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-md font-mono">{c}</span>
                  ))}
                  {selected.controls.length === 0 && <span className="text-xs text-slate-500">No controls linked</span>}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Last Reviewed</h4>
                <p className="text-sm text-slate-400">{new Date(selected.lastReviewed).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-white/8 flex gap-2">
              <button className="btn btn-secondary btn-sm flex-1">Edit Risk</button>
              <button className="btn btn-outline btn-sm">Treatment Plan</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add New Risk" size="lg"
        actions={<><button className="btn btn-outline btn-sm" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary btn-sm">Create Risk</button></>}
      >
        <div className="space-y-4">
          <div><label className="label">Risk Title</label><input className="input" placeholder="e.g., Unauthorized access to production database" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Domain</label><select className="select">{domains.slice(1).map(d => <option key={d}>{d}</option>)}</select></div>
            <div><label className="label">Category</label><select className="select"><option>Cyber Threat</option><option>Regulatory</option><option>Third-Party Risk</option><option>Operational</option></select></div>
          </div>
          <div><label className="label">Description</label><textarea className="input resize-none" rows={3} placeholder="Describe the risk scenario, root causes and potential impact..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Likelihood (1–5)</label><input type="number" className="input" min={1} max={5} defaultValue={3} /></div>
            <div><label className="label">Impact (1–5)</label><input type="number" className="input" min={1} max={5} defaultValue={3} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Owner</label><input className="input" placeholder="Risk owner name" /></div>
            <div><label className="label">Due Date</label><input type="date" className="input" /></div>
          </div>
          <div><label className="label">Treatment</label>
            <div className="grid grid-cols-4 gap-2">
              {['Mitigate', 'Accept', 'Transfer', 'Avoid'].map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer">
                  <input type="radio" name="treatment" value={t.toLowerCase()} className="accent-brand-500" />{t}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
