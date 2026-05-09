import { useState } from 'react';
import { FileText, Plus, Search, CircleCheck as CheckCircle, Clock, CircleAlert as AlertCircle, CreditCard as Edit, Eye } from 'lucide-react';
import { mockPolicies } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge, FrameworkBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';

export function PoliciesDocuments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selected, setSelected] = useState<typeof mockPolicies[0] | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = mockPolicies.filter((p) => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    return true;
  });

  const approved = mockPolicies.filter((p) => p.status === 'approved').length;
  const underReview = mockPolicies.filter((p) => p.status === 'under_review').length;
  const draft = mockPolicies.filter((p) => p.status === 'draft').length;

  const statusIcon = {
    approved: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    under_review: <Clock className="w-4 h-4 text-amber-400" />,
    draft: <Edit className="w-4 h-4 text-slate-400" />,
    expired: <AlertCircle className="w-4 h-4 text-red-400" />,
  } as Record<string, JSX.Element>;

  return (
    <div className="page-container">
      <PageHeader
        title="Policies & Documents"
        subtitle="Security policy library with versioning and approval workflows"
        breadcrumb={[{ label: 'Compliance' }, { label: 'Policies & Documents' }]}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            <Plus className="w-3.5 h-3.5" />
            New Policy
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Documents" value={mockPolicies.length} sublabel="in repository" icon={<FileText className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Approved" value={approved} sublabel="active policies" icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Under Review" value={underReview} sublabel="pending approval" icon={<Clock className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
        <MetricCard label="Drafts" value={draft} sublabel="work in progress" icon={<Edit className="w-4 h-4 text-slate-400" />} iconBg="bg-slate-500/15" />
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 h-9 text-sm" placeholder="Search policies..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['All', 'approved', 'under_review', 'draft'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              {s === 'All' ? 'All' : s === 'under_review' ? 'Under Review' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} documents</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="bg-surface-850 rounded-xl border border-white/8 p-5 hover:border-white/15 hover:bg-surface-800 transition-all cursor-pointer group"
            onClick={() => setSelected(p)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                {statusIcon[p.status] ?? <FileText className="w-4 h-4 text-slate-400" />}
              </div>
              <StatusBadge status={p.status} size="sm" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1 group-hover:text-white transition-colors">{p.title}</h3>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-slate-500">v{p.version}</span>
              <span className="text-xs text-slate-600">·</span>
              <FrameworkBadge framework={p.framework} />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Owner</span>
                <span className="text-slate-300">{p.owner.split(' ')[0]}</span>
              </div>
              {p.approvedBy && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Approved by</span>
                  <span className="text-slate-300">{p.approvedBy.split(' ')[0]}</span>
                </div>
              )}
              {p.lastReview && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Last review</span>
                  <span className="text-slate-300">{new Date(p.lastReview).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              )}
              {p.nextReview && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Next review</span>
                  <span className={`${new Date(p.nextReview) < new Date(Date.now() + 30*24*60*60*1000) ? 'text-amber-400' : 'text-slate-300'}`}>
                    {new Date(p.nextReview).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="btn btn-secondary btn-sm flex-1 gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Eye className="w-3 h-3" /> Preview
              </button>
              <button className="btn btn-outline btn-sm flex-1 gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Edit className="w-3 h-3" /> Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-panel max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-white/8">
              <div>
                <div className="flex items-center gap-2 mb-1"><span className="font-mono text-xs text-slate-500">{selected.id}</span><StatusBadge status={selected.status} size="sm" /></div>
                <h2 className="text-base font-semibold text-slate-100">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost btn-icon ml-3">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Version', value: `v${selected.version}` },
                  { label: 'Framework', value: selected.framework },
                  { label: 'Owner', value: selected.owner },
                  { label: 'Approved By', value: selected.approvedBy ?? 'Pending' },
                  { label: 'Last Review', value: selected.lastReview ? new Date(selected.lastReview).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
                  { label: 'Next Review', value: selected.nextReview ? new Date(selected.nextReview).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—' },
                ].map((f) => (
                  <div key={f.label} className="bg-white/4 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-slate-200">{f.value}</p>
                  </div>
                ))}
              </div>
              <div className="bg-white/3 rounded-xl p-4 border border-white/8">
                <div className="flex items-center gap-2 mb-2"><FileText className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-400">Document Preview</span></div>
                <div className="space-y-1.5">
                  <div className="h-2.5 bg-white/10 rounded-full w-full" />
                  <div className="h-2.5 bg-white/8 rounded-full w-4/5" />
                  <div className="h-2.5 bg-white/6 rounded-full w-3/4" />
                  <div className="h-2.5 bg-white/8 rounded-full w-full" />
                  <div className="h-2.5 bg-white/6 rounded-full w-2/3" />
                </div>
                <p className="text-xs text-slate-500 mt-3">Click "Open Document" to view full policy content</p>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2 border-t border-white/8 pt-4">
              <button className="btn btn-secondary btn-sm flex-1">Open Document</button>
              {selected.status === 'under_review' && <button className="btn btn-success btn-sm">Approve</button>}
              {selected.status === 'draft' && <button className="btn btn-outline btn-sm">Submit for Review</button>}
            </div>
          </div>
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create New Policy" size="md"
        actions={<><button className="btn btn-outline btn-sm" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary btn-sm">Create Policy</button></>}
      >
        <div className="space-y-4">
          <div><label className="label">Policy Title</label><input className="input" placeholder="e.g., Endpoint Security Policy" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Framework</label><select className="select"><option>ISO 27001</option><option>NIS2</option><option>DORA</option><option>RGPD</option><option>CIS Controls</option></select></div>
            <div><label className="label">Owner</label><input className="input" placeholder="Policy owner" /></div>
          </div>
          <div><label className="label">Use Template</label>
            <select className="select">
              <option value="">Start from scratch</option>
              <option>Information Security Policy (ISO 27001)</option>
              <option>Incident Response Plan (NIS2)</option>
              <option>Data Protection Policy (RGPD)</option>
              <option>Access Control Policy (ISO 27001)</option>
              <option>Business Continuity Plan (DORA)</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
