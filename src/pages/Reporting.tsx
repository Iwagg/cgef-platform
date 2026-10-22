import { useState } from 'react';
import { ChartBar as BarChart3, FileText, Download, Eye, Shield, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, TrendingUp, Database } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { Modal } from '../components/ui/Modal';
import { toast } from '../components/ui/Toast';
import { useOrgTable, errorMessage } from '../hooks/useOrgTable';
import { useAssessmentHistory } from '../hooks/useAssessmentHistory';
import { useAuthStore } from '../stores/auth';
import { logAudit } from '../lib/supabase';
import { hasRole } from '../lib/rbac';
import { PILLARS } from '../lib/cgef-framework';
import { frameworkStats } from '../lib/metrics';
import { downloadReport, type ReportSection } from '../lib/pdf-report';
import { fmtDate, fmtMoney, isOverdue, capitalize } from '../lib/format';
import type { Risk, RemediationAction, Incident, Control, Evidence, ComplianceRequirement, OrgFramework, ThirdParty } from '../lib/db-types';
import type { PillarId } from '../lib/types';

const reportTemplates = [
  { id: 'executive', title: 'Executive Summary', description: 'Board-level cyber governance overview with maturity score, key risks, and priorities.', icon: BarChart3, color: 'text-brand-400', bg: 'bg-brand-500/15', audience: 'Board / COMEX' },
  { id: 'compliance', title: 'Compliance Status Report', description: 'Multi-framework readiness with gap analysis per requirement.', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/15', audience: 'CISO / DPO / Auditor' },
  { id: 'risk', title: 'Risk Register Report', description: 'Complete risk inventory with scores, treatment and owners.', icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/15', audience: 'Risk Manager / CISO' },
  { id: 'audit', title: 'Audit Evidence Package', description: 'Evidence list with control mapping and acceptance status.', icon: FileText, color: 'text-cyan-400', bg: 'bg-cyan-500/15', audience: 'External Auditor' },
  { id: 'action', title: 'Action Plan Status', description: 'Remediation progress, overdue actions, and budget of active initiatives.', icon: TrendingUp, color: 'text-violet-400', bg: 'bg-violet-500/15', audience: 'Project Manager / CISO' },
  { id: 'vendor', title: 'Third-Party Risk Report', description: 'Vendor risk scoring, tiering, DPA tracking and assessments due.', icon: Shield, color: 'text-orange-400', bg: 'bg-orange-500/15', audience: 'Procurement / Legal' },
] as const;

type ReportId = typeof reportTemplates[number]['id'];

function SectionPreview({ section, index }: { section: ReportSection; index: number }) {
  return (
    <div className="mb-5">
      <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide mb-3">{index + 1}. {section.title}</h2>
      {section.metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {section.metrics.map((m) => (
            <div key={m.label} className="bg-white/4 rounded-lg p-3"><p className="text-xs text-slate-500 mb-0.5">{m.label}</p><p className="text-lg font-bold text-slate-100">{m.value}</p></div>
          ))}
        </div>
      )}
      {section.paragraphs?.map((p, i) => <p key={i} className="text-xs text-slate-400 leading-relaxed mb-2">{p}</p>)}
      {section.table && (
        <div className="overflow-x-auto border border-white/8 rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-surface-800"><tr>{section.table.columns.map((c) => <th key={c} className="px-3 py-2 text-left text-slate-400 font-semibold">{c}</th>)}</tr></thead>
            <tbody>
              {section.table.rows.slice(0, 12).map((r, i) => <tr key={i} className="border-t border-white/5">{r.map((c, j) => <td key={j} className="px-3 py-2 text-slate-300">{c}</td>)}</tr>)}
            </tbody>
          </table>
          {section.table.rows.length > 12 && <p className="text-xs text-slate-500 px-3 py-2">… {section.table.rows.length - 12} more rows in the PDF</p>}
          {section.table.rows.length === 0 && <p className="text-xs text-slate-500 px-3 py-2">No data.</p>}
        </div>
      )}
    </div>
  );
}

export function Reporting() {
  const { organization, profile } = useAuthStore();
  const risks = useOrgTable<Risk>('risks', { orderBy: 'ref', ascending: true }).rows;
  const actions = useOrgTable<RemediationAction>('action_plans', { orderBy: 'due_date', ascending: true }).rows.filter((a) => a.status !== 'cancelled');
  const incidents = useOrgTable<Incident>('incidents').rows;
  const controls = useOrgTable<Control>('controls').rows;
  const evidences = useOrgTable<Evidence>('evidences', { orderBy: 'framework', ascending: true }).rows;
  const requirements = useOrgTable<ComplianceRequirement>('compliance_requirements', { orderBy: 'ref', ascending: true }, true).rows;
  const frameworks = useOrgTable<OrgFramework>('org_frameworks', { orderBy: 'framework', ascending: true }).rows;
  const vendors = useOrgTable<ThirdParty>('third_parties', { orderBy: 'risk_score', ascending: false }).rows;
  const { latest } = useAssessmentHistory();
  const [preview, setPreview] = useState<ReportId | null>(null);
  const canExport = hasRole(profile?.role, 'manager');

  const orgName = organization?.name ?? 'Organisation';
  const fwStats = frameworks.filter((f) => f.is_active).map((f) => ({ ...frameworkStats(requirements, f.framework), cert: f.certification_status }));
  const tracked = fwStats.filter((f) => f.total > 0);
  const compliance = tracked.length ? Math.round(tracked.reduce((s, f) => s + f.percentage, 0) / tracked.length) : 0;
  const openRisks = risks.filter((r) => r.status !== 'closed');
  const critical = openRisks.filter((r) => r.severity === 'critical');
  const openActions = actions.filter((a) => a.status !== 'done');
  const overdue = openActions.filter((a) => isOverdue(a.due_date));
  const accepted = evidences.filter((e) => e.status === 'accepted').length;
  const maturity = latest ? `${Number(latest.score.global_score).toFixed(1)} / 5 (${latest.score.cgs_tier})` : 'Not assessed';

  const riskTable = (list: Risk[]) => ({
    columns: ['ID', 'Risk', 'Severity', 'L x I', 'Residual', 'Status', 'Owner', 'Due'],
    widths: [12, 52, 16, 12, 14, 18, 24, 18],
    rows: list.map((r) => [r.ref, r.title, capitalize(r.severity), `${r.likelihood}x${r.impact}`, String(r.residual_score ?? '—'), capitalize(r.status), r.owner ?? '—', fmtDate(r.due_date)]),
  });

  const build = (id: ReportId): ReportSection[] => {
    switch (id) {
      case 'executive': {
        const pillarScores = (latest?.score.pillar_scores ?? {}) as Record<PillarId, number>;
        return [
          {
            title: 'Key Indicators',
            metrics: [
              { label: 'Cyber Maturity', value: maturity },
              { label: 'Compliance Readiness', value: `${compliance}%` },
              { label: 'Critical Risks Open', value: String(critical.length) },
              { label: 'Overdue Actions', value: String(overdue.length) },
            ],
            paragraphs: [
              `This report presents the cyber security posture of ${orgName} as of ${fmtDate(new Date().toISOString(), 'long')}. ` +
              (latest ? `The latest CGEF assessment ("${latest.assessment.name}") gives a global maturity of ${maturity}. ` : 'No CGEF maturity assessment has been completed yet. ') +
              `${openRisks.length} risks are open (${critical.length} critical), ${incidents.filter((i) => i.status === 'open' || i.status === 'investigating').length} incidents are being handled and ${openActions.length} remediation actions are in progress.`,
            ],
          },
          ...(latest ? [{
            title: 'Maturity by Pillar',
            table: { columns: ['Pillar', 'Score', 'Weight'], widths: [70, 15, 15], rows: PILLARS.map((p) => [`${p.id} - ${p.name}`, Number(pillarScores[p.id] ?? 0).toFixed(1), `${Math.round(p.weight * 100)}%`]) },
          }] : []),
          {
            title: 'Regulatory Readiness',
            table: { columns: ['Framework', 'Readiness', 'Gaps', 'Status'], widths: [30, 20, 15, 35], rows: tracked.map((f) => [f.framework, `${f.percentage}%`, String(f.gap), f.cert]) },
          },
          { title: 'Top Risks', table: riskTable([...openRisks].sort((a, b) => b.inherent_score - a.inherent_score).slice(0, 8)) },
          {
            title: 'Priority Actions',
            table: {
              columns: ['ID', 'Action', 'Priority', 'Progress', 'Due'], widths: [14, 60, 16, 14, 18],
              rows: openActions.filter((a) => a.priority === 'critical' || a.priority === 'high').slice(0, 10).map((a) => [a.ref, a.title, capitalize(a.priority), `${a.progress}%`, fmtDate(a.due_date)]),
            },
          },
        ];
      }
      case 'compliance':
        return [
          { title: 'Summary', metrics: [{ label: 'Overall Readiness', value: `${compliance}%` }, { label: 'Frameworks', value: String(tracked.length) }, { label: 'Open Gaps', value: String(fwStats.reduce((s, f) => s + f.gap, 0)) }, { label: 'Partial', value: String(fwStats.reduce((s, f) => s + f.partial, 0)) }] },
          { title: 'Readiness by Framework', table: { columns: ['Framework', 'Readiness', 'Compliant', 'Partial', 'Gap', 'N/A', 'Status'], widths: [24, 14, 12, 12, 10, 10, 24], rows: tracked.map((f) => [f.framework, `${f.percentage}%`, String(f.compliant), String(f.partial), String(f.gap), String(f.na), f.cert]) } },
          { title: 'Gap Analysis (non-compliant requirements)', table: { columns: ['Framework', 'Ref', 'Requirement', 'Status', 'Owner', 'Due'], widths: [18, 16, 56, 12, 20, 18], rows: requirements.filter((r) => r.status === 'gap' || r.status === 'partial').map((r) => [r.framework, r.ref, r.title, capitalize(r.status), r.owner ?? '—', fmtDate(r.due_date)]) } },
        ];
      case 'risk':
        return [
          { title: 'Summary', metrics: [{ label: 'Open Risks', value: String(openRisks.length) }, { label: 'Critical', value: String(critical.length) }, { label: 'High', value: String(openRisks.filter((r) => r.severity === 'high').length) }, { label: 'Closed', value: String(risks.length - openRisks.length) }] },
          { title: 'Risk Register', table: riskTable(risks) },
        ];
      case 'audit':
        return [
          { title: 'Summary', metrics: [{ label: 'Evidence Items', value: String(evidences.length) }, { label: 'Accepted', value: String(accepted) }, { label: 'Pending Review', value: String(evidences.filter((e) => e.status === 'provided' || e.status === 'reviewed').length) }, { label: 'Controls Implemented', value: `${controls.filter((c) => c.status === 'implemented').length}/${controls.length}` }] },
          { title: 'Evidence Register', table: { columns: ['ID', 'Evidence', 'Framework', 'Control', 'Status', 'Reviewer', 'Uploaded'], widths: [12, 50, 18, 14, 16, 22, 18], rows: evidences.map((e) => [e.ref, e.title, e.framework ?? '—', e.control_ref ?? '—', capitalize(e.status), e.reviewer ?? '—', fmtDate(e.uploaded_at)]) } },
          { title: 'Controls', table: { columns: ['ID', 'Control', 'Status', 'Effectiveness', 'Frameworks'], widths: [12, 50, 20, 16, 40], rows: controls.map((c) => [c.ref, c.title, capitalize(c.status), `${c.effectiveness}/5`, c.frameworks.join(', ')]) } },
        ];
      case 'action':
        return [
          { title: 'Summary', metrics: [{ label: 'Open Actions', value: String(openActions.length) }, { label: 'Overdue', value: String(overdue.length) }, { label: 'Completed', value: String(actions.length - openActions.length) }, { label: 'Budget (open)', value: fmtMoney(openActions.reduce((s, a) => s + Number(a.estimated_cost ?? 0), 0)) }] },
          { title: 'Action Plans', table: { columns: ['ID', 'Action', 'Priority', 'Status', 'Progress', 'Owner', 'Due'], widths: [14, 52, 15, 18, 13, 22, 18], rows: actions.map((a) => [a.ref, a.title, capitalize(a.priority), capitalize(a.status), `${a.progress}%`, a.owner_name ?? '—', fmtDate(a.due_date)]) } },
        ];
      case 'vendor':
        return [
          { title: 'Summary', metrics: [{ label: 'Vendors', value: String(vendors.length) }, { label: 'Tier 1', value: String(vendors.filter((v) => v.tier === 1).length) }, { label: 'High Risk (>= 60)', value: String(vendors.filter((v) => v.risk_score >= 60).length) }, { label: 'DPA Pending', value: String(vendors.filter((v) => v.dpa_status === 'pending').length) }] },
          { title: 'Vendor Register', table: { columns: ['Vendor', 'Category', 'Tier', 'Risk', 'Status', 'DPA', 'Next Assessment', 'Spend'], widths: [30, 26, 10, 10, 18, 14, 20, 16], rows: vendors.map((v) => [v.name, v.category ?? '—', String(v.tier), String(v.risk_score), capitalize(v.status), capitalize(v.dpa_status), fmtDate(v.next_assessment), fmtMoney(v.annual_spend)]) } },
        ];
    }
  };

  const exportPdf = (id: ReportId) => {
    const tpl = reportTemplates.find((r) => r.id === id)!;
    try {
      downloadReport({
        title: tpl.title, organization: orgName, audience: tpl.audience, sections: build(id),
        filename: `${tpl.id}-report-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      logAudit('report_exported', 'report', undefined, { report: tpl.id });
      toast({ type: 'success', title: 'Report exported', message: `${tpl.title} downloaded as PDF` });
    } catch (err) {
      toast({ type: 'error', title: 'Export failed', message: errorMessage(err) });
    }
  };

  const previewTpl = reportTemplates.find((r) => r.id === preview);

  return (
    <div className="page-container">
      <PageHeader title="Reports" subtitle="Generate and export professional compliance and security reports from live data" breadcrumb={[{ label: 'Planning' }, { label: 'Reports' }]} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Available Templates" value={reportTemplates.length} sublabel="report types" icon={<FileText className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="Cyber Maturity" value={latest ? Number(latest.score.global_score).toFixed(1) : '—'} sublabel={latest ? `CGS® ${latest.score.cgs_tier}` : 'not assessed'} icon={<Shield className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
        <MetricCard label="Compliance Readiness" value={`${compliance}%`} sublabel={`${tracked.length} framework(s)`} icon={<CheckCircle className="w-4 h-4 text-cyan-400" />} iconBg="bg-cyan-500/15" />
        <MetricCard label="Records in Scope" value={risks.length + controls.length + evidences.length + actions.length} sublabel="risks, controls, evidence, actions" icon={<Database className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" />
      </div>

      {!canExport && (
        <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">PDF export requires the manager role or higher. You can still preview reports.</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {reportTemplates.map((report) => (
          <div key={report.id} className="bg-surface-850 rounded-xl border border-white/8 p-5 hover:border-white/15 hover:bg-surface-800 transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${report.bg} flex items-center justify-center`}><report.icon className={`w-5 h-5 ${report.color}`} /></div>
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">{report.title}</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{report.description}</p>
            <div className="space-y-2 text-xs mb-4">
              <div className="flex justify-between"><span className="text-slate-500">Audience</span><span className="text-slate-300">{report.audience}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Data</span><span className="text-slate-300">Live, as of today</span></div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm flex-1 gap-1.5" onClick={() => setPreview(report.id)}><Eye className="w-3 h-3" /> Preview</button>
              <button className="btn btn-outline btn-sm gap-1.5" disabled={!canExport} onClick={() => exportPdf(report.id)}><Download className="w-3 h-3" /> Export PDF</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!previewTpl} onClose={() => setPreview(null)} title={previewTpl?.title} subtitle={`Preview — ${orgName} · ${fmtDate(new Date().toISOString(), 'long')}`} size="2xl"
        actions={previewTpl && <button className="btn btn-primary btn-sm" disabled={!canExport} onClick={() => exportPdf(previewTpl.id)}><Download className="w-3.5 h-3.5" /> Export PDF</button>}
      >
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {previewTpl && build(previewTpl.id).map((s, i) => <SectionPreview key={s.title} section={s} index={i} />)}
        </div>
      </Modal>
    </div>
  );
}
