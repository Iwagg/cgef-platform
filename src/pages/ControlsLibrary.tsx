import { useMemo, useState } from 'react';
import { SquareCheck as CheckSquare, Plus, Search, Star, CreditCard as Edit } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge, FrameworkBadge } from '../components/ui/StatusBadge';
import { Modal, Drawer } from '../components/ui/Modal';
import { Field, SubmitButton, DeleteButton, EmptyState, LoadingState, DetailGrid, useAction } from '../components/ui/Form';
import { useOrgTable } from '../hooks/useOrgTable';
import type { Control } from '../lib/db-types';
import { FRAMEWORKS } from '../lib/db-types';
import { fmtDate, firstName, isOverdue } from '../lib/format';

const DOMAINS = ['Governance', 'Risk Management', 'Asset Management', 'Identity & Access', 'Security Operations',
  'Incident Response', 'Business Continuity', 'Third Party Risk', 'Data Protection', 'Cloud Security', 'Awareness & Training'];
const statuses = ['All', 'implemented', 'partial', 'not_implemented'];
const statusLabel = (s: string) => s === 'All' ? 'All Statuses' : s === 'implemented' ? 'Implemented' : s === 'partial' ? 'Partial' : 'Not Implemented';

const emptyControl: Partial<Control> = {
  title: '', description: '', domain: DOMAINS[0], status: 'not_implemented', effectiveness: 0,
  frameworks: [], owner: '', last_review: null, next_review: null,
};

function EffectivenessStars({ level, onChange }: { level: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          onClick={onChange ? () => onChange(i === level ? 0 : i) : undefined}
          className={`w-3 h-3 ${onChange ? 'w-4 h-4 cursor-pointer' : ''} ${i <= level ? 'text-amber-400 fill-amber-400' : 'text-slate-700'}`}
        />
      ))}
    </div>
  );
}

export function ControlsLibrary() {
  const { rows: controls, loading, create, update, remove } = useOrgTable<Control>('controls', { orderBy: 'ref', ascending: true });
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('All Domains');
  const [status, setStatus] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Control> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { pending, run } = useAction();

  const selected = controls.find((c) => c.id === selectedId) ?? null;
  const domains = useMemo(() => ['All Domains', ...Array.from(new Set(controls.map((c) => c.domain).filter(Boolean) as string[]))], [controls]);

  const filtered = controls.filter((c) => {
    const q = search.toLowerCase();
    if (q && !c.title.toLowerCase().includes(q) && !c.ref.toLowerCase().includes(q)) return false;
    if (domain !== 'All Domains' && c.domain !== domain) return false;
    if (status !== 'All' && c.status !== status) return false;
    return true;
  });

  const implemented = controls.filter((c) => c.status === 'implemented').length;
  const partial = controls.filter((c) => c.status === 'partial').length;
  const coverage = controls.length ? Math.round(((implemented + partial * 0.5) / controls.length) * 100) : 0;
  const reviewsDue = controls.filter((c) => isOverdue(c.next_review)).length;

  const set = <K extends keyof Control>(k: K, v: Control[K]) => setForm((f) => ({ ...f, [k]: v }));
  const openCreate = () => { setEditingId(null); setForm(emptyControl); };
  const openEdit = (c: Control) => { setEditingId(c.id); setForm(c); };
  const toggleFramework = (f: string) => setForm((prev) => {
    const list = prev?.frameworks ?? [];
    return { ...prev, frameworks: list.includes(f) ? list.filter((x) => x !== f) : [...list, f] };
  });

  const save = () => run(async () => {
    if (!form?.title?.trim()) throw new Error('Control title is required');
    if (editingId) await update(editingId, form);
    else await create(form);
    setForm(null);
  }, editingId ? 'Control updated' : 'Control created');

  return (
    <div className="page-container">
      <PageHeader
        title="Controls Library"
        subtitle="Security controls mapped to multiple regulatory frameworks"
        breadcrumb={[{ label: 'Security' }, { label: 'Controls Library' }]}
        actions={
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            Add Control
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Controls" value={controls.length} sublabel="in library" icon={<CheckSquare className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Implemented" value={implemented} sublabel="fully in place" icon={<CheckSquare className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Partial" value={partial} sublabel="in progress" icon={<CheckSquare className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
        <MetricCard label="Control Coverage" value={`${coverage}%`} sublabel={reviewsDue ? `${reviewsDue} review(s) overdue` : 'partial counts as 50%'} icon={<CheckSquare className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" />
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
          {statuses.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} controls</span>
      </div>

      {loading ? <LoadingState /> : controls.length === 0 ? (
        <EmptyState title="Your controls library is empty" message="Add the security controls in place (or planned) and map them to the frameworks they satisfy." action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" />Add Control</button>} />
      ) : (
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-x-auto">
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
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setSelectedId(c.id)}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.ref}</td>
                  <td className="px-4 py-3"><p className="font-medium text-slate-200">{c.title}</p></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{c.domain ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} size="sm" /></td>
                  <td className="px-4 py-3 hidden md:table-cell"><EffectivenessStars level={c.effectiveness} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1 flex-wrap">
                      {c.frameworks.slice(0, 2).map((f) => <FrameworkBadge key={f} framework={f} />)}
                      {c.frameworks.length > 2 && <span className="text-xs text-slate-500">+{c.frameworks.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{firstName(c.owner)}</td>
                  <td className={`px-4 py-3 hidden xl:table-cell text-xs ${isOverdue(c.next_review) ? 'text-red-400' : 'text-slate-400'}`}>{fmtDate(c.next_review)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-12 text-slate-500 text-sm">No controls match your filters.</div>}
        </div>
      )}

      <Drawer open={!!selected} onClose={() => setSelectedId(null)} title={selected ? `${selected.ref} · ${selected.title}` : ''} width="max-w-lg">
        {selected && (
          <div className="space-y-4">
            <StatusBadge status={selected.status} size="sm" />
            <DetailGrid items={[
              { label: 'Domain', value: selected.domain },
              { label: 'Owner', value: selected.owner },
              { label: 'Last Review', value: fmtDate(selected.last_review) },
              { label: 'Next Review', value: fmtDate(selected.next_review) },
            ]} />
            {selected.description && <p className="text-sm text-slate-300 whitespace-pre-wrap">{selected.description}</p>}
            <div><p className="text-xs text-slate-500 mb-1.5">Effectiveness</p><EffectivenessStars level={selected.effectiveness} /></div>
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Framework Mapping</p>
              <div className="flex gap-2 flex-wrap">
                {selected.frameworks.map((f) => <FrameworkBadge key={f} framework={f} />)}
                {selected.frameworks.length === 0 && <span className="text-xs text-slate-500">Not mapped</span>}
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-white/8">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(selected)}><Edit className="w-3.5 h-3.5" /> Edit Control</button>
              <DeleteButton onConfirm={async () => { await remove(selected.id); setSelectedId(null); }} />
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={!!form} onClose={() => setForm(null)} title={editingId ? 'Edit Control' : 'Add New Control'} size="lg"
        actions={<><button className="btn btn-outline btn-sm" onClick={() => setForm(null)}>Cancel</button><SubmitButton pending={pending} onClick={save}>{editingId ? 'Save Changes' : 'Create Control'}</SubmitButton></>}
      >
        {form && (
          <div className="space-y-4">
            <Field label="Control Title"><input className="input" placeholder="e.g., Multi-Factor Authentication for Privileged Accounts" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
            <Field label="Description"><textarea className="input resize-none" rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Domain"><select className="select" value={form.domain ?? ''} onChange={(e) => set('domain', e.target.value)}>{DOMAINS.map(d => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Owner"><input className="input" placeholder="Control owner" value={form.owner ?? ''} onChange={(e) => set('owner', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Implementation Status">
                <select className="select" value={form.status} onChange={(e) => set('status', e.target.value as Control['status'])}>
                  <option value="not_implemented">Not Implemented</option>
                  <option value="partial">Partial</option>
                  <option value="implemented">Implemented</option>
                </select>
              </Field>
              <Field label="Effectiveness"><div className="pt-2"><EffectivenessStars level={form.effectiveness ?? 0} onChange={(v) => set('effectiveness', v)} /></div></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Last Review"><input type="date" className="input" value={form.last_review ?? ''} onChange={(e) => set('last_review', e.target.value || null)} /></Field>
              <Field label="Next Review"><input type="date" className="input" value={form.next_review ?? ''} onChange={(e) => set('next_review', e.target.value || null)} /></Field>
            </div>
            <Field label="Framework Mapping">
              <div className="grid grid-cols-3 gap-2">
                {FRAMEWORKS.map((f) => (
                  <label key={f} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" className="accent-brand-500" checked={(form.frameworks ?? []).includes(f)} onChange={() => toggleFramework(f)} />{f}
                  </label>
                ))}
              </div>
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
