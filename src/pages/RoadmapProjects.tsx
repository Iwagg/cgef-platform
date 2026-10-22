import { useState } from 'react';
import { Map, Plus, Search, TrendingUp, Calendar } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';
import { Field, SubmitButton, DeleteButton, EmptyState, LoadingState, useAction } from '../components/ui/Form';
import { useOrgTable } from '../hooks/useOrgTable';
import type { Project } from '../lib/db-types';
import { fmtDate, fmtMoney, firstName, capitalize } from '../lib/format';

const CATEGORIES = ['Compliance', 'Security', 'Regulatory', 'Architecture', 'Cloud', 'Training'];

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

const emptyProject: Partial<Project> = {
  title: '', description: '', category: CATEGORIES[0], priority: 'medium', status: 'planning', owner: '',
  start_date: null, end_date: null, progress: 0, budget: 0, maturity_impact: null, compliance_impact: '',
};

export function RoadmapProjects() {
  const { rows: projects, loading, create, update, remove } = useOrgTable<Project>('projects', { orderBy: 'end_date', ascending: true });
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [form, setForm] = useState<Partial<Project> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { pending, run } = useAction();

  const filtered = projects.filter((p) => !search || p.title.toLowerCase().includes(search.toLowerCase()));
  const inProgressList = projects.filter((p) => p.status === 'in_progress');
  const planning = projects.filter((p) => p.status === 'planning').length;
  const totalBudget = projects.filter((p) => p.status !== 'completed').reduce((s, p) => s + Number(p.budget || 0), 0);
  const avgProgress = inProgressList.length ? Math.round(inProgressList.reduce((s, p) => s + p.progress, 0) / inProgressList.length) : 0;

  const set = <K extends keyof Project>(k: K, v: Project[K]) => setForm((f) => ({ ...f, [k]: v }));
  const openCreate = () => { setEditingId(null); setForm(emptyProject); };
  const openEdit = (p: Project) => { setEditingId(p.id); setForm(p); };

  const save = () => run(async () => {
    if (!form?.title?.trim()) throw new Error('Initiative title is required');
    if (form.start_date && form.end_date && form.end_date < form.start_date) throw new Error('End date must be after start date');
    const values = { ...form, progress: form.status === 'completed' ? 100 : form.progress };
    if (editingId) await update(editingId, values); else await create(values);
    setForm(null);
  }, editingId ? 'Initiative updated' : 'Initiative created');

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
                  {capitalize(v)}
                </button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus className="w-3.5 h-3.5" />
              New Initiative
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Active Initiatives" value={inProgressList.length} sublabel="in progress" icon={<Map className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Avg. Progress" value={`${avgProgress}%`} sublabel="of active initiatives" icon={<TrendingUp className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="In Planning" value={planning} sublabel="upcoming" icon={<Calendar className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" />
        <MetricCard label="Open Budget" value={fmtMoney(totalBudget)} sublabel="not yet completed" icon={<TrendingUp className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" />
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input className="input pl-9 h-9 text-sm max-w-xs" placeholder="Search initiatives..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? <LoadingState /> : projects.length === 0 ? (
        <EmptyState title="No initiatives on the roadmap" message="Plan your cyber programmes with budget, timeline and expected maturity impact." action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" />New Initiative</button>} />
      ) : view === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} onClick={() => openEdit(p)} className={`bg-surface-850 rounded-xl border-l-2 border border-white/8 ${priorityColors[p.priority]} hover:border-white/15 transition-all cursor-pointer p-5`}>
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${categoryColors[p.category ?? ''] ?? 'bg-slate-500/15 text-slate-400 border border-slate-500/20'}`}>{p.category}</span>
                <StatusBadge status={p.status} size="sm" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1 leading-snug">{p.title}</h3>
              <p className="text-xs text-slate-500 mb-3">Owner: {firstName(p.owner)} · {p.end_date ? fmtDate(p.end_date) : 'no end date'}</p>
              <ProgressBar value={p.progress} size="sm" showLabel className="mb-3" />
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/4 rounded-lg p-2 text-center"><p className="text-slate-300 font-semibold">{fmtMoney(Number(p.budget))}</p><p className="text-slate-500">Budget</p></div>
                <div className="bg-white/4 rounded-lg p-2 text-center"><p className="text-emerald-400 font-semibold">{p.maturity_impact != null ? `+${p.maturity_impact}` : '—'}</p><p className="text-slate-500">Maturity</p></div>
                <div className="bg-white/4 rounded-lg p-2 text-center"><p className="text-brand-400 font-semibold text-[10px] leading-tight truncate">{p.compliance_impact || '—'}</p><p className="text-slate-500">Compliance</p></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-x-auto">
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
                <tr key={p.id} onClick={() => openEdit(p)} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer">
                  <td className="px-4 py-3"><p className="font-medium text-slate-200">{p.title}</p><p className="text-xs text-slate-500">{p.ref} · {firstName(p.owner)}</p></td>
                  <td className="px-4 py-3 hidden md:table-cell"><span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${categoryColors[p.category ?? ''] ?? 'bg-slate-500/15 text-slate-400 border border-slate-500/20'}`}>{p.category}</span></td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} size="sm" /></td>
                  <td className="px-4 py-3 hidden lg:table-cell w-32"><ProgressBar value={p.progress} size="sm" showLabel /></td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-300">{fmtMoney(Number(p.budget))}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm font-semibold text-emerald-400">{p.maturity_impact != null ? `+${p.maturity_impact}` : '—'}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-400">{fmtDate(p.end_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editingId ? `Edit Initiative ${form?.ref ?? ''}` : 'New Strategic Initiative'} size="lg"
        actions={<>
          {editingId && <DeleteButton onConfirm={async () => { await remove(editingId); setForm(null); }} />}
          <button className="btn btn-outline btn-sm" onClick={() => setForm(null)}>Cancel</button>
          <SubmitButton pending={pending} onClick={save}>{editingId ? 'Save Changes' : 'Create Initiative'}</SubmitButton>
        </>}
      >
        {form && (
          <div className="space-y-4">
            <Field label="Initiative Title"><input className="input" placeholder="e.g., Zero Trust Architecture Migration" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
            <Field label="Description"><textarea className="input resize-none" rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Category"><select className="select" value={form.category ?? ''} onChange={(e) => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Priority"><select className="select" value={form.priority} onChange={(e) => set('priority', e.target.value as Project['priority'])}>{['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p}>{capitalize(p)}</option>)}</select></Field>
              <Field label="Status"><select className="select" value={form.status} onChange={(e) => set('status', e.target.value as Project['status'])}>{['planning', 'in_progress', 'on_hold', 'completed'].map(s => <option key={s} value={s}>{capitalize(s)}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Start Date"><input type="date" className="input" value={form.start_date ?? ''} onChange={(e) => set('start_date', e.target.value || null)} /></Field>
              <Field label="End Date"><input type="date" className="input" value={form.end_date ?? ''} onChange={(e) => set('end_date', e.target.value || null)} /></Field>
              <Field label={`Progress (${form.progress ?? 0}%)`}><input type="range" min={0} max={100} step={5} className="w-full accent-brand-500 mt-2" value={form.progress ?? 0} onChange={(e) => set('progress', Number(e.target.value))} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Budget (€)"><input type="number" min={0} className="input" value={form.budget ?? 0} onChange={(e) => set('budget', Math.max(0, Number(e.target.value) || 0))} /></Field>
              <Field label="Owner"><input className="input" placeholder="Initiative owner" value={form.owner ?? ''} onChange={(e) => set('owner', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Expected Maturity Impact (points)"><input type="number" step={0.1} min={0} max={5} className="input" placeholder="e.g., 0.8" value={form.maturity_impact ?? ''} onChange={(e) => set('maturity_impact', e.target.value === '' ? null : Number(e.target.value))} /></Field>
              <Field label="Compliance Impact"><input className="input" placeholder="e.g., NIS2 +30%" value={form.compliance_impact ?? ''} onChange={(e) => set('compliance_impact', e.target.value)} /></Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
