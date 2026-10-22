import { useState } from 'react';
import { FileText, Plus, Search, CircleCheck as CheckCircle, Clock, CircleAlert as AlertCircle, CreditCard as Edit, Eye } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge, FrameworkBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Field, SubmitButton, DeleteButton, EmptyState, LoadingState, DetailGrid, useAction } from '../components/ui/Form';
import { useOrgTable } from '../hooks/useOrgTable';
import { useAuthStore } from '../stores/auth';
import { hasRole } from '../lib/rbac';
import type { PolicyDocument } from '../lib/db-types';
import { FRAMEWORKS } from '../lib/db-types';
import { fmtDate, firstName, isOverdue, today } from '../lib/format';

const TEMPLATES: { label: string; framework: string; title: string; content: string }[] = [
  { label: 'Information Security Policy (ISO 27001)', framework: 'ISO 27001', title: 'Information Security Policy',
    content: '1. Purpose\n2. Scope\n3. Information security objectives\n4. Roles and responsibilities (management, CISO, staff)\n5. Risk management approach\n6. Compliance and exceptions\n7. Review cycle (at least annually)\n' },
  { label: 'Incident Response Plan (NIS2)', framework: 'NIS2', title: 'Incident Response Plan',
    content: '1. Purpose and scope\n2. Incident classification and severity levels\n3. Roles: incident manager, CERT, communication\n4. Detection and triage\n5. Containment, eradication, recovery\n6. Notification to authorities: early warning 24h, notification 72h, final report 1 month\n7. Post-incident review and lessons learned\n' },
  { label: 'Data Protection Policy (RGPD)', framework: 'RGPD', title: 'Data Protection Policy',
    content: '1. Principles (Art. 5)\n2. Lawful bases for processing\n3. Data subject rights and DSAR handling\n4. Records of processing activities (Art. 30)\n5. Data protection by design (Art. 25) and DPIA (Art. 35)\n6. Breach notification within 72h (Art. 33)\n7. Role of the DPO\n' },
  { label: 'Access Control Policy (ISO 27001)', framework: 'ISO 27001', title: 'Access Control Policy',
    content: '1. Principles: least privilege, need-to-know\n2. User lifecycle (joiners, movers, leavers)\n3. Authentication and MFA requirements\n4. Privileged access management\n5. Periodic access reviews\n6. Remote access\n' },
  { label: 'Business Continuity Plan (DORA)', framework: 'DORA', title: 'Business Continuity Plan',
    content: '1. Critical functions and ICT dependencies\n2. Business impact analysis (RTO / RPO)\n3. Continuity and recovery strategies\n4. Crisis management and communication\n5. Testing programme (at least annually)\n6. Review and improvement\n' },
];

const emptyPolicy: Partial<PolicyDocument> = { title: '', version: '1.0', status: 'draft', framework: FRAMEWORKS[0], owner: '', content: '', next_review: null };

function addYear(date: string) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function PoliciesDocuments() {
  const profile = useAuthStore((s) => s.profile);
  const { rows: policies, loading, create, update, remove } = useOrgTable<PolicyDocument>('policy_documents', { orderBy: 'ref', ascending: true });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewId, setViewId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<PolicyDocument> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { pending, run } = useAction();
  const canApprove = hasRole(profile?.role, 'manager');

  const viewed = policies.find((p) => p.id === viewId) ?? null;
  const filtered = policies.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    return true;
  });

  const approved = policies.filter((p) => p.status === 'approved').length;
  const underReview = policies.filter((p) => p.status === 'under_review').length;
  const reviewDue = policies.filter((p) => p.status === 'approved' && isOverdue(p.next_review)).length;

  const statusIcon = {
    approved: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    under_review: <Clock className="w-4 h-4 text-amber-400" />,
    draft: <Edit className="w-4 h-4 text-slate-400" />,
    expired: <AlertCircle className="w-4 h-4 text-red-400" />,
  } as Record<string, JSX.Element>;

  const set = <K extends keyof PolicyDocument>(k: K, v: PolicyDocument[K]) => setForm((f) => ({ ...f, [k]: v }));
  const openCreate = () => { setEditingId(null); setForm(emptyPolicy); };
  const openEdit = (p: PolicyDocument) => { setViewId(null); setEditingId(p.id); setForm(p); };
  const applyTemplate = (label: string) => {
    const t = TEMPLATES.find((x) => x.label === label);
    if (t) setForm((f) => ({ ...f, title: f?.title || t.title, framework: t.framework, content: t.content }));
  };

  const save = () => run(async () => {
    if (!form?.title?.trim()) throw new Error('Policy title is required');
    if (editingId) await update(editingId, form);
    else await create(form);
    setForm(null);
  }, editingId ? 'Policy updated' : 'Policy created');

  const submitForReview = (p: PolicyDocument) => run(() => update(p.id, { status: 'under_review' }), 'Submitted for review');
  const approve = (p: PolicyDocument) => run(() => update(p.id, {
    status: 'approved', approved_by: profile?.full_name ?? null, approved_at: new Date().toISOString(),
    last_review: today(), next_review: addYear(today()),
  }), 'Policy approved');

  return (
    <div className="page-container">
      <PageHeader
        title="Policies & Documents"
        subtitle="Security policy library with versioning and approval workflows"
        breadcrumb={[{ label: 'Compliance' }, { label: 'Policies & Documents' }]}
        actions={
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            New Policy
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Documents" value={policies.length} sublabel="in repository" icon={<FileText className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Approved" value={approved} sublabel={reviewDue ? `${reviewDue} review(s) overdue` : 'active policies'} icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Under Review" value={underReview} sublabel="pending approval" icon={<Clock className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
        <MetricCard label="Drafts" value={policies.filter((p) => p.status === 'draft').length} sublabel="work in progress" icon={<Edit className="w-4 h-4 text-slate-400" />} iconBg="bg-slate-500/15" />
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 h-9 text-sm" placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['All', 'approved', 'under_review', 'draft', 'expired'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              {s === 'All' ? 'All' : s === 'under_review' ? 'Under Review' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} documents</span>
      </div>

      {loading ? <LoadingState /> : policies.length === 0 ? (
        <EmptyState title="No policies yet" message="Create your first policy — templates for ISO 27001, NIS2, DORA and RGPD are available." action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" />New Policy</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <div key={p.id} className="bg-surface-850 rounded-xl border border-white/8 p-5 hover:border-white/15 hover:bg-surface-800 transition-all cursor-pointer group" onClick={() => setViewId(p.id)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  {statusIcon[p.status] ?? <FileText className="w-4 h-4 text-slate-400" />}
                </div>
                <StatusBadge status={p.status} size="sm" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-white transition-colors">{p.title}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-xs text-slate-600">{p.ref}</span>
                <span className="text-xs text-slate-500">v{p.version}</span>
                {p.framework && <><span className="text-xs text-slate-600">·</span><FrameworkBadge framework={p.framework} /></>}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Owner</span><span className="text-slate-300">{firstName(p.owner)}</span></div>
                {p.approved_by && <div className="flex justify-between"><span className="text-slate-500">Approved by</span><span className="text-slate-300">{firstName(p.approved_by)}</span></div>}
                {p.last_review && <div className="flex justify-between"><span className="text-slate-500">Last review</span><span className="text-slate-300">{fmtDate(p.last_review)}</span></div>}
                {p.next_review && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Next review</span>
                    <span className={new Date(p.next_review) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) ? 'text-amber-400' : 'text-slate-300'}>{fmtDate(p.next_review)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="btn btn-secondary btn-sm flex-1 gap-1.5" onClick={(e) => { e.stopPropagation(); setViewId(p.id); }}><Eye className="w-3 h-3" /> Open</button>
                <button className="btn btn-outline btn-sm flex-1 gap-1.5" onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Edit className="w-3 h-3" /> Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!viewed} onClose={() => setViewId(null)} title={viewed ? `${viewed.ref} · ${viewed.title}` : ''} size="2xl"
        actions={viewed && <>
          <button className="btn btn-outline btn-sm" onClick={() => openEdit(viewed)}><Edit className="w-3.5 h-3.5" /> Edit</button>
          {viewed.status === 'draft' && <SubmitButton pending={pending} variant="btn-secondary" onClick={() => submitForReview(viewed)}>Submit for Review</SubmitButton>}
          {viewed.status === 'under_review' && canApprove && <SubmitButton pending={pending} variant="btn-success" onClick={() => approve(viewed)}>Approve</SubmitButton>}
          {viewed.status === 'under_review' && !canApprove && <span className="text-xs text-slate-500">Approval requires a manager, CISO or admin</span>}
        </>}
      >
        {viewed && (
          <div className="space-y-4">
            <StatusBadge status={viewed.status} size="sm" />
            <DetailGrid items={[
              { label: 'Version', value: `v${viewed.version}` },
              { label: 'Framework', value: viewed.framework },
              { label: 'Owner', value: viewed.owner },
              { label: 'Approved By', value: viewed.approved_by ?? 'Pending' },
              { label: 'Last Review', value: fmtDate(viewed.last_review) },
              { label: 'Next Review', value: fmtDate(viewed.next_review) },
            ]} />
            <div className="bg-white/3 rounded-xl p-4 border border-white/8 max-h-96 overflow-y-auto">
              {viewed.content
                ? <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">{viewed.content}</pre>
                : <p className="text-xs text-slate-500">No content yet — click Edit to write the policy.</p>}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} title={editingId ? 'Edit Policy' : 'Create New Policy'} size="2xl"
        actions={<>
          {editingId && <DeleteButton onConfirm={async () => { await remove(editingId); setForm(null); }} />}
          <button className="btn btn-outline btn-sm" onClick={() => setForm(null)}>Cancel</button>
          <SubmitButton pending={pending} onClick={save}>{editingId ? 'Save Changes' : 'Create Policy'}</SubmitButton>
        </>}
      >
        {form && (
          <div className="space-y-4">
            {!editingId && (
              <Field label="Use Template">
                <select className="select" defaultValue="" onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">Start from scratch</option>
                  {TEMPLATES.map((t) => <option key={t.label}>{t.label}</option>)}
                </select>
              </Field>
            )}
            <Field label="Policy Title"><input className="input" placeholder="e.g., Endpoint Security Policy" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Framework"><select className="select" value={form.framework ?? ''} onChange={(e) => set('framework', e.target.value)}>{FRAMEWORKS.map(f => <option key={f}>{f}</option>)}</select></Field>
              <Field label="Owner"><input className="input" placeholder="Policy owner" value={form.owner ?? ''} onChange={(e) => set('owner', e.target.value)} /></Field>
              <Field label="Version"><input className="input" value={form.version ?? ''} onChange={(e) => set('version', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status">
                <select className="select" value={form.status} onChange={(e) => set('status', e.target.value as PolicyDocument['status'])}>
                  <option value="draft">Draft</option>
                  <option value="under_review">Under Review</option>
                  {(canApprove || form.status === 'approved') && <option value="approved">Approved</option>}
                  <option value="expired">Expired</option>
                </select>
              </Field>
              <Field label="Next Review"><input type="date" className="input" value={form.next_review ?? ''} onChange={(e) => set('next_review', e.target.value || null)} /></Field>
            </div>
            <Field label="Content"><textarea className="input font-mono text-xs" rows={12} placeholder="Write the policy content..." value={form.content ?? ''} onChange={(e) => set('content', e.target.value)} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
