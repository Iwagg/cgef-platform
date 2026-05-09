import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Play, Eye, Trash2, MoveVertical as MoreVertical, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { FRAMEWORKS } from '../lib/cgef-framework';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import type { Assessment } from '../lib/types';

export function Assessments() {
  const navigate = useNavigate();
  const { organization, user } = useAuthStore();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAssessment, setNewAssessment] = useState({ name: '', scope: '', frameworks: ['iso27001', 'nis2'] });

  useEffect(() => { fetchAssessments(); }, [organization?.id]);

  async function fetchAssessments() {
    if (!organization?.id) { setLoading(false); return; }
    try {
      const { data, error } = await supabase.from('assessments').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false });
      if (error) throw error;
      setAssessments(data || []);
    } catch (error) { console.error('Error fetching assessments:', error); }
    finally { setLoading(false); }
  }

  async function createAssessment() {
    if (!organization?.id || !user?.id) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.from('assessments').insert({
        organization_id: organization.id, name: newAssessment.name, scope: newAssessment.scope || null,
        frameworks_in_scope: newAssessment.frameworks, created_by: user.id, status: 'draft',
      }).select().single();
      if (error) throw error;
      setShowCreateModal(false);
      setNewAssessment({ name: '', scope: '', frameworks: ['iso27001', 'nis2'] });
      navigate(`/assessments/${data.id}/evaluate`);
    } catch (error) { console.error('Error creating assessment:', error); }
    finally { setCreating(false); }
  }

  async function deleteAssessment(id: string) {
    if (!confirm('Delete this assessment?')) return;
    try {
      await supabase.from('assessments').delete().eq('id', id);
      setAssessments(assessments.filter((a) => a.id !== id));
    } catch (error) { console.error('Error deleting assessment:', error); }
  }

  const filteredAssessments = assessments.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) && (statusFilter === 'all' || a.status === statusFilter)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Assessments"
        subtitle="Manage your CGEF cyber maturity assessments"
        breadcrumb={[{ label: 'Security' }, { label: 'Assessments' }]}
        actions={
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" /> New Assessment
          </button>
        }
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input type="text" placeholder="Search assessments..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="input pl-9 h-9 text-sm" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="select h-9 text-sm w-auto min-w-[140px]">
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <span className="text-xs text-slate-500 ml-auto self-center">{filteredAssessments.length} assessments</span>
      </div>

      {filteredAssessments.length === 0 ? (
        <div className="bg-surface-850 border border-white/8 rounded-xl text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-surface-800 flex items-center justify-center">
            <Search className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200 mb-1">No assessments found</h3>
          <p className="text-xs text-slate-500 mb-5">
            {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first maturity assessment'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
              <Plus className="w-3.5 h-3.5" /> Create Assessment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssessments.map((assessment) => (
            <AssessmentCard key={assessment.id} assessment={assessment} onDelete={() => deleteAssessment(assessment.id)} />
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-850 border border-white/10 rounded-2xl shadow-modal w-full max-w-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <h2 className="text-sm font-semibold text-slate-100">New Assessment</h2>
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost btn-icon"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Assessment Name</label>
                <input type="text" value={newAssessment.name}
                  onChange={(e) => setNewAssessment({ ...newAssessment, name: e.target.value })}
                  className="input" placeholder="e.g., Q2 2026 Maturity Assessment" />
              </div>
              <div>
                <label className="label">Scope (optional)</label>
                <textarea value={newAssessment.scope}
                  onChange={(e) => setNewAssessment({ ...newAssessment, scope: e.target.value })}
                  className="input resize-none" rows={2} placeholder="Scope and objectives..." />
              </div>
              <div>
                <label className="label">Frameworks</label>
                <div className="grid grid-cols-2 gap-2">
                  {FRAMEWORKS.map((framework) => (
                    <label key={framework.id} className="flex items-center gap-2 p-2.5 bg-white/4 rounded-lg cursor-pointer hover:bg-white/6 transition-colors">
                      <input type="checkbox" checked={newAssessment.frameworks.includes(framework.id)}
                        onChange={(e) => {
                          const frameworks = e.target.checked
                            ? [...newAssessment.frameworks, framework.id]
                            : newAssessment.frameworks.filter((f) => f !== framework.id);
                          setNewAssessment({ ...newAssessment, frameworks });
                        }}
                        className="accent-brand-500" />
                      <span className="text-sm text-slate-300">{framework.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/8">
              <button onClick={() => setShowCreateModal(false)} className="btn btn-outline btn-sm">Cancel</button>
              <button onClick={createAssessment} disabled={!newAssessment.name || creating} className="btn btn-primary btn-sm">
                {creating && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                Create & Start
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentCard({ assessment, onDelete }: { assessment: Assessment; onDelete: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-surface-850 border border-white/8 rounded-xl hover:border-white/15 transition-all">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <StatusBadge status={assessment.status} size="sm" />
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="btn-ghost btn-icon p-1.5">
              <MoreVertical className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 bg-surface-800 border border-white/10 rounded-lg shadow-modal py-1 w-40 z-10">
                  <Link to={`/assessments/${assessment.id}`} onClick={() => setShowMenu(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-white/5 transition-colors">
                    <Eye className="w-3.5 h-3.5" /> View Results
                  </Link>
                  <button onClick={() => { setShowMenu(false); onDelete(); }}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors w-full">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <h3 className="font-semibold text-slate-200 text-sm mb-1">{assessment.name}</h3>
        {assessment.scope && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{assessment.scope}</p>}
        <div className="flex flex-wrap gap-1 mb-3">
          {assessment.frameworks_in_scope?.slice(0, 3).map((f) => (
            <span key={f} className="text-xs px-1.5 py-0.5 bg-brand-500/15 text-brand-400 border border-brand-500/20 rounded font-mono">{f.toUpperCase()}</span>
          ))}
          {(assessment.frameworks_in_scope?.length || 0) > 3 && (
            <span className="text-xs px-1.5 py-0.5 bg-white/5 text-slate-500 rounded">+{(assessment.frameworks_in_scope?.length || 0) - 3}</span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Created {new Date(assessment.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>
        <Link
          to={assessment.status === 'completed' ? `/assessments/${assessment.id}` : `/assessments/${assessment.id}/evaluate`}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${assessment.status === 'completed' ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}`}
        >
          {assessment.status === 'completed' ? <><Eye className="w-3.5 h-3.5" /> View Results</> : <><Play className="w-3.5 h-3.5" /> {assessment.status === 'draft' ? 'Start' : 'Continue'}</>}
        </Link>
      </div>
    </div>
  );
}
