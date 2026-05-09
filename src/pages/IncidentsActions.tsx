import { useState } from 'react';
import { Zap, Plus, Search, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle, Clock, Flame } from 'lucide-react';
import { mockIncidents, mockActionPlans } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge, RiskBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Modal } from '../components/ui/Modal';

type ActionStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

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

export function IncidentsActions() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'actions'>('actions');
  const [search, setSearch] = useState('');
  const [showCreateAction, setShowCreateAction] = useState(false);
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<typeof mockIncidents[0] | null>(null);

  const openIncidents = mockIncidents.filter((i) => i.status !== 'resolved' && i.status !== 'remediated');
  const criticalIncidents = mockIncidents.filter((i) => i.severity === 'critical');
  const overdueActions = mockActionPlans.filter((a) => a.status !== 'done' && new Date(a.dueDate) < new Date());
  const completedActions = mockActionPlans.filter((a) => a.status === 'done');

  const actionsByStatus = (status: ActionStatus) =>
    mockActionPlans.filter((a) => a.status === status && (!search || a.title.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="page-container">
      <PageHeader
        title="Incidents & Actions"
        subtitle="Security incident management and remediation action tracking"
        breadcrumb={[{ label: 'Security' }, { label: 'Incidents & Actions' }]}
        actions={
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={() => setShowCreateIncident(true)}>
              <Flame className="w-3.5 h-3.5" />
              Report Incident
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCreateAction(true)}>
              <Plus className="w-3.5 h-3.5" />
              New Action
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Open Incidents" value={openIncidents.length} sublabel={`${criticalIncidents.length} critical`} icon={<Zap className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant={openIncidents.length > 0 ? 'danger' : 'default'} />
        <MetricCard label="Overdue Actions" value={overdueActions.length} sublabel="past due date" icon={<Clock className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" variant="warning" />
        <MetricCard label="In Progress" value={mockActionPlans.filter(a => a.status === 'in_progress').length} sublabel="active actions" icon={<AlertTriangle className="w-4 h-4 text-blue-400" />} iconBg="bg-blue-500/15" />
        <MetricCard label="Completed" value={completedActions.length} sublabel="this quarter" icon={<CheckCircle className="w-4 h-4 text-emerald-400" />} iconBg="bg-emerald-500/15" />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/8 mb-5 gap-1">
        {[{ key: 'actions', label: 'Action Plans' }, { key: 'incidents', label: 'Incidents' }].map((t) => (
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

      {activeTab === 'actions' && (
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
                    <div key={a.id} className={`bg-surface-900 rounded-lg border-l-2 ${priorityColors[a.priority]} p-3 cursor-pointer hover:bg-white/5 transition-colors`}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <StatusBadge status={a.priority} size="sm" />
                        <span className="font-mono text-xs text-slate-600">{a.id}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-200 leading-snug mb-2">{a.title}</p>
                      {a.progress > 0 && <ProgressBar value={a.progress} size="xs" showLabel />}
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-slate-500">{a.owner.split(' ')[0]}</span>
                        <span className={`text-xs ${new Date(a.dueDate) < new Date() && a.status !== 'done' ? 'text-red-400' : 'text-slate-500'}`}>
                          {new Date(a.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="text-center py-8 text-slate-600 text-xs">No items</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
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
              {mockIncidents.filter((i) => !search || i.title.toLowerCase().includes(search.toLowerCase())).map((inc) => (
                <tr key={inc.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setSelectedIncident(inc)}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{inc.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-200">{inc.title}</p>
                    <p className="text-xs text-slate-500">{inc.affectedSystems}</p>
                  </td>
                  <td className="px-4 py-3"><RiskBadge severity={inc.severity} /></td>
                  <td className="px-4 py-3"><StatusBadge status={inc.status} size="sm" /></td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{inc.category}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{inc.assignedTo.split(' ')[0]}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{new Date(inc.reportedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedIncident(null)} />
          <div className="relative w-full max-w-xl bg-surface-850 border-l border-white/8 flex flex-col shadow-modal">
            <div className="flex items-start justify-between px-5 py-4 border-b border-white/8">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-slate-500">{selectedIncident.id}</span>
                  <RiskBadge severity={selectedIncident.severity} />
                  <StatusBadge status={selectedIncident.status} size="sm" />
                </div>
                <h2 className="text-base font-semibold text-slate-100">{selectedIncident.title}</h2>
              </div>
              <button onClick={() => setSelectedIncident(null)} className="btn-ghost btn-icon ml-3">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Category', value: selectedIncident.category },
                  { label: 'Affected Systems', value: selectedIncident.affectedSystems },
                  { label: 'Affected Users', value: selectedIncident.affectedUsers },
                  { label: 'Reported By', value: selectedIncident.reportedBy },
                  { label: 'Assigned To', value: selectedIncident.assignedTo },
                  { label: 'Reported At', value: new Date(selectedIncident.reportedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) },
                  { label: 'Resolved At', value: selectedIncident.resolvedAt ? new Date(selectedIncident.resolvedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Open' },
                ].map((f) => (
                  <div key={f.label} className="bg-white/4 rounded-lg p-3">
                    <p className="text-xs text-slate-500 mb-0.5">{f.label}</p>
                    <p className="text-sm font-medium text-slate-200">{String(f.value)}</p>
                  </div>
                ))}
              </div>
              <div><h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Root Cause</h4><p className="text-sm text-slate-300">{selectedIncident.rootCause}</p></div>
              <div><h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Business Impact</h4><p className="text-sm text-slate-300">{selectedIncident.impact}</p></div>
              {selectedIncident.lessons && <div><h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Lessons Learned</h4><p className="text-sm text-slate-300">{selectedIncident.lessons}</p></div>}
            </div>
            <div className="px-5 py-4 border-t border-white/8 flex gap-2">
              <button className="btn btn-secondary btn-sm flex-1">Edit Incident</button>
              <button className="btn btn-outline btn-sm">Create Action</button>
            </div>
          </div>
        </div>
      )}

      <Modal open={showCreateAction} onClose={() => setShowCreateAction(false)} title="Create Action Plan" size="lg"
        actions={<><button className="btn btn-outline btn-sm" onClick={() => setShowCreateAction(false)}>Cancel</button><button className="btn btn-primary btn-sm">Create Action</button></>}
      >
        <div className="space-y-4">
          <div><label className="label">Action Title</label><input className="input" placeholder="Describe the remediation action" /></div>
          <div><label className="label">Description</label><textarea className="input resize-none" rows={3} placeholder="Detail the steps to resolve..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Priority</label><select className="select"><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
            <div><label className="label">Owner</label><input className="input" placeholder="Action owner" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Due Date</label><input type="date" className="input" /></div>
            <div><label className="label">Estimated Effort</label><input className="input" placeholder="e.g., 40h" /></div>
          </div>
        </div>
      </Modal>

      <Modal open={showCreateIncident} onClose={() => setShowCreateIncident(false)} title="Report Security Incident" size="lg"
        actions={<><button className="btn btn-outline btn-sm" onClick={() => setShowCreateIncident(false)}>Cancel</button><button className="btn btn-danger btn-sm">Report Incident</button></>}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            For critical incidents, also notify your CISO and CERT immediately.
          </div>
          <div><label className="label">Incident Title</label><input className="input" placeholder="Brief description of the security incident" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Severity</label><select className="select"><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div>
            <div><label className="label">Category</label><select className="select"><option>Malware/Ransomware</option><option>Phishing</option><option>Unauthorized Access</option><option>Data Leak</option><option>Vulnerability</option><option>Third-Party</option></select></div>
          </div>
          <div><label className="label">Affected Systems</label><input className="input" placeholder="Which systems are affected?" /></div>
          <div><label className="label">Initial Description</label><textarea className="input resize-none" rows={3} placeholder="What happened? When was it detected? What is the current impact?" /></div>
          <div><label className="label">Assign To</label><input className="input" placeholder="Incident responder" /></div>
        </div>
      </Modal>
    </div>
  );
}
