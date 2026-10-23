import { useState } from 'react';
import { Building2, Plus, Search, TrendingDown, Users, ChartBar as BarChart2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { FrameworkBadge, RiskBadge, StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Field, SubmitButton, DeleteButton, EmptyState, LoadingState } from '../components/ui/Form';
import { useAction } from '../hooks/useAction';
import { useOrgTable } from '../hooks/useOrgTable';
import type { Client } from '../lib/db-types';
import { FRAMEWORKS } from '../lib/db-types';
import { fmtDate, firstName, capitalize, today } from '../lib/format';

const SECTORS = ['Finance', 'Insurance', 'Healthcare', 'Industry', 'Energy', 'Public Sector', 'Technology', 'Retail', 'Transport'];
const SIZES = ['SME', 'Mid-market', 'Enterprise'];

const emptyClient: Partial<Client> = {
  name: '', sector: SECTORS[0], size: SIZES[1], country: 'France', cyber_score: 0, risk_level: 'medium',
  consultant: '', frameworks: [], status: 'active', last_activity: null, notes: '',
};

export function ClientsOrganisations() {
  const { rows: clients, loading, create, update, remove } = useOrgTable<Client>('clients', { orderBy: 'name', ascending: true });
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [form, setForm] = useState<Partial<Client> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { pending, run } = useAction();

  const filtered = clients.filter((o) => !search || o.name.toLowerCase().includes(search.toLowerCase()));
  const active = clients.filter((o) => o.status === 'active');
  const avgScore = active.length ? Math.round(active.reduce((s, o) => s + o.cyber_score, 0) / active.length) : 0;
  const highRisk = active.filter((o) => o.risk_level === 'high' || o.risk_level === 'critical').length;
  const consultants = new Set(active.map((o) => o.consultant).filter(Boolean)).size;

  const set = <K extends keyof Client>(k: K, v: Client[K]) => setForm((f) => ({ ...f, [k]: v }));
  const openCreate = () => { setEditingId(null); setForm(emptyClient); };
  const openEdit = (c: Client) => { setEditingId(c.id); setForm(c); };
  const toggleFramework = (f: string) => setForm((prev) => {
    const list = prev?.frameworks ?? [];
    return { ...prev, frameworks: list.includes(f) ? list.filter((x) => x !== f) : [...list, f] };
  });

  const save = () => run(async () => {
    if (!form?.name?.trim()) throw new Error('Client name is required');
    const values = { ...form, last_activity: today() };
    if (editingId) await update(editingId, values); else await create(values);
    setForm(null);
  }, editingId ? 'Client updated' : 'Client added');

  return (
    <div className="page-container">
      <PageHeader
        title="Clients & Organisations"
        subtitle="Portfolio view of client engagements and cyber posture scores"
        breadcrumb={[{ label: 'Management' }, { label: 'Clients & Organisations' }]}
        actions={
          <div className="flex gap-2">
            <div className="flex border border-white/10 rounded-lg overflow-hidden">
              {(['grid', 'list'] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? 'bg-brand-500/20 text-brand-300' : 'text-slate-400 hover:text-slate-200'}`}>{capitalize(v)}</button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" />Add Client</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Clients" value={active.length} sublabel={`${clients.length} in portfolio`} icon={<Building2 className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Avg. Cyber Score" value={`${avgScore}%`} sublabel="active clients" icon={<BarChart2 className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="High Risk Clients" value={highRisk} sublabel="require attention" icon={<TrendingDown className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
        <MetricCard label="Consultants Active" value={consultants} sublabel="assigned" icon={<Users className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" />
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 h-9 text-sm" placeholder="Search clients..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} clients</span>
      </div>

      {loading ? <LoadingState /> : clients.length === 0 ? (
        <EmptyState title="No clients yet" message="For consulting teams: track each client engagement, its cyber score and the frameworks in scope." action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" />Add Client</button>} />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((org) => (
            <div key={org.id} onClick={() => openEdit(org)} className="bg-surface-850 rounded-xl border border-white/8 p-5 hover:border-white/15 hover:bg-surface-800 transition-all cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-400">{org.name.charAt(0)}</div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">{org.name}</h3>
                    <p className="text-xs text-slate-500">{org.sector} · {org.size}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RiskBadge severity={org.risk_level} />
                  {org.status !== 'active' && <StatusBadge status={org.status} size="sm" />}
                </div>
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2"><span className="text-xs text-slate-400">Cyber Score</span><span className="text-sm font-bold text-slate-200">{org.cyber_score}%</span></div>
                <ProgressBar value={org.cyber_score} />
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {org.frameworks.slice(0, 3).map((f) => <FrameworkBadge key={f} framework={f} />)}
                {org.frameworks.length > 3 && <span className="text-xs text-slate-500">+{org.frameworks.length - 3}</span>}
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Consultant: <span className="text-slate-300">{firstName(org.consultant)}</span></span>
                <span className="text-slate-500">Last active: <span className="text-slate-300">{fmtDate(org.last_activity, 'day')}</span></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-x-auto">
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
                <tr key={org.id} onClick={() => openEdit(org)} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">{org.name.charAt(0)}</div>
                      <div><p className="font-medium text-slate-200">{org.name}</p><p className="text-xs text-slate-500">{org.size}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{org.sector}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-white/8 rounded-full overflow-hidden"><div className="h-full rounded-full bg-brand-500" style={{ width: `${org.cyber_score}%` }} /></div>
                      <span className="text-sm font-bold text-slate-200">{org.cyber_score}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RiskBadge severity={org.risk_level} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell"><div className="flex gap-1 flex-wrap">{org.frameworks.slice(0, 2).map(f => <FrameworkBadge key={f} framework={f} />)}{org.frameworks.length > 2 && <span className="text-xs text-slate-500">+{org.frameworks.length - 2}</span>}</div></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{firstName(org.consultant)}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{fmtDate(org.last_activity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editingId ? 'Edit Client' : 'Add Client'} size="lg"
        actions={<>
          {editingId && <DeleteButton onConfirm={async () => { await remove(editingId); setForm(null); }} />}
          <button className="btn btn-outline btn-sm" onClick={() => setForm(null)}>Cancel</button>
          <SubmitButton pending={pending} onClick={save}>{editingId ? 'Save Changes' : 'Add Client'}</SubmitButton>
        </>}
      >
        {form && (
          <div className="space-y-4">
            <Field label="Client Name"><input className="input" value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Sector"><select className="select" value={form.sector ?? ''} onChange={(e) => set('sector', e.target.value)}>{SECTORS.map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Size"><select className="select" value={form.size ?? ''} onChange={(e) => set('size', e.target.value)}>{SIZES.map(s => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Country"><input className="input" value={form.country ?? ''} onChange={(e) => set('country', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Cyber Score (0–100)"><input type="number" min={0} max={100} className="input" value={form.cyber_score ?? 0} onChange={(e) => set('cyber_score', Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /></Field>
              <Field label="Risk Level"><select className="select" value={form.risk_level} onChange={(e) => set('risk_level', e.target.value as Client['risk_level'])}>{['critical', 'high', 'medium', 'low'].map(r => <option key={r} value={r}>{capitalize(r)}</option>)}</select></Field>
              <Field label="Status"><select className="select" value={form.status} onChange={(e) => set('status', e.target.value as Client['status'])}><option value="active">Active</option><option value="prospect">Prospect</option><option value="inactive">Inactive</option></select></Field>
            </div>
            <Field label="Consultant"><input className="input" placeholder="Lead consultant" value={form.consultant ?? ''} onChange={(e) => set('consultant', e.target.value)} /></Field>
            <Field label="Frameworks in Scope">
              <div className="grid grid-cols-4 gap-2">
                {FRAMEWORKS.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" className="accent-brand-500" checked={(form.frameworks ?? []).includes(f)} onChange={() => toggleFramework(f)} />{f}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Notes"><textarea className="input resize-none" rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
