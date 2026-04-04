import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoveVertical as MoreVertical, Play, Eye, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/auth';
import { FRAMEWORKS } from '../lib/cgef-framework';
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
  const [newAssessment, setNewAssessment] = useState({
    name: '',
    description: '',
    frameworks: ['iso27001', 'nis2'],
  });

  useEffect(() => {
    fetchAssessments();
  }, [organization?.id]);

  async function fetchAssessments() {
    if (!organization?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function createAssessment() {
    if (!organization?.id || !user?.id) return;

    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('assessments')
        .insert({
          organization_id: organization.id,
          name: newAssessment.name,
          description: newAssessment.description,
          framework_scope: newAssessment.frameworks,
          created_by: user.id,
          status: 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      setShowCreateModal(false);
      setNewAssessment({ name: '', description: '', frameworks: ['iso27001', 'nis2'] });
      navigate(`/assessments/${data.id}/evaluate`);
    } catch (error) {
      console.error('Error creating assessment:', error);
    } finally {
      setCreating(false);
    }
  }

  async function deleteAssessment(id: string) {
    if (!confirm('Supprimer cette evaluation ?')) return;

    try {
      await supabase.from('assessments').delete().eq('id', id);
      setAssessments(assessments.filter((a) => a.id !== id));
    } catch (error) {
      console.error('Error deleting assessment:', error);
    }
  }

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesSearch = assessment.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || assessment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
          <h1 className="text-2xl font-bold text-brand-slate-900">Evaluations</h1>
          <p className="text-brand-slate-500 mt-1">
            Gerez vos evaluations de maturite CGEF
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle evaluation
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une evaluation..."
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
            <option value="all">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="in_progress">En cours</option>
            <option value="completed">Termine</option>
          </select>
        </div>
      </div>

      {filteredAssessments.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-slate-100 flex items-center justify-center">
              <Search className="w-8 h-8 text-brand-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-brand-slate-900 mb-2">
              Aucune evaluation trouvee
            </h3>
            <p className="text-brand-slate-500 mb-4">
              {searchQuery || statusFilter !== 'all'
                ? 'Essayez de modifier vos filtres'
                : 'Commencez par creer votre premiere evaluation'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Creer une evaluation
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              onDelete={() => deleteAssessment(assessment.id)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-brand-slate-200">
              <h2 className="text-xl font-semibold text-brand-slate-900">
                Nouvelle evaluation
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
                <label className="label">Nom de l'evaluation</label>
                <input
                  type="text"
                  value={newAssessment.name}
                  onChange={(e) =>
                    setNewAssessment({ ...newAssessment, name: e.target.value })
                  }
                  className="input"
                  placeholder="Ex: Evaluation Q1 2024"
                />
              </div>

              <div>
                <label className="label">Description (optionnel)</label>
                <textarea
                  value={newAssessment.description}
                  onChange={(e) =>
                    setNewAssessment({ ...newAssessment, description: e.target.value })
                  }
                  className="input min-h-[80px]"
                  placeholder="Description de l'evaluation..."
                />
              </div>

              <div>
                <label className="label">Referentiels</label>
                <div className="grid grid-cols-2 gap-2">
                  {FRAMEWORKS.map((framework) => (
                    <label
                      key={framework.id}
                      className="flex items-center gap-2 p-3 bg-brand-slate-50 rounded-lg cursor-pointer hover:bg-brand-slate-100 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={newAssessment.frameworks.includes(framework.id)}
                        onChange={(e) => {
                          const frameworks = e.target.checked
                            ? [...newAssessment.frameworks, framework.id]
                            : newAssessment.frameworks.filter((f) => f !== framework.id);
                          setNewAssessment({ ...newAssessment, frameworks });
                        }}
                        className="w-4 h-4 rounded border-brand-slate-300 text-brand-green-600 focus:ring-brand-green-500"
                      />
                      <span className="text-sm text-brand-slate-700">
                        {framework.name}
                      </span>
                    </label>
                  ))}
                </div>
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
                onClick={createAssessment}
                disabled={!newAssessment.name || creating}
                className="btn-primary"
              >
                {creating ? 'Creation...' : 'Creer et commencer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentCard({
  assessment,
  onDelete,
}: {
  assessment: Assessment;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const statusConfig = {
    draft: { label: 'Brouillon', className: 'badge-neutral' },
    in_progress: { label: 'En cours', className: 'badge-warning' },
    completed: { label: 'Termine', className: 'badge-success' },
  };

  const status = statusConfig[assessment.status] || statusConfig.draft;

  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="card-body">
        <div className="flex items-start justify-between mb-3">
          <span className={status.className}>{status.label}</span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-brand-slate-100 rounded transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-brand-slate-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 bg-white rounded-lg shadow-lg border border-brand-slate-200 py-1 w-40 z-10">
                  <Link
                    to={`/assessments/${assessment.id}`}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-brand-slate-700 hover:bg-brand-slate-50"
                  >
                    <Eye className="w-4 h-4" />
                    Voir details
                  </Link>
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

        <h3 className="font-semibold text-brand-slate-900 mb-2">{assessment.name}</h3>
        {assessment.description && (
          <p className="text-sm text-brand-slate-500 mb-3 line-clamp-2">
            {assessment.description}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mb-4">
          {assessment.framework_scope?.slice(0, 3).map((framework) => (
            <span
              key={framework}
              className="text-xs px-2 py-0.5 bg-brand-slate-100 text-brand-slate-600 rounded"
            >
              {framework.toUpperCase()}
            </span>
          ))}
          {(assessment.framework_scope?.length || 0) > 3 && (
            <span className="text-xs px-2 py-0.5 bg-brand-slate-100 text-brand-slate-600 rounded">
              +{(assessment.framework_scope?.length || 0) - 3}
            </span>
          )}
        </div>

        <div className="text-xs text-brand-slate-500 mb-4">
          Cree le {new Date(assessment.created_at).toLocaleDateString('fr-FR')}
        </div>

        <Link
          to={
            assessment.status === 'completed'
              ? `/assessments/${assessment.id}`
              : `/assessments/${assessment.id}/evaluate`
          }
          className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg transition-colors ${
            assessment.status === 'completed'
              ? 'btn-outline'
              : 'btn-primary'
          }`}
        >
          {assessment.status === 'completed' ? (
            <>
              <Eye className="w-4 h-4" />
              Voir resultats
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              {assessment.status === 'draft' ? 'Demarrer' : 'Continuer'}
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
