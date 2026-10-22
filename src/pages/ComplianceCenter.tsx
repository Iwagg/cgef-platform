import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CircleCheck as CheckCircle, CircleAlert as AlertCircle, CircleMinus as MinusCircle, Plus, Download, Settings as SettingsIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';
import { Field, SubmitButton, DeleteButton, EmptyState, LoadingState, useAction } from '../components/ui/Form';
import { useOrgTable } from '../hooks/useOrgTable';
import type { ComplianceRequirement, OrgFramework, RequirementStatus } from '../lib/db-types';
import { REQUIREMENT_TEMPLATES } from '../lib/compliance-templates';
import { frameworkStats } from '../lib/metrics';
import { fmtDate, isOverdue } from '../lib/format';

const STATUS_OPTIONS: RequirementStatus[] = ['compliant', 'partial', 'gap', 'na'];
const CERT_STATUSES = ['Gap Analysis', 'Remediation', 'In Progress', 'Monitoring', 'Compliant', 'Certified'];

const statusIcons: Record<string, JSX.Element> = {
  compliant: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  partial: <AlertCircle className="w-4 h-4 text-amber-400" />,
  gap: <AlertCircle className="w-4 h-4 text-red-400" />,
  na: <MinusCircle className="w-4 h-4 text-slate-500" />,
};

const certificationColors: Record<string, string> = {
  Compliant: 'text-emerald-400',
  Certified: 'text-emerald-400',
  'In Progress': 'text-blue-400',
  'Gap Analysis': 'text-amber-400',
  Remediation: 'text-orange-400',
  Monitoring: 'text-cyan-400',
};

const emptyReq = (framework: string): Partial<ComplianceRequirement> => ({ framework, ref: '', title: '', status: 'gap', owner: '', due_date: null, notes: '' });

export function ComplianceCenter() {
  const navigate = useNavigate();
  const frameworks = useOrgTable<OrgFramework>('org_frameworks', { orderBy: 'framework', ascending: true });
  const reqs = useOrgTable<ComplianceRequirement>('compliance_requirements', { orderBy: 'ref', ascending: true }, true);
  const [activeFramework, setActiveFramework] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reqForm, setReqForm] = useState<Partial<ComplianceRequirement> | null>(null);
  const [reqEditId, setReqEditId] = useState<string | null>(null);
  const [fwForm, setFwForm] = useState<Partial<OrgFramework> | null>(null);
  const { pending, run } = useAction();

  const active = frameworks.rows.filter((f) => f.is_active);
  useEffect(() => {
    if (!activeFramework && active.length) setActiveFramework(active[0].framework);
  }, [active, activeFramework]);

  const stats = active.map((f) => ({ ...frameworkStats(reqs.rows, f.framework), settings: f }));
  const current = stats.find((s) => s.framework === activeFramework) ?? null;
  const requirements = reqs.rows
    .filter((r) => r.framework === activeFramework)
    .filter((r) => statusFilter === 'all' || r.status === statusFilter);
  const tracked = stats.filter((s) => s.total > 0);
  const avgCompliance = tracked.length ? Math.round(tracked.reduce((s, f) => s + f.percentage, 0) / tracked.length) : 0;

  const setR = <K extends keyof ComplianceRequirement>(k: K, v: ComplianceRequirement[K]) => setReqForm((f) => ({ ...f, [k]: v }));
  const setF = <K extends keyof OrgFramework>(k: K, v: OrgFramework[K]) => setFwForm((f) => ({ ...f, [k]: v }));

  const loadTemplate = (framework: string) => run(async () => {
    const template = REQUIREMENT_TEMPLATES[framework] ?? [];
    const existing = new Set(reqs.rows.filter((r) => r.framework === framework).map((r) => r.ref));
    const missing = template.filter((t) => !existing.has(t.ref));
    for (const t of missing) await reqs.create({ framework, ref: t.ref, title: t.title, status: 'gap' });
  }, 'Standard requirements loaded');

  const saveReq = () => run(async () => {
    if (!reqForm?.ref?.trim() || !reqForm.title?.trim()) throw new Error('Reference and title are required');
    if (reqEditId) await reqs.update(reqEditId, reqForm); else await reqs.create(reqForm);
    setReqForm(null);
  }, reqEditId ? 'Requirement updated' : 'Requirement added');

  const saveFw = () => run(async () => {
    if (!fwForm?.id) return;
    await frameworks.update(fwForm.id, fwForm);
    setFwForm(null);
  }, 'Framework updated');

  const setStatus = (r: ComplianceRequirement, status: RequirementStatus) => run(() => reqs.update(r.id, { status }));

  const exportCsv = () => {
    if (!current) return;
    const rows = reqs.rows.filter((r) => r.framework === current.framework);
    const csv = [['Reference', 'Requirement', 'Status', 'Owner', 'Due date', 'Notes'],
      ...rows.map((r) => [r.ref, r.title, r.status, r.owner ?? '', r.due_date ?? '', r.notes ?? ''])]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `gap-analysis-${current.framework.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (frameworks.loading || reqs.loading) return <div className="page-container"><LoadingState /></div>;

  return (
    <div className="page-container">
      <PageHeader
        title="Compliance Center"
        subtitle="Multi-framework regulatory compliance monitoring and gap management"
        breadcrumb={[{ label: 'Compliance' }, { label: 'Compliance Center' }]}
        actions={<button className="btn btn-outline btn-sm" onClick={() => navigate('/settings?tab=organisation')}><SettingsIcon className="w-3.5 h-3.5" /> Manage Frameworks</button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Overall Readiness" value={`${avgCompliance}%`} sublabel="average of tracked frameworks" icon={<BookOpen className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Frameworks Tracked" value={active.length} sublabel="active frameworks" icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Open Gaps" value={stats.reduce((s, f) => s + f.gap, 0)} sublabel="requiring remediation" icon={<AlertCircle className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
        <MetricCard label="Partial" value={stats.reduce((s, f) => s + f.partial, 0)} sublabel="in progress" icon={<AlertCircle className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
      </div>

      {active.length === 0 ? (
        <EmptyState title="No frameworks activated" message="Activate the frameworks that apply to your organisation in Settings → Organisation." action={<button className="btn btn-primary btn-sm" onClick={() => navigate('/settings?tab=organisation')}>Open Settings</button>} />
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {stats.map((f) => (
              <button
                key={f.framework}
                onClick={() => setActiveFramework(f.framework)}
                className={`p-4 rounded-xl border text-left transition-all duration-150 ${activeFramework === f.framework ? 'bg-brand-500/15 border-brand-500/30 shadow-glow' : 'bg-surface-850 border-white/8 hover:border-white/15 hover:bg-surface-800'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-bold text-slate-200">{f.framework}</span>
                  <span className={`text-xs font-semibold ${certificationColors[f.settings.certification_status] ?? 'text-slate-400'}`}>{f.total ? `${f.percentage}%` : '—'}</span>
                </div>
                <ProgressBar value={f.percentage} size="xs" />
                <p className="text-xs text-slate-500 mt-1.5">{f.settings.certification_status}</p>
              </button>
            ))}
          </div>

          {current && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="space-y-4">
                <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-200">{current.framework}</h3>
                    <button className="text-xs text-brand-400 hover:text-brand-300" onClick={() => setFwForm(current.settings)}>Edit</button>
                  </div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative w-20 h-20">
                      <svg viewBox="0 0 80 80" className="-rotate-90 w-20 h-20">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                        <circle cx="40" cy="40" r="32" fill="none" stroke="#3b82f6" strokeWidth="8"
                          strokeDasharray={`${2 * Math.PI * 32}`}
                          strokeDashoffset={`${2 * Math.PI * 32 * (1 - current.percentage / 100)}`}
                          strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center"><span className="text-lg font-bold text-slate-100">{current.percentage}%</span></div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-xs text-slate-400">{current.compliant} Compliant</span></div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-xs text-slate-400">{current.partial} Partial</span></div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-xs text-slate-400">{current.gap} Gaps</span></div>
                      <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500" /><span className="text-xs text-slate-400">{current.na} N/A</span></div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-slate-500">Requirements tracked</span><span className="text-slate-300 font-medium">{current.total}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Certification</span><span className={`font-medium ${certificationColors[current.settings.certification_status] ?? 'text-slate-300'}`}>{current.settings.certification_status}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Auditor</span><span className="text-slate-300 font-medium">{current.settings.auditor || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Last audit</span><span className="text-slate-300 font-medium">{fmtDate(current.settings.last_audit)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Next audit</span><span className="text-slate-300 font-medium">{fmtDate(current.settings.next_audit)}</span></div>
                  </div>
                </div>

                <div className="bg-surface-850 rounded-xl border border-white/8 p-4">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    {REQUIREMENT_TEMPLATES[current.framework] && (
                      <SubmitButton pending={pending} variant="btn-secondary w-full justify-start" onClick={() => loadTemplate(current.framework)}>
                        <Plus className="w-3.5 h-3.5" /> Load standard requirements
                      </SubmitButton>
                    )}
                    <button className="w-full btn btn-outline btn-sm justify-start gap-2" onClick={exportCsv} disabled={!current.total}>
                      <Download className="w-3.5 h-3.5" /> Export gap analysis (CSV)
                    </button>
                    <button className="w-full btn btn-outline btn-sm justify-start gap-2" onClick={() => navigate('/roadmap')}>
                      <BookOpen className="w-3.5 h-3.5" /> Remediation roadmap
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold text-slate-200">Requirements & Controls</h3>
                  <div className="flex items-center gap-2">
                    <select className="select h-8 text-xs w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="all">All statuses</option>
                      {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'na' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <button className="btn btn-primary btn-sm" onClick={() => { setReqEditId(null); setReqForm(emptyReq(current.framework)); }}><Plus className="w-3.5 h-3.5" /> Add</button>
                  </div>
                </div>
                {current.total === 0 ? (
                  <div className="text-center py-12 px-6 text-sm text-slate-500">
                    No requirements tracked for {current.framework} yet.
                    {REQUIREMENT_TEMPLATES[current.framework] ? ' Use “Load standard requirements” to start from the key articles.' : ' Add them manually.'}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-800 border-b border-white/8">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Requirement</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Owner</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Due Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requirements.map((req) => (
                          <tr key={req.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => { setReqEditId(req.id); setReqForm(req); }}>
                            <td className="px-4 py-3">
                              <div className="flex items-start gap-2">
                                {statusIcons[req.status] ?? statusIcons.na}
                                <div><span className="font-mono text-xs text-slate-500">{req.ref}</span><p className="text-sm text-slate-200">{req.title}</p></div>
                              </div>
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <select className="select h-7 text-xs w-auto" value={req.status} onChange={(e) => setStatus(req, e.target.value as RequirementStatus)}>
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s === 'na' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{req.owner || '—'}</td>
                            <td className={`px-4 py-3 hidden lg:table-cell text-xs ${req.status !== 'compliant' && isOverdue(req.due_date) ? 'text-red-400' : 'text-slate-400'}`}>{fmtDate(req.due_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {requirements.length === 0 && <div className="text-center py-8 text-slate-500 text-sm">No requirement with this status.</div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={!!reqForm} onClose={() => setReqForm(null)} title={reqEditId ? 'Edit Requirement' : `Add ${reqForm?.framework ?? ''} Requirement`} size="lg"
        actions={<>
          {reqEditId && <DeleteButton onConfirm={async () => { await reqs.remove(reqEditId); setReqForm(null); }} />}
          <button className="btn btn-outline btn-sm" onClick={() => setReqForm(null)}>Cancel</button>
          <SubmitButton pending={pending} onClick={saveReq}>{reqEditId ? 'Save Changes' : 'Add Requirement'}</SubmitButton>
        </>}
      >
        {reqForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Reference"><input className="input" placeholder="e.g., A.5.1" value={reqForm.ref ?? ''} onChange={(e) => setR('ref', e.target.value)} /></Field>
              <Field label="Title" className="col-span-2"><input className="input" value={reqForm.title ?? ''} onChange={(e) => setR('title', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Status"><select className="select" value={reqForm.status} onChange={(e) => setR('status', e.target.value as RequirementStatus)}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'na' ? 'N/A' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}</select></Field>
              <Field label="Owner"><input className="input" value={reqForm.owner ?? ''} onChange={(e) => setR('owner', e.target.value)} /></Field>
              <Field label="Due Date"><input type="date" className="input" value={reqForm.due_date ?? ''} onChange={(e) => setR('due_date', e.target.value || null)} /></Field>
            </div>
            <Field label="Notes / Evidence"><textarea className="input resize-none" rows={3} placeholder="How is this requirement met? Which controls and evidence?" value={reqForm.notes ?? ''} onChange={(e) => setR('notes', e.target.value)} /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!fwForm} onClose={() => setFwForm(null)} title={`${fwForm?.framework ?? ''} — Certification`} size="md"
        actions={<><button className="btn btn-outline btn-sm" onClick={() => setFwForm(null)}>Cancel</button><SubmitButton pending={pending} onClick={saveFw}>Save</SubmitButton></>}
      >
        {fwForm && (
          <div className="space-y-4">
            <Field label="Certification Status"><select className="select" value={fwForm.certification_status} onChange={(e) => setF('certification_status', e.target.value)}>{CERT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></Field>
            <Field label="Auditor"><input className="input" placeholder="e.g., Bureau Veritas, internal audit" value={fwForm.auditor ?? ''} onChange={(e) => setF('auditor', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Last Audit"><input type="date" className="input" value={fwForm.last_audit ?? ''} onChange={(e) => setF('last_audit', e.target.value || null)} /></Field>
              <Field label="Next Audit"><input type="date" className="input" value={fwForm.next_audit ?? ''} onChange={(e) => setF('next_audit', e.target.value || null)} /></Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
