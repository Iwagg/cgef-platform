import { useState } from 'react';
import { BookOpen, CircleCheck as CheckCircle, CircleAlert as AlertCircle, CircleMinus as MinusCircle, ChevronRight, ExternalLink } from 'lucide-react';
import { mockComplianceFrameworks } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { StatusBadge } from '../components/ui/StatusBadge';

const frameworkDetails: Record<string, { requirements: Array<{ id: string; title: string; status: string; owner: string; dueDate: string | null }> }> = {
  iso27001: {
    requirements: [
      { id: 'A.5.1', title: 'Policies for information security', status: 'compliant', owner: 'A. Dubois', dueDate: null },
      { id: 'A.5.2', title: 'Information security roles and responsibilities', status: 'compliant', owner: 'A. Dubois', dueDate: null },
      { id: 'A.5.15', title: 'Access control', status: 'compliant', owner: 'T. Bernard', dueDate: null },
      { id: 'A.5.23', title: 'Information security for use of cloud services', status: 'partial', owner: 'S. Laurent', dueDate: '2026-09-30' },
      { id: 'A.6.1', title: 'Screening of personnel', status: 'compliant', owner: 'HR', dueDate: null },
      { id: 'A.7.1', title: 'Physical security perimeters', status: 'compliant', owner: 'Facilities', dueDate: null },
      { id: 'A.8.8', title: 'Management of technical vulnerabilities', status: 'partial', owner: 'C. Rousseau', dueDate: '2026-07-31' },
      { id: 'A.8.15', title: 'Logging', status: 'partial', owner: 'T. Bernard', dueDate: '2026-08-31' },
      { id: 'A.8.24', title: 'Use of cryptography', status: 'compliant', owner: 'T. Bernard', dueDate: null },
      { id: 'A.8.25', title: 'Secure development lifecycle', status: 'gap', owner: 'Dev Team', dueDate: '2026-10-31' },
    ]
  },
  nis2: {
    requirements: [
      { id: 'Art.21.1', title: 'Policies on risk analysis and information system security', status: 'partial', owner: 'A. Dubois', dueDate: '2026-10-17' },
      { id: 'Art.21.2', title: 'Incident handling and reporting', status: 'partial', owner: 'A. Dubois', dueDate: '2026-10-17' },
      { id: 'Art.21.3', title: 'Business continuity and crisis management', status: 'gap', owner: 'A. Dubois', dueDate: '2026-10-17' },
      { id: 'Art.21.4', title: 'Supply chain security', status: 'gap', owner: 'S. Laurent', dueDate: '2026-10-17' },
      { id: 'Art.21.5', title: 'Security in network and information systems', status: 'partial', owner: 'T. Bernard', dueDate: '2026-10-17' },
      { id: 'Art.21.6', title: 'Cybersecurity training and hygiene', status: 'partial', owner: 'C. Rousseau', dueDate: '2026-10-17' },
      { id: 'Art.23', title: 'Reporting obligations for significant incidents', status: 'partial', owner: 'A. Dubois', dueDate: '2026-10-17' },
      { id: 'Art.24', title: 'Use of European cybersecurity certification schemes', status: 'gap', owner: 'A. Dubois', dueDate: '2027-01-01' },
    ]
  },
  dora: {
    requirements: [
      { id: 'Art.5', title: 'ICT risk management framework', status: 'partial', owner: 'A. Dubois', dueDate: '2027-01-17' },
      { id: 'Art.8', title: 'Identification of ICT assets and risks', status: 'partial', owner: 'T. Bernard', dueDate: '2027-01-17' },
      { id: 'Art.10', title: 'Protection and prevention measures', status: 'compliant', owner: 'T. Bernard', dueDate: null },
      { id: 'Art.11', title: 'Detection of anomalous activities', status: 'partial', owner: 'C. Rousseau', dueDate: '2026-09-30' },
      { id: 'Art.17', title: 'ICT-related incident management process', status: 'partial', owner: 'A. Dubois', dueDate: '2026-07-01' },
      { id: 'Art.19', title: 'Reporting of major ICT-related incidents', status: 'gap', owner: 'A. Dubois', dueDate: '2026-07-01' },
      { id: 'Art.25', title: 'Digital operational resilience testing programme', status: 'gap', owner: 'S. Laurent', dueDate: '2027-01-17' },
      { id: 'Art.28', title: 'Third-party ICT risk management', status: 'gap', owner: 'S. Laurent', dueDate: '2027-01-17' },
    ]
  },
  rgpd: {
    requirements: [
      { id: 'Art.5', title: 'Principles relating to processing of personal data', status: 'compliant', owner: 'DPO', dueDate: null },
      { id: 'Art.12-23', title: 'Rights of data subjects (DSAR)', status: 'compliant', owner: 'DPO', dueDate: null },
      { id: 'Art.25', title: 'Data protection by design and by default', status: 'partial', owner: 'DPO', dueDate: '2026-09-30' },
      { id: 'Art.30', title: 'Records of processing activities', status: 'compliant', owner: 'DPO', dueDate: null },
      { id: 'Art.32', title: 'Security of processing', status: 'compliant', owner: 'T. Bernard', dueDate: null },
      { id: 'Art.33', title: 'Notification of personal data breach', status: 'compliant', owner: 'DPO', dueDate: null },
      { id: 'Art.35', title: 'Data protection impact assessment (DPIA)', status: 'partial', owner: 'DPO', dueDate: '2026-07-31' },
    ]
  },
};

const statusIcons: Record<string, JSX.Element> = {
  compliant: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  partial: <AlertCircle className="w-4 h-4 text-amber-400" />,
  gap: <AlertCircle className="w-4 h-4 text-red-400" />,
  na: <MinusCircle className="w-4 h-4 text-slate-500" />,
};

const certificationColors: Record<string, string> = {
  'Compliant': 'text-emerald-400',
  'In Progress': 'text-blue-400',
  'Gap Analysis': 'text-amber-400',
  'Remediation': 'text-orange-400',
  'Monitoring': 'text-cyan-400',
};

export function ComplianceCenter() {
  const [activeFramework, setActiveFramework] = useState('iso27001');
  const framework = mockComplianceFrameworks.find((f) => f.id === activeFramework);
  const details = frameworkDetails[activeFramework] ?? { requirements: [] };

  const avgCompliance = Math.round(
    mockComplianceFrameworks.reduce((sum, f) => sum + f.percentage, 0) / mockComplianceFrameworks.length
  );

  return (
    <div className="page-container">
      <PageHeader
        title="Compliance Center"
        subtitle="Multi-framework regulatory compliance monitoring and gap management"
        breadcrumb={[{ label: 'Compliance' }, { label: 'Compliance Center' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Overall Readiness" value={`${avgCompliance}%`} trend={4} trendLabel="vs Q1" icon={<BookOpen className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Frameworks Tracked" value={mockComplianceFrameworks.length} sublabel="active frameworks" icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Open Gaps" value={mockComplianceFrameworks.reduce((s, f) => s + f.gap, 0)} sublabel="requiring remediation" icon={<AlertCircle className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
        <MetricCard label="Partial Controls" value={mockComplianceFrameworks.reduce((s, f) => s + f.partial, 0)} sublabel="in progress" icon={<AlertCircle className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
      </div>

      {/* Framework selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-6">
        {mockComplianceFrameworks.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFramework(f.id)}
            className={`p-4 rounded-xl border text-left transition-all duration-150 ${
              activeFramework === f.id
                ? 'bg-brand-500/15 border-brand-500/30 shadow-glow'
                : 'bg-surface-850 border-white/8 hover:border-white/15 hover:bg-surface-800'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-bold text-slate-200">{f.name}</span>
              <span className={`text-xs font-semibold ${certificationColors[f.certificationStatus] ?? 'text-slate-400'}`}>{f.percentage}%</span>
            </div>
            <ProgressBar value={f.percentage} size="xs" />
            <p className="text-xs text-slate-500 mt-1.5">{f.certificationStatus}</p>
          </button>
        ))}
      </div>

      {framework && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: framework summary */}
          <div className="space-y-4">
            <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-4">{framework.name} {framework.version}</h3>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-20 h-20">
                  <svg viewBox="0 0 80 80" className="-rotate-90 w-20 h-20">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#3b82f6" strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 32}`}
                      strokeDashoffset={`${2 * Math.PI * 32 * (1 - framework.percentage / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-slate-100">{framework.percentage}%</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-xs text-slate-400">{framework.compliant} Compliant</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-xs text-slate-400">{framework.partial} Partial</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-xs text-slate-400">{framework.gap} Gaps</span></div>
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500" /><span className="text-xs text-slate-400">{framework.na} N/A</span></div>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Total controls</span><span className="text-slate-300 font-medium">{framework.totalControls}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Certification</span><span className={`font-medium ${certificationColors[framework.certificationStatus]}`}>{framework.certificationStatus}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Auditor</span><span className="text-slate-300 font-medium">{framework.auditor}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Last audit</span><span className="text-slate-300 font-medium">{new Date(framework.lastAudit).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Next audit</span><span className="text-slate-300 font-medium">{new Date(framework.nextAudit).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>
              </div>
            </div>

            <div className="bg-surface-850 rounded-xl border border-white/8 p-4">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full btn btn-secondary btn-sm justify-start gap-2">
                  <ExternalLink className="w-3.5 h-3.5" /> Gap Analysis Report
                </button>
                <button className="w-full btn btn-outline btn-sm justify-start gap-2">
                  <ChevronRight className="w-3.5 h-3.5" /> Remediation Roadmap
                </button>
              </div>
            </div>
          </div>

          {/* Right: requirements table */}
          <div className="lg:col-span-2 bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Requirements & Controls</h3>
              <span className="text-xs text-slate-500">{details.requirements.length} requirements</span>
            </div>
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
                  {details.requirements.map((req) => (
                    <tr key={req.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {statusIcons[req.status] ?? statusIcons.na}
                          <div>
                            <span className="font-mono text-xs text-slate-500">{req.id}</span>
                            <p className="text-sm text-slate-200">{req.title}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={req.status} size="sm" /></td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{req.owner}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">
                        {req.dueDate ? new Date(req.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
