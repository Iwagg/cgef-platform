import { useRef, useState } from 'react';
import { FlaskConical, Upload, CircleCheck as CheckCircle, Circle as XCircle, Clock, Search, File, FileText, Image, Table, Download } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge, FrameworkBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Field, SubmitButton, DeleteButton, EmptyState, LoadingState, DetailGrid, useAction } from '../components/ui/Form';
import { useOrgTable } from '../hooks/useOrgTable';
import { useAuthStore } from '../stores/auth';
import { supabase, EVIDENCE_BUCKET } from '../lib/supabase';
import { hasRole } from '../lib/rbac';
import type { Evidence } from '../lib/db-types';
import { FRAMEWORKS } from '../lib/db-types';
import { fmtDate, fmtBytes } from '../lib/format';

const TYPES = ['Policy', 'Report', 'Screenshot', 'Certificate', 'Assessment', 'Audit Report', 'Test Report', 'Diagram', 'Plan', 'Log Export'];
const STATUSES: Evidence['status'][] = ['requested', 'provided', 'reviewed', 'accepted', 'rejected'];
const MAX_SIZE = 50 * 1024 * 1024;

const fileIcons: Record<string, JSX.Element> = {
  Policy: <FileText className="w-4 h-4 text-blue-400" />,
  Screenshot: <Image className="w-4 h-4 text-purple-400" />,
  Report: <Table className="w-4 h-4 text-amber-400" />,
  Assessment: <FlaskConical className="w-4 h-4 text-emerald-400" />,
  Certificate: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  'Test Report': <FlaskConical className="w-4 h-4 text-cyan-400" />,
  Diagram: <File className="w-4 h-4 text-slate-400" />,
  'Audit Report': <FileText className="w-4 h-4 text-orange-400" />,
  Plan: <FileText className="w-4 h-4 text-blue-400" />,
};

const statusColors: Record<string, string> = {
  accepted: 'bg-emerald-500/10 border-emerald-500/20',
  reviewed: 'bg-blue-500/10 border-blue-500/20',
  provided: 'bg-amber-500/10 border-amber-500/20',
  requested: 'bg-slate-500/10 border-slate-500/20',
  rejected: 'bg-red-500/10 border-red-500/20',
};

const emptyEvidence: Partial<Evidence> = { title: '', type: TYPES[0], framework: FRAMEWORKS[0], control_ref: '', status: 'requested', notes: '' };

export function AuditEvidence() {
  const { profile, organization } = useAuthStore();
  const { rows: evidences, loading, create, update, remove } = useOrgTable<Evidence>('evidences');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [form, setForm] = useState<Partial<Evidence> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { pending, run } = useAction();
  const canReview = hasRole(profile?.role, 'manager');

  const filtered = evidences.filter((e) => {
    const q = search.toLowerCase();
    if (q && !e.title.toLowerCase().includes(q) && !e.ref.toLowerCase().includes(q) && !(e.control_ref ?? '').toLowerCase().includes(q)) return false;
    if (statusFilter !== 'All' && e.status !== statusFilter) return false;
    return true;
  });

  const accepted = evidences.filter((e) => e.status === 'accepted').length;
  const pendingReview = evidences.filter((e) => e.status === 'provided' || e.status === 'reviewed').length;
  const requested = evidences.filter((e) => e.status === 'requested' || e.status === 'rejected').length;
  const coverage = evidences.length ? Math.round((accepted / evidences.length) * 100) : 0;

  const byFramework = FRAMEWORKS.map((f) => {
    const items = evidences.filter((e) => e.framework === f);
    return { label: f, done: items.filter((e) => e.status === 'accepted').length, total: items.length };
  }).filter((f) => f.total > 0);

  const set = <K extends keyof Evidence>(k: K, v: Evidence[K]) => setForm((f) => ({ ...f, [k]: v }));
  const openCreate = () => { setEditingId(null); setForm(emptyEvidence); setFile(null); };
  const openEdit = (e: Evidence) => { setEditingId(e.id); setForm(e); setFile(null); };

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_SIZE) { run(async () => { throw new Error('File exceeds 50 MB'); }); return; }
    setFile(f);
    setForm((prev) => ({ ...prev, title: prev?.title || f.name.replace(/\.[^.]+$/, '') }));
  };

  const save = () => run(async () => {
    if (!form?.title?.trim()) throw new Error('Evidence title is required');
    if (!organization) throw new Error('No organisation');
    let values: Partial<Evidence> = { ...form };
    if (file) {
      const path = `${organization.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]+/g, '_')}`;
      const { error } = await supabase.storage.from(EVIDENCE_BUCKET).upload(path, file, { contentType: file.type || undefined });
      if (error) throw error;
      if (form.file_path) await supabase.storage.from(EVIDENCE_BUCKET).remove([form.file_path]);
      values = {
        ...values, file_path: path, file_name: file.name, file_size: file.size, mime_type: file.type || null,
        uploaded_by: profile?.full_name ?? null, uploaded_at: new Date().toISOString(),
        status: values.status === 'requested' || values.status === 'rejected' ? 'provided' : values.status,
      };
    }
    if (values.status && ['reviewed', 'accepted', 'rejected'].includes(values.status) && values.status !== evidences.find((e) => e.id === editingId)?.status) {
      values = { ...values, reviewer: profile?.full_name ?? null, reviewed_at: new Date().toISOString() };
    }
    if (editingId) await update(editingId, values);
    else await create(values);
    setForm(null);
  }, editingId ? 'Evidence updated' : file ? 'Evidence uploaded' : 'Evidence requested');

  const download = (e: Evidence) => run(async () => {
    if (!e.file_path) throw new Error('No file attached');
    const { data, error } = await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(e.file_path, 60);
    if (error) throw error;
    window.open(data.signedUrl, '_blank', 'noopener');
  });

  const review = (e: Evidence, status: Evidence['status']) => run(
    () => update(e.id, { status, reviewer: profile?.full_name ?? null, reviewed_at: new Date().toISOString() }),
    `Evidence ${status}`,
  );

  const destroy = async (e: Evidence) => {
    await remove(e.id);
    if (e.file_path) await supabase.storage.from(EVIDENCE_BUCKET).remove([e.file_path]);
    setForm(null);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Audit & Evidence"
        subtitle="Evidence repository for audit readiness across all compliance frameworks"
        breadcrumb={[{ label: 'Compliance' }, { label: 'Audit & Evidence' }]}
        actions={
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Upload className="w-3.5 h-3.5" />
            Add Evidence
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Evidence Coverage" value={`${coverage}%`} sublabel="accepted / total" icon={<CheckCircle className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Accepted" value={accepted} sublabel="validated" icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Pending Review" value={pendingReview} sublabel="awaiting validation" icon={<Clock className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
        <MetricCard label="To Provide" value={requested} sublabel="requested or rejected" icon={<XCircle className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
      </div>

      {byFramework.length > 0 && (
        <div className="bg-surface-850 border border-white/8 rounded-xl p-4 mb-5">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">Audit Readiness by Framework</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {byFramework.map((item) => (
              <div key={item.label} className="p-3 bg-white/4 rounded-lg">
                <p className="text-xs text-slate-400 mb-1.5">{item.label}</p>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${(item.done / item.total) * 100}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-300">{item.done}/{item.total}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 h-9 text-sm" placeholder="Search evidence..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['All', ...STATUSES].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              {s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} items</span>
      </div>

      {loading ? <LoadingState /> : evidences.length === 0 ? (
        <EmptyState title="No evidence yet" message="Upload documents proving your controls work, or create a request for evidence someone else must provide." action={<button className="btn btn-primary btn-sm" onClick={openCreate}><Upload className="w-3.5 h-3.5" />Add Evidence</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <div key={e.id} className={`bg-surface-850 rounded-xl border p-4 hover:border-white/15 transition-all cursor-pointer ${statusColors[e.status] ?? 'border-white/8'}`} onClick={() => openEdit(e)}>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                  {fileIcons[e.type ?? ''] ?? <File className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 leading-tight">{e.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500">{e.type}</span>
                    {e.file_size ? <span className="text-xs text-slate-500">· {fmtBytes(e.file_size)}</span> : null}
                  </div>
                </div>
                <StatusBadge status={e.status} size="sm" />
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {e.framework && <FrameworkBadge framework={e.framework} />}
                  <span className="text-slate-600 font-mono">{e.control_ref}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">{e.uploaded_at ? fmtDate(e.uploaded_at, 'day') : 'Pending'}</span>
                  {e.file_path && (
                    <button className="text-slate-400 hover:text-brand-400" title="Download" onClick={(ev) => { ev.stopPropagation(); download(e); }}>
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {e.status === 'rejected' && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  Evidence rejected — resubmission required{e.notes ? `: ${e.notes}` : ''}
                </div>
              )}
              {canReview && (e.status === 'provided' || e.status === 'reviewed') && (
                <div className="flex gap-2 mt-3" onClick={(ev) => ev.stopPropagation()}>
                  <button className="btn btn-success btn-sm flex-1" disabled={pending} onClick={() => review(e, 'accepted')}>Accept</button>
                  <button className="btn btn-outline btn-sm flex-1" disabled={pending} onClick={() => review(e, 'rejected')}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editingId ? `Evidence ${form?.ref ?? ''}` : 'Add Evidence'} size="md"
        actions={<>
          {editingId && <DeleteButton onConfirm={() => destroy(form as Evidence)} />}
          <button className="btn btn-outline btn-sm" onClick={() => setForm(null)}>Cancel</button>
          <SubmitButton pending={pending} onClick={save}>{editingId ? 'Save Changes' : file ? 'Upload Evidence' : 'Request Evidence'}</SubmitButton>
        </>}
      >
        {form && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${dragOver ? 'border-brand-500 bg-brand-500/5' : 'border-white/15 hover:border-white/25'}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
            >
              <Upload className="w-7 h-7 text-slate-500 mx-auto mb-2" />
              {file ? (
                <p className="text-sm text-slate-200 font-medium">{file.name} <span className="text-slate-500">· {fmtBytes(file.size)}</span></p>
              ) : form.file_name ? (
                <p className="text-sm text-slate-300">Current file: <span className="font-medium">{form.file_name}</span> — drop a new file to replace it</p>
              ) : (
                <>
                  <p className="text-sm text-slate-300 font-medium">Drop a file here or click to browse</p>
                  <p className="text-xs text-slate-500 mt-1">PDF, DOCX, XLSX, PNG, JPG · Max 50 MB · leave empty to only request the evidence</p>
                </>
              )}
              <input ref={fileInput} type="file" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
            </div>
            <Field label="Title"><input className="input" placeholder="Evidence title" value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type"><select className="select" value={form.type ?? ''} onChange={(e) => set('type', e.target.value)}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Framework"><select className="select" value={form.framework ?? ''} onChange={(e) => set('framework', e.target.value)}>{FRAMEWORKS.map(f => <option key={f}>{f}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Linked Control"><input className="input" placeholder="e.g., C-001" value={form.control_ref ?? ''} onChange={(e) => set('control_ref', e.target.value)} /></Field>
              <Field label="Status">
                <select className="select" value={form.status} onChange={(e) => set('status', e.target.value as Evidence['status'])}>
                  {STATUSES.filter((s) => canReview || !['accepted', 'rejected'].includes(s) || s === form.status).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes"><textarea className="input resize-none" rows={2} placeholder="Context for the auditor, reason for rejection..." value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
            {editingId && (
              <DetailGrid items={[
                { label: 'Uploaded By', value: form.uploaded_by ?? '—' },
                { label: 'Uploaded At', value: fmtDate(form.uploaded_at) },
                { label: 'Reviewer', value: form.reviewer ?? '—' },
                { label: 'Reviewed At', value: fmtDate(form.reviewed_at) },
              ]} />
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
