import { useState } from 'react';
import { User, Building2, Bell, Shield, Key, Save, CircleAlert as AlertCircle, CircleCheck as CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import type { UserRole } from '../lib/types';

type TabId = 'profile' | 'organization' | 'notifications' | 'security';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'profile', label: 'Profil', icon: <User className="w-5 h-5" /> },
  { id: 'organization', label: 'Organisation', icon: <Building2 className="w-5 h-5" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
  { id: 'security', label: 'Securite', icon: <Shield className="w-5 h-5" /> },
];

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'analyst', label: 'Analyste' },
  { value: 'manager', label: 'Manager' },
  { value: 'ciso', label: 'RSSI' },
  { value: 'admin', label: 'Administrateur' },
];

const SECTORS = [
  'Banque & Finance',
  'Assurance',
  'Sante',
  'Energie',
  'Transport',
  'Telecommunications',
  'Industrie',
  'Commerce & Distribution',
  'Services',
  'Secteur Public',
  'Autre',
];

export function Settings() {
  const { profile, organization, updateProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [role, setRole] = useState<UserRole>(profile?.role || 'analyst');

  const [orgName, setOrgName] = useState(organization?.name || 'Mon Organisation');
  const [sector, setSector] = useState(organization?.sector || 'Services');
  const [employeeCount, setEmployeeCount] = useState(
    organization?.employee_count?.toString() || '500'
  );

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [assessmentReminders, setAssessmentReminders] = useState(true);
  const [actionPlanAlerts, setActionPlanAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateProfile({ full_name: fullName, role });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrganization = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    setSuccess(false);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Erreur lors du changement de mot de passe');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-slate-900">Parametres</h1>
        <p className="text-brand-slate-600 mt-1">
          Gerez votre profil et les preferences de l'application
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-700">Modifications enregistrees avec succes</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-brand-green-50 text-brand-green-700 font-medium'
                    : 'text-brand-slate-600 hover:bg-brand-slate-100'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-brand-slate-900">
                  Informations du profil
                </h2>
              </div>
              <div className="card-body space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-green-500 to-brand-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2) || 'U'}
                  </div>
                  <div>
                    <button className="btn-outline text-sm">Changer la photo</button>
                    <p className="text-xs text-brand-slate-500 mt-2">
                      JPG, PNG ou GIF. 1MB max.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nom complet</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="input"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-brand-slate-900">
                  Informations de l'organisation
                </h2>
              </div>
              <div className="card-body space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Nom de l'organisation</label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label">Secteur d'activite</label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="input"
                    >
                      {SECTORS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="label">Nombre d'employes</label>
                  <input
                    type="number"
                    value={employeeCount}
                    onChange={(e) => setEmployeeCount(e.target.value)}
                    className="input"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveOrganization}
                    disabled={saving}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card">
              <div className="card-header">
                <h2 className="font-semibold text-brand-slate-900">
                  Preferences de notification
                </h2>
              </div>
              <div className="card-body space-y-4">
                <label className="flex items-center justify-between p-4 bg-brand-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-brand-slate-900">
                      Notifications par email
                    </p>
                    <p className="text-sm text-brand-slate-500">
                      Recevoir les notifications importantes par email
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="w-5 h-5 rounded border-brand-slate-300 text-brand-green-600"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-brand-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-brand-slate-900">
                      Rappels d'evaluation
                    </p>
                    <p className="text-sm text-brand-slate-500">
                      Rappels pour les evaluations en cours
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={assessmentReminders}
                    onChange={(e) => setAssessmentReminders(e.target.checked)}
                    className="w-5 h-5 rounded border-brand-slate-300 text-brand-green-600"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-brand-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-brand-slate-900">
                      Alertes plans d'action
                    </p>
                    <p className="text-sm text-brand-slate-500">
                      Notifications pour les echeances et retards
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={actionPlanAlerts}
                    onChange={(e) => setActionPlanAlerts(e.target.checked)}
                    className="w-5 h-5 rounded border-brand-slate-300 text-brand-green-600"
                  />
                </label>

                <label className="flex items-center justify-between p-4 bg-brand-slate-50 rounded-lg cursor-pointer">
                  <div>
                    <p className="font-medium text-brand-slate-900">
                      Resume hebdomadaire
                    </p>
                    <p className="text-sm text-brand-slate-500">
                      Recevoir un resume de l'activite chaque semaine
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={weeklyDigest}
                    onChange={(e) => setWeeklyDigest(e.target.checked)}
                    className="w-5 h-5 rounded border-brand-slate-300 text-brand-green-600"
                  />
                </label>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveNotifications}
                    disabled={saving}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="card">
                <div className="card-header">
                  <h2 className="font-semibold text-brand-slate-900">
                    Changer le mot de passe
                  </h2>
                </div>
                <div className="card-body space-y-4">
                  <div>
                    <label className="label">Mot de passe actuel</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Nouveau mot de passe</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="label">Confirmer le mot de passe</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleChangePassword}
                      disabled={saving || !currentPassword || !newPassword}
                      className="btn-primary"
                    >
                      <Key className="w-4 h-4 mr-2" />
                      {saving ? 'Modification...' : 'Modifier le mot de passe'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="font-semibold text-brand-slate-900">
                    Authentification a deux facteurs
                  </h2>
                </div>
                <div className="card-body">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-brand-slate-900">Activer le MFA</p>
                      <p className="text-sm text-brand-slate-500 mt-1">
                        Ajoutez une couche de securite supplementaire
                      </p>
                    </div>
                    <button
                      onClick={() => setMfaEnabled(!mfaEnabled)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        mfaEnabled ? 'bg-brand-green-500' : 'bg-brand-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          mfaEnabled ? 'translate-x-8' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
