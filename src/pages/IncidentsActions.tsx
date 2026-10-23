import { useState } from 'react';
import { Zap, Plus, Search, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, Flame, CreditCard as Edit } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge, RiskBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal, Drawer } from '../components/ui/Modal';
import { Field, SubmitButton, DeleteButton, LoadingState, DetailGrid } from '../components/ui/Form';
import { useAction } from '../hooks/useAction';
import { useOrgTable } from '../hooks/useOrgTable';
import type { Incident, RemediationAction } from '../lib/db-types';
import { fmtDate, firstName, capitalize, isOverdue } from '../lib/format';

type ActionStatus = RemediationAction['status'];

const KANBAN_COLUMNS: { key: ActionStatus; label: string; color: string }[] = [
  { key: 'todo', label: 'To Do', color: 'text-slate-400' },
  { key: 'in_progress', label: 'In Progress', color: 'text-blue-400' },
  { key: 'blocked', label: 'Blocked', color: 'text-red-400' },
  { key: 'done', label: 'Done', color: 'text-emerald-400' },
];

const priorityColors: Record<string, string> = {
  critical: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-amber-500',
  low: 'border-l-emerald-500',
};

const INCIDENT_CATEGORIES = ['Malware/Ransomware', 'Phishing', 'Social Engineering', 'Unauthorized Access', 'Data Leak', 'Vulnerability', 'Third-Party', 'Availability'];
const INCIDENT_STATUSES: Incident['status'][] = ['open', 'investigating', 'remediated', 'resolved'];

const emptyAction: Partial<RemediationAction> = {
  title: '', description: '', priority: 'medium', status: 'todo', progress: 0, owner_name: '',
  due_date: null, estimated_effort: '', estimated_cost: null, linked_risk_ref: '', linked_control_ref: '', linked_incident_ref: '',
};
const emptyIncident: Partial<Incident> = {
  title: '', description: '', severity: 'medium', status: 'open', category: INCIDENT_CATEGORIES[0],
  affected_systems: '', affected_users: 0, reported_by: '', assigned_to: '', root_cause: '', impact: '', lessons: '',
};

export function IncidentsActions() {
  const incidents = useOrgTable<Incident>('incidents', { orderBy: 'reported_at' });
  const actions = useOrgTable<RemediationAction>('action_plans', { orderBy: 'due_date', ascending: true });
  const [activeTab, setActiveTab] = useState<'incidents' | 'actions'>('actions');
  const [search, setSearch] = useState('');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [actionForm, setActionForm] = useState<Partial<RemediationAction> | null>(null);
  const [actionEditId, setActionEditId] = useState<string | null>(null);
  const [incidentForm, setIncidentForm] = useState<Partial<Incident> | null>(null);
  const [incidentEditId, setIncidentEditId] = useState<string | null>(null);
  const { pending, run } = useAction();

  const selectedIncident = incidents.rows.find((i) => i.id === selectedIncidentId) ?? null;
  const openIncidents = incidents.rows.filter((i) => i.status !== 'resolved' && i.status !== 'remediated');
  const criticalOpen = openIncidents.filter((i) => i.severity === 'critical');
  const liveActions = actions.rows.filter((a) => a.status !== 'cancelled');
  const overdueActions = liveActions.filter((a) => a.status !== 'done' && isOverdue(a.due_date));
  const completedActions = liveActions.filter((a) => a.status === 'done');

  const q = search.toLowerCase();
  const actionsByStatus = (status: ActionStatus) =>
    liveActions.filter((a) => a.status === status && (!q || a.title.toLowerCase().includes(q) || a.ref.toLowerCase().includes(q)));

  const setA = <K extends keyof RemediationAction>(k: K, v: RemediationAction[K]) => setActionForm((f) => ({ ...f, [k]: v }));
  const setI = <K extends keyof Incident>(k: K, v: Incident[K]) => setIncidentForm((f) => ({ ...f, [k]: v }));

  const openActionCreate = (prefill: Partial<RemediationAction> = {}) => { setActionEditId(null); setActionForm({ ...emptyAction, ...prefill }); };
  const openActionEdit = (a: RemediationAction) => { setActionEditId(a.id); setActionForm(a); };
  const openIncidentCreate = () => { setIncidentEditId(null); setIncidentForm(emptyIncident); };
  const openIncidentEdit = (i: Incident) => { setIncidentEditId(i.id); setIncidentForm(i); };

  const saveAction = () => run(async () => {
    if (!actionForm?.title?.trim()) throw new Error('Action title is required');
    const values = { ...actionForm, progress: actionForm.status === 'done' ? 100 : actionForm.progress };
    if (actionEditId) await actions.update(actionEditId, values);
    else await actions.create(values);
    setActionForm(null);
  }, actionEditId ? 'Action updated' : 'Action created');

  const saveIncident = () => run(async () => {
    if (!incidentForm?.title?.trim()) throw new Error('Incident title is required');
    const closing = incidentForm.status === 'resolved' || incidentForm.status === 'remediated';
    const values = { ...incidentForm, resolved_at: closing ? (incidentForm.resolved_at ?? new Date().toISOString()) : null };
    if (incidentEditId) await incidents.update(incidentEditId, values);
    else await incidents.create(values);
    setIncidentForm(null);
  }, incidentEditId ? 'Incident updated' : 'Incident reported');

  const moveAction = (a: RemediationAction, status: ActionStatus) =>
    run(() => actions.update(a.id, { status, progress: status === 'done' ? 100 : a.progress }));

  return (
    <div className="page-container">
      <PageHeader
        title="Incidents & Actions"
        subtitle="Security incident management and remediation action tracking"
        breadcrumb={[{ label: 'Security' }, { label: 'Incidents & Actions' }]}
        actions={
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={openIncidentCreate}>
              <Flame className="w-3.5 h-3.5" />
              Report Incident
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => openActionCreate()}>
              <Plus className="w-3.5 h-3.5" />
              New Action
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Open Incidents" value={openIncidents.length} sublabel={`${criticalOpen.length} critical`} icon={<Zap className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant={openIncidents.length > 0 ? 'danger' : 'default'} />
        <MetricCard label="Overdue Actions" value={overdueActions.length} sublabel="past due date" icon={<Clock className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
        <MetricCard label="In Progress" value={liveActions.filter(a => a.status === 'in_progress').length} sublabel="active actions" icon={<AlertTriangle className="w-4 h-4 text-blue-400" />} iconBg="bg-blue-500/15" />
        <MetricCard label="Completed" value={completedActions.length} sublabel={`of ${liveActions.length} actions`} icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
      </div>

      <div className="flex border-b border-white/8 mb-5 gap-1">
        {[{ key: 'actions', label: `Action Plans (${liveActions.length})` }, { key: 'incidents', label: `Incidents (${incidents.rows.length})` }].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === t.key ? 'text-brand-400 border-brand-400' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1 flex justify-end items-center pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input className="input pl-9 h-8 text-sm w-48" placeholder={activeTab === 'actions' ? 'Search actions...' : 'Search incidents...'} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {activeTab === 'actions' && (actions.loading ? <LoadingState /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const items = actionsByStatus(col.key);
            return (
              <div key={col.key} className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                  <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
                  <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{items.length}</span>
                </div>
                <div className="p-3 space-y-2.5 min-h-[200px]">
                  {items.map((a) => (
                    <div key={a.id} className={`bg-surface-900 rounded-lg border-l-2 ${priorityColors[a.priority]} p-3 cursor-pointer hover:bg-white/5 transition-colors`} onClick={() => openActionEdit(a)}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <StatusBadge status={a.priority} size="sm" />
                        <span className="font-mono text-xs text-slate-600">{a.ref}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 leading-snug mb-2">{a.title}</p>
                      {a.progress > 0 && <ProgressBar value={a.progress} size="xs" showLabel />}
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-slate-500">{firstName(a.owner_name)}</span>
                        <span className={`text-xs ${isOverdue(a.due_date) && a.status !== 'done' ? 'text-red-400' : 'text-slate-500'}`}>
                          {a.due_date ? fmtDate(a.due_date, 'day') : 'No date'}
                        </span>
                      </div>
                      <select
                        className="select h-7 text-xs mt-2"
                        value={a.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => moveAction(a, e.target.value as ActionStatus)}
                      >
                        {KANBAN_COLUMNS.map((c) => <option key={c.key} value={c.key}>Move to: {c.label}</option>)}
                        <option value="cancelled">Cancel action</option>
                      </select>
                    </div>
                  ))}
                  {items.length === 0 && <div className="text-center py-8 text-slate-600 text-xs">No items</div>}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {activeTab === 'incidents' && (incidents.loading ? <LoadingState /> : (
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-800 border-b border-white/8">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Incident</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Reported</th>
              </tr>
            </thead>
            <tbody>
              {incidents.rows.filter((i) => !q || i.title.toLowerCase().includes(q) || i.ref.toLowerCase().includes(q)).map((inc) => (
                <tr key={inc.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setSelectedIncidentId(inc.id)}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{inc.ref}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{inc.title}</p>
                    <p className="text-xs text-slate-500">{inc.affected_systems}</p>
                  </td>
                  <td className="px-4 py-3"><RiskBadge severity={inc.severity} /></td>
                  <td className="px-4 py-3"><StatusBadge status={inc.status} size="sm" /></td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{inc.category}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{firstName(inc.assigned_to)}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{fmtDate(inc.reported_at, 'day')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {incidents.rows.length === 0 && <div className="text-center py-12 text-slate-500 text-sm">No incidents reported. Use “Report Incident” when one occurs.</div>}
        </div>
      ))}

      <Drawer open={!!selectedIncident} onClose={() => setSelectedIncidentId(null)} title={selectedIncident ? `${selectedIncident.ref} · ${selectedIncident.title}` : ''}>
        {selectedIncident && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RiskBadge severity={selectedIncident.severity} />
              <StatusBadge status={selectedIncident.status} size="sm" />
            </div>
            <DetailGrid items={[
              { label: 'Category', value: selectedIncident.category },
              { label: 'Affected Systems', value: selectedIncident.affected_systems },
              { label: 'Affected Users', value: selectedIncident.affected_users },
              { label: 'Reported By', value: selectedIncident.reported_by },
              { label: 'Assigned To', value: selectedIncident.assigned_to },
              { label: 'Reported At', value: fmtDate(selectedIncident.reported_at, 'long') },
              { label: 'Resolved At', value: selectedIncident.resolved_at ? fmtDate(selectedIncident.resolved_at, 'long') : 'Open' },
            ]} />
            {selectedIncident.description && <div><h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Description</h4><p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedIncident.description}</p></div>}
            <div><h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Root Cause</h4><p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedIncident.root_cause || 'Under investigation'}</p></div>
            <div><h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Business Impact</h4><p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedIncident.impact || '—'}</p></div>
            {selectedIncident.lessons && <div><h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Lessons Learned</h4><p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedIncident.lessons}</p></div>}
            <div className="flex gap-2 pt-2 border-t border-white/8">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => openIncidentEdit(selectedIncident)}><Edit className="w-3.5 h-3.5" /> Edit Incident</button>
              <button className="btn btn-outline btn-sm" onClick={() => openActionCreate({ title: `Remediate ${selectedIncident.ref}: ${selectedIncident.title}`, priority: selectedIncident.severity, linked_incident_ref: selectedIncident.ref })}>Create Action</button>
              <DeleteButton onConfirm={async () => { await incidents.remove(selectedIncident.id); setSelectedIncidentId(null); }} />
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={!!actionForm} onClose={() => setActionForm(null)} title={actionEditId ? `Edit Action ${actionForm?.ref ?? ''}` : 'Create Action Plan'} size="lg"
        actions={<>
          {actionEditId && <DeleteButton onConfirm={async () => { await actions.remove(actionEditId); setActionForm(null); }} />}
          <button className="btn btn-outline btn-sm" onClick={() => setActionForm(null)}>Cancel</button>
          <SubmitButton pending={pending} onClick={saveAction}>{actionEditId ? 'Save Changes' : 'Create Action'}</SubmitButton>
        </>}
      >
        {actionForm && (
          <div className="space-y-4">
            <Field label="Action Title"><input className="input" placeholder="Describe the remediation action" value={actionForm.title ?? ''} onChange={(e) => setA('title', e.target.value)} /></Field>
            <Field label="Description"><textarea className="input resize-none" rows={3} placeholder="Detail the steps to resolve..." value={actionForm.description ?? ''} onChange={(e) => setA('description', e.target.value)} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Priority"><select className="select" value={actionForm.priority} onChange={(e) => setA('priority', e.target.value as RemediationAction['priority'])}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field>
              <Field label="Status"><select className="select" value={actionForm.status} onChange={(e) => setA('status', e.target.value as ActionStatus)}>{KANBAN_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}<option value="cancelled">Cancelled</option></select></Field>
              <Field label={`Progress (${actionForm.progress ?? 0}%)`}><input type="range" min={0} max={100} step={5} className="w-full accent-brand-500 mt-2" value={actionForm.progress ?? 0} onChange={(e) => setA('progress', Number(e.target.value))} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Owner"><input className="input" placeholder="Action owner" value={actionForm.owner_name ?? ''} onChange={(e) => setA('owner_name', e.target.value)} /></Field>
              <Field label="Due Date"><input type="date" className="input" value={actionForm.due_date ?? ''} onChange={(e) => setA('due_date', e.target.value || null)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estimated Effort"><input className="input" placeholder="e.g., 40h" value={actionForm.estimated_effort ?? ''} onChange={(e) => setA('estimated_effort', e.target.value)} /></Field>
              <Field label="Budget (€)"><input type="number" min={0} className="input" placeholder="0" value={actionForm.estimated_cost ?? ''} onChange={(e) => setA('estimated_cost', e.target.value === '' ? null : Number(e.target.value))} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Linked Risk"><input className="input" placeholder="R-001" value={actionForm.linked_risk_ref ?? ''} onChange={(e) => setA('linked_risk_ref', e.target.value)} /></Field>
              <Field label="Linked Control"><input className="input" placeholder="C-001" value={actionForm.linked_control_ref ?? ''} onChange={(e) => setA('linked_control_ref', e.target.value)} /></Field>
              <Field label="Linked Incident"><input className="input" placeholder="INC-001" value={actionForm.linked_incident_ref ?? ''} onChange={(e) => setA('linked_incident_ref', e.target.value)} /></Field>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!incidentForm} onClose={() => setIncidentForm(null)} title={incidentEditId ? 'Edit Incident' : 'Report Security Incident'} size="lg"
        actions={<><button className="btn btn-outline btn-sm" onClick={() => setIncidentForm(null)}>Cancel</button><SubmitButton pending={pending} onClick={saveIncident} variant={incidentEditId ? 'btn-primary' : 'btn-danger'}>{incidentEditId ? 'Save Changes' : 'Report Incident'}</SubmitButton></>}
      >
        {incidentForm && (
          <div className="space-y-4">
            {!incidentEditId && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                For critical incidents, also notify your CISO and CERT immediately (NIS2: early warning within 24h).
              </div>
            )}
            <Field label="Incident Title"><input className="input" placeholder="Brief description of the security incident" value={incidentForm.title ?? ''} onChange={(e) => setI('title', e.target.value)} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Severity"><select className="select" value={incidentForm.severity} onChange={(e) => setI('severity', e.target.value as Incident['severity'])}><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field>
              <Field label="Category"><select className="select" value={incidentForm.category ?? ''} onChange={(e) => setI('category', e.target.value)}>{INCIDENT_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
              <Field label="Status"><select className="select" value={incidentForm.status} onChange={(e) => setI('status', e.target.value as Incident['status'])}>{INCIDENT_STATUSES.map(s => <option key={s} value={s}>{capitalize(s)}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Affected Systems"><input className="input" placeholder="Which systems are affected?" value={incidentForm.affected_systems ?? ''} onChange={(e) => setI('affected_systems', e.target.value)} /></Field>
              <Field label="Affected Users"><input type="number" min={0} className="input" value={incidentForm.affected_users ?? 0} onChange={(e) => setI('affected_users', Math.max(0, Number(e.target.value) || 0))} /></Field>
            </div>
            <Field label="Description"><textarea className="input resize-none" rows={3} placeholder="What happened? When was it detected? What is the current impact?" value={incidentForm.description ?? ''} onChange={(e) => setI('description', e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Reported By"><input className="input" placeholder="Person or system (e.g., SIEM)" value={incidentForm.reported_by ?? ''} onChange={(e) => setI('reported_by', e.target.value)} /></Field>
              <Field label="Assign To"><input className="input" placeholder="Incident responder" value={incidentForm.assigned_to ?? ''} onChange={(e) => setI('assigned_to', e.target.value)} /></Field>
            </div>
            {incidentEditId && (
              <>
                <Field label="Root Cause"><textarea className="input resize-none" rows={2} value={incidentForm.root_cause ?? ''} onChange={(e) => setI('root_cause', e.target.value)} /></Field>
                <Field label="Business Impact"><textarea className="input resize-none" rows={2} value={incidentForm.impact ?? ''} onChange={(e) => setI('impact', e.target.value)} /></Field>
                <Field label="Lessons Learned"><textarea className="input resize-none" rows={2} value={incidentForm.lessons ?? ''} onChange={(e) => setI('lessons', e.target.value)} /></Field>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
