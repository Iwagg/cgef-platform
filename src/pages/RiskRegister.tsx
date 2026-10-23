import { useMemo, useState } from 'react';
import { TriangleAlert as AlertTriangle, Plus, Search, TrendingUp, TrendingDown, Minus, CreditCard as Edit } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { RiskBadge, StatusBadge } from '../components/ui/StatusBadge';
import { Modal, Drawer } from '../components/ui/Modal';
import { MetricCard } from '../components/ui/MetricCard';
import { Field, SubmitButton, DeleteButton, EmptyState, LoadingState, DetailGrid } from '../components/ui/Form';
import { useAction } from '../hooks/useAction';
import { useOrgTable } from '../hooks/useOrgTable';
import type { Risk } from '../lib/db-types';
import { fmtDate, firstName, capitalize, today } from '../lib/format';

const DOMAINS = ['Governance', 'Risk Management', 'Asset Management', 'Identity & Access', 'Security Operations',
  'Incident Response', 'Business Continuity', 'Third Party Risk', 'Data Protection', 'Cloud Security', 'Compliance'];
const CATEGORIES = ['Cyber Threat', 'Regulatory', 'Third-Party Risk', 'Operational', 'Identity & Access', 'Data Protection'];
const severities = ['All', 'critical', 'high', 'medium', 'low'];
const statuses = ['All', 'open', 'mitigating', 'accepted', 'closed'];

const emptyRisk: Partial<Risk> = {
  title: '', description: '', domain: DOMAINS[0], category: CATEGORIES[0], owner: '', asset: '',
  likelihood: 3, impact: 3, residual_score: null, status: 'open', treatment: 'mitigate', trend: 'stable',
  due_date: null, control_refs: [],
};

function TrendIcon({ trend }: { trend: string }) {
  if (trend === 'increasing') return <TrendingUp className="w-3.5 h-3.5 text-red-400" />;
  if (trend === 'decreasing') return <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-500" />;
}

function ScoreCell({ score, max = 25 }: { score: number | null; max?: number }) {
  if (score == null) return <span className="text-xs text-slate-600">—</span>;
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
  const { rows: risks, loading, create, update, remove } = useOrgTable<Risk>('risks', { orderBy: 'ref', ascending: true });
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('All Domains');
  const [severity, setSeverity] = useState('All');
  const [status, setStatus] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Risk>>(emptyRisk);
  const { pending, run } = useAction();

  const selected = risks.find((r) => r.id === selectedId) ?? null;
  const domains = useMemo(() => ['All Domains', ...Array.from(new Set(risks.map((r) => r.domain).filter(Boolean) as string[]))], [risks]);

  const filtered = risks.filter((r) => {
    const q = search.toLowerCase();
    if (q && !r.title.toLowerCase().includes(q) && !r.ref.toLowerCase().includes(q)) return false;
    if (domain !== 'All Domains' && r.domain !== domain) return false;
    if (severity !== 'All' && r.severity !== severity) return false;
    if (status !== 'All' && r.status !== status) return false;
    return true;
  });

  const active = risks.filter((r) => r.status !== 'closed');
  const critical = active.filter((r) => r.severity === 'critical').length;
  const high = active.filter((r) => r.severity === 'high').length;
  const withResidual = active.filter((r) => r.residual_score != null);
  const avgResidual = withResidual.length
    ? (withResidual.reduce((s, r) => s + (r.residual_score ?? 0), 0) / withResidual.length).toFixed(1)
    : '—';

  const set = <K extends keyof Risk>(k: K, v: Risk[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => { setEditingId(null); setForm(emptyRisk); setFormOpen(true); };
  const openEdit = (r: Risk) => { setEditingId(r.id); setForm(r); setFormOpen(true); };

  const save = () => run(async () => {
    if (!form.title?.trim()) throw new Error('Risk title is required');
    const values = { ...form, last_reviewed: today() };
    if (editingId) await update(editingId, values);
    else await create(values);
    setFormOpen(false);
  }, editingId ? 'Risk updated' : 'Risk created');

  return (
    <div className="page-container">
      <PageHeader
        title="Risk Register"
        subtitle="Centralized inventory of information security and cyber risks"
        breadcrumb={[{ label: 'Security' }, { label: 'Risk Register' }]}
        actions={
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            Add Risk
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Risks" value={risks.length} sublabel={`${risks.filter(r => r.status === 'open').length} open`} icon={<AlertTriangle className="w-4 h-4 text-slate-400" />} iconBg="bg-slate-500/15" />
        <MetricCard label="Critical" value={critical} sublabel="require immediate action" icon={<AlertTriangle className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
        <MetricCard label="High" value={high} sublabel="action plan needed" icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} iconBg="bg-orange-500/15" variant="warning" />
        <MetricCard label="Avg Residual Score" value={avgResidual} sublabel="target < 5.0" icon={<TrendingDown className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 h-9 text-sm" placeholder="Search risks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select h-9 text-sm w-auto min-w-[140px]" value={domain} onChange={(e) => setDomain(e.target.value)}>
          {domains.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="select h-9 text-sm w-auto min-w-[120px]" value={severity} onChange={(e) => setSeverity(e.target.value)}>
          {severities.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Severities' : capitalize(s)}</option>)}
        </select>
        <select className="select h-9 text-sm w-auto min-w-[120px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          {statuses.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : capitalize(s)}</option>)}
        </select>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} risks</span>
      </div>

      {loading ? <LoadingState /> : risks.length === 0 ? (
        <EmptyState title="No risks registered yet" message="Start your register by adding the main cyber risks your organisation faces." action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" />Add Risk</button>} />
      ) : (
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-x-auto">
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
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setSelectedId(r.id)}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.ref}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200 leading-tight">{r.title}</p>
                    {r.asset && <p className="text-xs text-slate-500 mt-0.5 hidden lg:block truncate max-w-xs">{r.asset}</p>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell"><span className="text-xs text-slate-400">{r.domain ?? '—'}</span></td>
                  <td className="px-4 py-3"><RiskBadge severity={r.severity} /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><ScoreCell score={r.inherent_score} /></td>
                  <td className="px-4 py-3"><ScoreCell score={r.residual_score} /></td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} size="sm" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><TrendIcon trend={r.trend} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{firstName(r.owner)}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{fmtDate(r.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-slate-500 text-sm">No risks match your filters.</div>}
        </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelectedId(null)} title={selected ? `${selected.ref} · ${selected.title}` : ''}>
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <RiskBadge severity={selected.severity} />
              <StatusBadge status={selected.status} size="sm" />
            </div>
            <DetailGrid items={[
              { label: 'Category', value: selected.category },
              { label: 'Domain', value: selected.domain },
              { label: 'Owner', value: selected.owner },
              { label: 'Asset', value: selected.asset },
              { label: 'Likelihood', value: `${selected.likelihood} / 5` },
              { label: 'Impact', value: `${selected.impact} / 5` },
              { label: 'Inherent Score', value: selected.inherent_score },
              { label: 'Residual Score', value: selected.residual_score ?? '—' },
              { label: 'Treatment', value: capitalize(selected.treatment) },
              { label: 'Due Date', value: fmtDate(selected.due_date, 'long') },
            ]} />
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</h4>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{selected.description || 'No description.'}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Linked Controls</h4>
              <div className="flex gap-2 flex-wrap">
                {selected.control_refs.map((c) => (
                  <span key={c} className="text-xs bg-brand-500/15 text-brand-400 border border-brand-500/20 px-2 py-0.5 rounded-md font-mono">{c}</span>
                ))}
                {selected.control_refs.length === 0 && <span className="text-xs text-slate-500">No controls linked</span>}
              </div>
            </div>
            <p className="text-xs text-slate-500">Last reviewed: {fmtDate(selected.last_reviewed, 'long')}</p>
            <div className="flex gap-2 pt-2 border-t border-white/8">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(selected)}><Edit className="w-3.5 h-3.5" /> Edit Risk</button>
              <DeleteButton onConfirm={async () => { await remove(selected.id); setSelectedId(null); }} />
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editingId ? 'Edit Risk' : 'Add New Risk'} size="lg"
        actions={<><button className="btn btn-outline btn-sm" onClick={() => setFormOpen(false)}>Cancel</button><SubmitButton pending={pending} onClick={save}>{editingId ? 'Save Changes' : 'Create Risk'}</SubmitButton></>}
      >
        <div className="space-y-4">
          <Field label="Risk Title"><input className="input" placeholder="e.g., Unauthorized access to production database" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Domain"><select className="select" value={form.domain ?? ''} onChange={(e) => set('domain', e.target.value)}>{DOMAINS.map(d => <option key={d}>{d}</option>)}</select></Field>
            <Field label="Category"><select className="select" value={form.category ?? ''} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
          </div>
          <Field label="Description"><textarea className="input resize-none" rows={3} placeholder="Describe the risk scenario, root causes and potential impact..." value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Likelihood (1–5)"><input type="number" className="input" min={1} max={5} value={form.likelihood ?? 3} onChange={(e) => set('likelihood', Math.min(5, Math.max(1, Number(e.target.value) || 1)))} /></Field>
            <Field label="Impact (1–5)"><input type="number" className="input" min={1} max={5} value={form.impact ?? 3} onChange={(e) => set('impact', Math.min(5, Math.max(1, Number(e.target.value) || 1)))} /></Field>
            <Field label="Residual (0–25)"><input type="number" className="input" min={0} max={25} placeholder="after controls" value={form.residual_score ?? ''} onChange={(e) => set('residual_score', e.target.value === '' ? null : Math.min(25, Math.max(0, Number(e.target.value))))} /></Field>
          </div>
          <p className="text-xs text-slate-500 -mt-2">Inherent score = likelihood × impact = <span className="text-slate-300 font-semibold">{(form.likelihood ?? 3) * (form.impact ?? 3)}</span> (severity is derived automatically)</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner"><input className="input" placeholder="Risk owner name" value={form.owner ?? ''} onChange={(e) => set('owner', e.target.value)} /></Field>
            <Field label="Affected Asset"><input className="input" placeholder="e.g., Core Banking Platform" value={form.asset ?? ''} onChange={(e) => set('asset', e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Status"><select className="select" value={form.status} onChange={(e) => set('status', e.target.value as Risk['status'])}>{statuses.slice(1).map(s => <option key={s} value={s}>{capitalize(s)}</option>)}</select></Field>
            <Field label="Trend"><select className="select" value={form.trend} onChange={(e) => set('trend', e.target.value as Risk['trend'])}><option value="increasing">Increasing</option><option value="stable">Stable</option><option value="decreasing">Decreasing</option></select></Field>
            <Field label="Due Date"><input type="date" className="input" value={form.due_date ?? ''} onChange={(e) => set('due_date', e.target.value || null)} /></Field>
          </div>
          <Field label="Linked Controls (comma-separated refs)"><input className="input" placeholder="e.g., C-001, C-005" value={(form.control_refs ?? []).join(', ')} onChange={(e) => set('control_refs', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} /></Field>
          <Field label="Treatment">
            <div className="grid grid-cols-4 gap-2">
              {(['mitigate', 'accept', 'transfer', 'avoid'] as const).map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm text-slate-300 cursor-pointer">
                  <input type="radio" name="treatment" checked={form.treatment === t} onChange={() => set('treatment', t)} className="accent-brand-500" />{capitalize(t)}
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
