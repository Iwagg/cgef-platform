import { useState } from 'react';
import { ChartBar as BarChart3, FileText, Download, Calendar, Eye, Shield, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, TrendingUp } from 'lucide-react';
import { mockComplianceFrameworks, mockRisks } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { toast } from '../components/ui/Toast';

const reportTemplates = [
  {
    id: 'executive',
    title: 'Executive Summary',
    description: 'Board-level cyber governance overview with maturity score, key risks, and strategic recommendations.',
    icon: BarChart3,
    color: 'text-brand-400',
    bg: 'bg-brand-500/15',
    lastGenerated: '2026-05-08',
    pages: 4,
    frameworks: ['All'],
    audience: 'Board / COMEX',
  },
  {
    id: 'compliance',
    title: 'Compliance Status Report',
    description: 'Multi-framework compliance readiness with gap analysis, control coverage, and remediation roadmap.',
    icon: CheckCircle,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    lastGenerated: '2026-05-06',
    pages: 12,
    frameworks: ['ISO 27001', 'NIS2', 'DORA', 'RGPD'],
    audience: 'CISO / DPO / Auditor',
  },
  {
    id: 'risk',
    title: 'Risk Register Report',
    description: 'Complete risk inventory with heatmap, treatment plans, residual scores, and trend analysis.',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    lastGenerated: '2026-05-05',
    pages: 8,
    frameworks: ['ISO 27001', 'NIST CSF'],
    audience: 'Risk Manager / CISO',
  },
  {
    id: 'audit',
    title: 'Audit Evidence Package',
    description: 'Structured evidence collection for external auditors with control mapping and acceptance status.',
    icon: FileText,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/15',
    lastGenerated: '2026-04-30',
    pages: 22,
    frameworks: ['ISO 27001', 'SOC 2'],
    audience: 'External Auditor',
  },
  {
    id: 'action',
    title: 'Action Plan Status',
    description: 'Remediation progress, overdue actions, and resource allocation for active security initiatives.',
    icon: TrendingUp,
    color: 'text-violet-400',
    bg: 'bg-violet-500/15',
    lastGenerated: '2026-05-07',
    pages: 6,
    frameworks: ['All'],
    audience: 'Project Manager / CISO',
  },
  {
    id: 'vendor',
    title: 'Third-Party Risk Report',
    description: 'Vendor risk scoring, due diligence status, DPA tracking, and critical third-party exposures.',
    icon: Shield,
    color: 'text-orange-400',
    bg: 'bg-orange-500/15',
    lastGenerated: '2026-04-25',
    pages: 9,
    frameworks: ['DORA', 'ISO 27001'],
    audience: 'Procurement / Legal',
  },
];

function ReportPreview({ id, onClose }: { id: string; onClose: () => void }) {
  const report = reportTemplates.find((r) => r.id === id);
  if (!report) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <div>
            <h2 className="text-base font-semibold text-slate-100">{report.title}</h2>
            <p className="text-xs text-slate-400 mt-0.5">Preview — Nexus Finance Group · May 2026</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => { toast({ type: 'success', title: 'Report exported', message: 'PDF downloaded successfully' }); onClose(); }}>
              <Download className="w-3.5 h-3.5" /> Export PDF
            </button>
            <button onClick={onClose} className="btn-ghost btn-icon">×</button>
          </div>
        </div>
        <div className="p-6">
          {/* Report header */}
          <div className="mb-6 pb-4 border-b border-white/8">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-5 h-5 rounded bg-brand-500 flex items-center justify-center"><Shield className="w-3 h-3 text-white" /></div>
                  <span className="text-xs font-bold text-brand-400 uppercase tracking-widest">CGEF Platform</span>
                </div>
                <h1 className="text-xl font-bold text-slate-100">{report.title}</h1>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p className="font-medium text-slate-200">Nexus Finance Group</p>
                <p>Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p>Audience: {report.audience}</p>
              </div>
            </div>
          </div>

          {/* Executive Summary section */}
          <div className="mb-5">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-3">1. Executive Summary</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Cyber Maturity Score', value: '3.2 / 5.0', color: 'text-brand-400' },
                { label: 'Overall Compliance', value: '68%', color: 'text-emerald-400' },
                { label: 'Critical Risks Open', value: '7', color: 'text-red-400' },
                { label: 'Audit Readiness', value: '61%', color: 'text-cyan-400' },
              ].map((m) => (
                <div key={m.label} className="bg-white/4 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-0.5">{m.label}</p>
                  <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              This report presents the cyber security posture of Nexus Finance Group as of May 2026.
              The organization has made measurable progress in its maturity journey, with an overall score of 3.2/5 representing a Defined maturity level.
              Key regulatory deadlines in 2026 require focused attention on NIS2 (October 17) and DORA (January 17, 2027) compliance programs.
            </p>
          </div>

          {/* Compliance section */}
          <div className="mb-5">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-3">2. Compliance Readiness</h2>
            <div className="space-y-2">
              {mockComplianceFrameworks.slice(0, 4).map((f) => (
                <div key={f.id} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-24">{f.name}</span>
                  <div className="flex-1 h-2 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500 transition-all duration-500" style={{ width: `${f.percentage}%` }} />
                  </div>
                  <span className="text-xs font-bold text-slate-200 w-12 text-right">{f.percentage}%</span>
                  <span className="text-xs text-slate-500 w-24">{f.certificationStatus}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Risk section */}
          <div className="mb-5">
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-3">3. Top Risks</h2>
            <div className="space-y-1.5">
              {mockRisks.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-xs">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${r.severity === 'critical' ? 'bg-red-500/20 text-red-300' : r.severity === 'high' ? 'bg-orange-500/20 text-orange-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {r.severity.toUpperCase()}
                  </span>
                  <span className="text-slate-300 flex-1">{r.title}</span>
                  <span className="text-slate-500">Residual: {r.residualScore}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-3">4. Board Recommendations</h2>
            <ul className="space-y-2">
              {[
                'Approve €380K DORA ICT Resilience program — deadline January 17, 2027',
                'Accelerate PAM deployment (budget: €85K, completion: Q3 2026)',
                'Initiate NIS2 supply chain security controls ahead of October 2026 deadline',
                'Conduct quarterly risk committee review for critical risks R-001 and R-002',
              ].map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-brand-400 font-bold flex-shrink-0">{i + 1}.</span>{rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Reporting() {
  const [preview, setPreview] = useState<string | null>(null);

  const handleExport = (id: string) => {
    toast({ type: 'success', title: 'Report exported', message: `${reportTemplates.find(r => r.id === id)?.title} downloaded as PDF` });
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Reports"
        subtitle="Generate and export professional compliance and security reports"
        breadcrumb={[{ label: 'Planning' }, { label: 'Reports' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Available Templates" value={reportTemplates.length} sublabel="report types" icon={<FileText className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Last Generated" value="Today" sublabel="Executive Summary" icon={<Calendar className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Reports This Month" value={12} sublabel="across all types" icon={<BarChart3 className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" />
        <MetricCard label="Scheduled Reports" value={3} sublabel="auto-generated" icon={<Calendar className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reportTemplates.map((report) => (
          <div key={report.id} className="bg-surface-850 rounded-xl border border-white/8 p-5 hover:border-white/15 hover:bg-surface-800 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${report.bg} flex items-center justify-center`}>
                <report.icon className={`w-5 h-5 ${report.color}`} />
              </div>
              <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{report.pages} pages</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">{report.title}</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{report.description}</p>
            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between"><span className="text-slate-500">Audience</span><span className="text-slate-300">{report.audience}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Last generated</span><span className="text-slate-300">{new Date(report.lastGenerated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-secondary btn-sm flex-1 gap-1.5"
                onClick={() => setPreview(report.id)}
              >
                <Eye className="w-3 h-3" /> Preview
              </button>
              <button
                className="btn btn-outline btn-sm gap-1.5"
                onClick={() => handleExport(report.id)}
              >
                <Download className="w-3 h-3" /> Export
              </button>
            </div>
          </div>
        ))}
      </div>

      {preview && <ReportPreview id={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
