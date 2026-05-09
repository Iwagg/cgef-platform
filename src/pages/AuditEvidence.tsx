import { useState } from 'react';
import { FlaskConical, Upload, CircleCheck as CheckCircle, Circle as XCircle, Clock, Search, File, FileText, Image, Table } from 'lucide-react';
import { mockEvidences } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge, FrameworkBadge } from '../components/ui/StatusBadge';

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

export function AuditEvidence() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const filtered = mockEvidences.filter((e) => {
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'All' && e.status !== statusFilter) return false;
    return true;
  });

  const accepted = mockEvidences.filter((e) => e.status === 'accepted').length;
  const pending = mockEvidences.filter((e) => e.status === 'provided' || e.status === 'reviewed').length;
  const requested = mockEvidences.filter((e) => e.status === 'requested').length;
  const coverage = Math.round((accepted / mockEvidences.length) * 100);

  return (
    <div className="page-container">
      <PageHeader
        title="Audit & Evidence"
        subtitle="Evidence repository for audit readiness across all compliance frameworks"
        breadcrumb={[{ label: 'Compliance' }, { label: 'Audit & Evidence' }]}
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>
            <Upload className="w-3.5 h-3.5" />
            Upload Evidence
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Evidence Coverage" value={`${coverage}%`} trend={8} trendLabel="vs Q1" icon={<CheckCircle className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Accepted" value={accepted} sublabel="validated by auditor" icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Pending Review" value={pending} sublabel="awaiting validation" icon={<Clock className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
        <MetricCard label="Requested" value={requested} sublabel="evidence required" icon={<XCircle className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
      </div>

      {/* Checklist banner */}
      <div className="bg-surface-850 border border-white/8 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-200">ISO 27001 Audit Readiness Checklist</h3>
          <span className="text-xs text-slate-500">Audit scheduled: 30 Nov 2026</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Policies & Procedures', done: 8, total: 10 },
            { label: 'Technical Evidence', done: 12, total: 18 },
            { label: 'Training Records', done: 3, total: 4 },
            { label: 'Audit Trail Logs', done: 6, total: 8 },
          ].map((item) => (
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

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input className="input pl-9 h-9 text-sm" placeholder="Search evidence..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['All', 'accepted', 'reviewed', 'provided', 'requested', 'rejected'].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
            >
              {s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} items</span>
      </div>

      {/* Evidence grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((e) => (
          <div key={e.id} className={`bg-surface-850 rounded-xl border p-4 hover:border-white/15 transition-all cursor-pointer ${statusColors[e.status] ?? 'border-white/8'}`}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                {fileIcons[e.type] ?? <File className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 leading-tight">{e.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">{e.type}</span>
                  {e.fileSize && <span className="text-xs text-slate-500">· {e.fileSize}</span>}
                </div>
              </div>
              <StatusBadge status={e.status} size="sm" />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <FrameworkBadge framework={e.framework} />
                <span className="text-slate-600 font-mono">{e.control}</span>
              </div>
              <span className="text-slate-500">{e.uploadedAt ? new Date(e.uploadedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Pending'}</span>
            </div>
            {e.status === 'rejected' && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                Evidence rejected — resubmission required
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal-panel max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/8">
              <h2 className="text-base font-semibold text-slate-100">Upload Evidence</h2>
              <button onClick={() => setShowUpload(false)} className="btn-ghost btn-icon">×</button>
            </div>
            <div className="p-5 space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver ? 'border-brand-500 bg-brand-500/5' : 'border-white/15 hover:border-white/25'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
              >
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-3" />
                <p className="text-sm text-slate-300 font-medium">Drop files here or click to upload</p>
                <p className="text-xs text-slate-500 mt-1">PDF, DOCX, XLSX, PNG, JPG · Max 50MB</p>
                <button className="btn btn-secondary btn-sm mt-3">Browse Files</button>
              </div>
              <div><label className="label">Title</label><input className="input" placeholder="Evidence title" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Type</label>
                  <select className="select">
                    <option>Policy</option><option>Report</option><option>Screenshot</option>
                    <option>Certificate</option><option>Assessment</option><option>Audit Report</option>
                  </select>
                </div>
                <div><label className="label">Framework</label>
                  <select className="select">
                    <option>ISO 27001</option><option>NIS2</option><option>DORA</option>
                    <option>RGPD</option><option>NIST CSF</option><option>CIS Controls</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Linked Control</label><input className="input" placeholder="e.g., C-001" /></div>
            </div>
            <div className="px-5 pb-5 flex gap-2 justify-end border-t border-white/8 pt-4">
              <button className="btn btn-outline btn-sm" onClick={() => setShowUpload(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={() => setShowUpload(false)}>Upload Evidence</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
