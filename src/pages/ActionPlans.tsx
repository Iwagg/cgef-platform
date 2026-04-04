import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Calendar, User, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Clock, MoveVertical as MoreVertical, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import type { ActionPlan, ActionPriority, ActionStatus } from '../lib/types';

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; className: string }> = {
  critical: { label: 'Critique', className: 'bg-red-100 text-red-700' },
  high: { label: 'Haute', className: 'bg-orange-100 text-orange-700' },
  medium: { label: 'Moyenne', className: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'Basse', className: 'bg-green-100 text-green-700' },
};

const STATUS_CONFIG: Record<ActionStatus, { label: string; icon: React.ReactNode; className: string }> = {
  open: { label: 'Ouvert', icon: <AlertCircle className="w-4 h-4" />, className: 'text-red-600' },
  in_progress: { label: 'En cours', icon: <Clock className="w-4 h-4" />, className: 'text-yellow-600' },
  completed: { label: 'Termine', icon: <CheckCircle className="w-4 h-4" />, className: 'text-green-600' },
  cancelled: { label: 'Annule', icon: <X className="w-4 h-4" />, className: 'text-brand-slate-400' },
};

export function ActionPlans() {
  const { organization } = useAuthStore();
  const [actions, setActions] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newAction, setNewAction] = useState({
    title: '',
    description: '',
    priority: 'medium' as ActionPriority,
    responsible: '',
    due_date: '',
  });

  useEffect(() => {
    fetchActions();
  }, [organization?.id]);

  async function fetchActions() {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('action_plans')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActions(data || []);
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createAction() {
    if (!organization?.id) return;

    setCreating(true);
    try {
      const { error } = await supabase.from('action_plans').insert({
        organization_id: organization.id,
        title: newAction.title,
        description: newAction.description,
        priority: newAction.priority,
        responsible: newAction.responsible || null,
        due_date: newAction.due_date || null,
        status: 'open',
      });

      if (error) throw error;

      setShowCreateModal(false);
      setNewAction({
        title: '',
        description: '',
        priority: 'medium',
        responsible: '',
        due_date: '',
      });
      fetchActions();
    } catch (error) {
      console.error('Error creating action:', error);
    } finally {
      setCreating(false);
    }
  }

  async function updateStatus(id: string, status: ActionStatus) {
    try {
      await supabase.from('action_plans').update({ status }).eq('id', id);
      setActions(
        actions.map((a) => (a.id === id ? { ...a, status } : a))
      );
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }

  async function deleteAction(id: string) {
    if (!confirm('Supprimer cette action ?')) return;

    try {
      await supabase.from('action_plans').delete().eq('id', id);
      setActions(actions.filter((a) => a.id !== id));
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  }

  const filteredActions = actions.filter((action) => {
    const matchesSearch = action.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || action.status === statusFilter;
    const matchesPriority =
      priorityFilter === 'all' || action.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: actions.length,
    open: actions.filter((a) => a.status === 'open').length,
    inProgress: actions.filter((a) => a.status === 'in_progress').length,
    completed: actions.filter((a) => a.status === 'completed').length,
    overdue: actions.filter(
      (a) =>
        a.due_date &&
        new Date(a.due_date) < new Date() &&
        a.status !== 'completed'
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-slate-900">Plans d'action</h1>
          <p className="text-brand-slate-500 mt-1">
            Suivez et gerez vos actions d'amelioration
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle action
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total} color="#64748B" />
        <StatCard label="Ouvertes" value={stats.open} color="#DC2626" />
        <StatCard label="En cours" value={stats.inProgress} color="#F59E0B" />
        <StatCard label="Terminees" value={stats.completed} color="#22C55E" />
        <StatCard label="En retard" value={stats.overdue} color="#F97316" />
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une action..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-brand-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Tous statuts</option>
            <option value="open">Ouvert</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Termine</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">Toutes priorites</option>
            <option value="critical">Critique</option>
            <option value="high">Haute</option>
            <option value="medium">Moyenne</option>
            <option value="low">Basse</option>
          </select>
        </div>
      </div>

      {filteredActions.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-slate-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-brand-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-brand-slate-900 mb-2">
              Aucune action trouvee
            </h3>
            <p className="text-brand-slate-500 mb-4">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Creez votre premiere action d\'amelioration'}
            </p>
            {!searchQuery && statusFilter === 'all' && priorityFilter === 'all' && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Creer une action
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onStatusChange={(status) => updateStatus(action.id, status)}
              onDelete={() => deleteAction(action.id)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-brand-slate-200">
              <h2 className="text-xl font-semibold text-brand-slate-900">
                Nouvelle action
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-brand-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="label">Titre</label>
                <input
                  type="text"
                  value={newAction.title}
                  onChange={(e) =>
                    setNewAction({ ...newAction, title: e.target.value })
                  }
                  className="input"
                  placeholder="Ex: Deployer le MFA"
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={newAction.description}
                  onChange={(e) =>
                    setNewAction({ ...newAction, description: e.target.value })
                  }
                  className="input min-h-[80px]"
                  placeholder="Description de l'action..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Priorite</label>
                  <select
                    value={newAction.priority}
                    onChange={(e) =>
                      setNewAction({
                        ...newAction,
                        priority: e.target.value as ActionPriority,
                      })
                    }
                    className="input"
                  >
                    <option value="critical">Critique</option>
                    <option value="high">Haute</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Basse</option>
                  </select>
                </div>
                <div>
                  <label className="label">Echeance</label>
                  <input
                    type="date"
                    value={newAction.due_date}
                    onChange={(e) =>
                      setNewAction({ ...newAction, due_date: e.target.value })
                    }
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Responsable</label>
                <input
                  type="text"
                  value={newAction.responsible}
                  onChange={(e) =>
                    setNewAction({ ...newAction, responsible: e.target.value })
                  }
                  className="input"
                  placeholder="Nom ou email"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-brand-slate-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-outline"
              >
                Annuler
              </button>
              <button
                onClick={createAction}
                disabled={!newAction.title || creating}
                className="btn-primary"
              >
                {creating ? 'Creation...' : 'Creer l\'action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card">
      <div className="card-body text-center">
        <p className="text-3xl font-bold" style={{ color }}>
          {value}
        </p>
        <p className="text-sm text-brand-slate-500">{label}</p>
      </div>
    </div>
  );
}

function ActionCard({
  action,
  onStatusChange,
  onDelete,
}: {
  action: ActionPlan;
  onStatusChange: (status: ActionStatus) => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const priority = PRIORITY_CONFIG[action.priority];
  const status = STATUS_CONFIG[action.status];
  const isOverdue =
    action.due_date &&
    new Date(action.due_date) < new Date() &&
    action.status !== 'completed';

  return (
    <div
      className={`card ${
        isOverdue ? 'border-red-300 bg-red-50/50' : ''
      }`}
    >
      <div className="card-body">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`badge ${priority.className}`}>{priority.label}</span>
              <span className={`flex items-center gap-1 text-sm ${status.className}`}>
                {status.icon}
                {status.label}
              </span>
              {isOverdue && (
                <span className="badge bg-red-100 text-red-700">En retard</span>
              )}
            </div>
            <h3 className="font-semibold text-brand-slate-900">{action.title}</h3>
            {action.description && (
              <p className="text-sm text-brand-slate-500 mt-1 line-clamp-2">
                {action.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-brand-slate-500">
              {action.due_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(action.due_date).toLocaleDateString('fr-FR')}
                </span>
              )}
              {action.responsible && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {action.responsible}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {action.status !== 'completed' && (
              <select
                value={action.status}
                onChange={(e) => onStatusChange(e.target.value as ActionStatus)}
                className="input w-auto text-sm py-1"
              >
                <option value="open">Ouvert</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Termine</option>
              </select>
            )}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-brand-slate-100 rounded transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-brand-slate-400" />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-brand-slate-200 py-1 w-40 z-10">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete();
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
