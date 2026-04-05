import { useState } from 'react';
import { User, Building2, Bell, Shield, Save, CircleAlert as AlertCircle, CircleCheck as CheckCircle, Eye, EyeOff, QrCode } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import type { UserRole } from '../lib/types';

type TabId = 'profile' | 'organization' | 'notifications' | 'security';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{className?:string}> }[] = [
  { id: 'profile', label: 'Profil', icon: User },
  { id: 'organization', label: 'Organisation', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Sécurité', icon: Shield },
];

const ROLES: { value: UserRole; label: string; desc: string }[] = [
  { value: 'analyst', label: 'Analyste', desc: 'Peut créer et évaluer des évaluations' },
  { value: 'manager', label: 'Manager', desc: 'Peut approuver et générer des rapports' },
  { value: 'ciso', label: 'RSSI', desc: 'Accès complet sauf gestion des tenants' },
  { value: 'admin', label: 'Administrateur', desc: 'Accès complet à toutes les fonctionnalités' },
];

const SECTORS = ['Banque & Finance','Assurance','Santé','Énergie','Transport','Télécommunications','Industrie','Commerce & Distribution','Services','Secteur Public','Technologies','Autre'];
const COUNTRIES = ['FR','DE','IT','ES','BE','NL','LU','CH','GB','OTHER'];

export function Settings() {
  const { profile, organization, updateProfile, updateOrganization, changePassword, enableMFA, verifyMFA } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('profile');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [role, setRole] = useState<UserRole>(profile?.role || 'analyst');

  // Organization
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [sector, setSector] = useState(organization?.sector || '');
  const [country, setCountry] = useState(organization?.country || 'FR');
  const [employeeCount, setEmployeeCount] = useState(organization?.employee_count?.toString() || '');

  // Notifications (stored in localStorage for now — future: Supabase table)
  const [emailNotif, setEmailNotif] = useState(() => localStorage.getItem('notif_email') !== 'false');
  const [assessmentReminders, setAssessmentReminders] = useState(() => localStorage.getItem('notif_reminders') !== 'false');
  const [actionAlerts, setActionAlerts] = useState(() => localStorage.getItem('notif_actions') !== 'false');
  const [weeklyDigest, setWeeklyDigest] = useState(() => localStorage.getItem('notif_digest') === 'true');

  // Security
  const [_currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [mfaQr, setMfaQr] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaEnrolling, setMfaEnrolling] = useState(false);

  const flash = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(''); }
    else { setSuccess(msg); setError(''); }
    setTimeout(() => { setSuccess(''); setError(''); }, 4000);
  };

  // ── HANDLERS ──────────────────────────────────────────────
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName, role });
      flash('Profil mis à jour avec succès.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde', true);
    } finally { setSaving(false); }
  };

  const handleSaveOrg = async () => {
    setSaving(true);
    try {
      await updateOrganization({ name: orgName, sector, country, employee_count: employeeCount ? parseInt(employeeCount) : undefined });
      flash('Organisation mise à jour avec succès.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde', true);
    } finally { setSaving(false); }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem('notif_email', String(emailNotif));
    localStorage.setItem('notif_reminders', String(assessmentReminders));
    localStorage.setItem('notif_actions', String(actionAlerts));
    localStorage.setItem('notif_digest', String(weeklyDigest));
    flash('Préférences de notifications sauvegardées.');
  };

  const handleChangePassword = async () => {
    if (!newPwd || newPwd.length < 8) { flash('Le mot de passe doit contenir au moins 8 caractères.', true); return; }
    if (newPwd !== confirmPwd) { flash('Les mots de passe ne correspondent pas.', true); return; }
    setSaving(true);
    try {
      await changePassword(newPwd);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      flash('Mot de passe modifié avec succès.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Erreur lors du changement de mot de passe', true);
    } finally { setSaving(false); }
  };

  const handleEnableMFA = async () => {
    setMfaEnrolling(true);
    try {
      const result = await enableMFA();
      if (result) setMfaQr(result.qr);
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Erreur lors de l\'activation du MFA', true);
    } finally { setMfaEnrolling(false); }
  };

  const handleVerifyMFA = async () => {
    if (!mfaCode || mfaCode.length !== 6) { flash('Entrez le code à 6 chiffres de votre application.', true); return; }
    setSaving(true);
    try {
      const ok = await verifyMFA(mfaCode);
      if (ok) { setMfaQr(null); setMfaCode(''); flash('MFA activé avec succès !'); }
      else { flash('Code incorrect. Veuillez réessayer.', true); }
    } catch { flash('Erreur lors de la vérification.', true); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-slate-900">Paramètres</h1>
        <p className="text-brand-slate-500 mt-1">Gérez votre profil, votre organisation et vos préférences</p>
      </div>

      {(success || error) && (
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {success ? <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />}
          <span className={`text-sm ${success ? 'text-green-700' : 'text-red-700'}`}>{success || error}</span>
        </div>
      )}

      <div className="flex gap-1 border-b border-brand-slate-200">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-brand-green-500 text-brand-green-600' : 'border-transparent text-brand-slate-500 hover:text-brand-slate-700'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── PROFILE ── */}
      {activeTab === 'profile' && (
        <div className="card max-w-2xl">
          <div className="card-header"><h2 className="font-semibold text-brand-slate-900">Informations personnelles</h2></div>
          <div className="card-body space-y-4">
            <div className="w-16 h-16 rounded-full bg-brand-green-100 flex items-center justify-center mb-2">
              <span className="text-2xl font-bold text-brand-green-600">{(fullName || 'U')[0].toUpperCase()}</span>
            </div>
            <div>
              <label className="label">Nom complet</label>
              <input className="input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jean Dupont" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input bg-brand-slate-50 cursor-not-allowed" type="email" value={useAuthStore.getState().user?.email || ''} readOnly />
              <p className="text-xs text-brand-slate-400 mt-1">L&apos;email ne peut pas être modifié ici.</p>
            </div>
            <div>
              <label className="label">Rôle</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                {ROLES.map(r => (
                  <button key={r.value} onClick={() => setRole(r.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${role === r.value ? 'border-brand-green-500 bg-brand-green-50' : 'border-brand-slate-200 hover:border-brand-slate-300'}`}>
                    <div className="font-medium text-brand-slate-900 text-sm">{r.label}</div>
                    <div className="text-xs text-brand-slate-400 mt-0.5">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />{saving ? 'Sauvegarde...' : 'Sauvegarder le profil'}
            </button>
          </div>
        </div>
      )}

      {/* ── ORGANISATION ── */}
      {activeTab === 'organization' && (
        <div className="card max-w-2xl">
          <div className="card-header">
            <h2 className="font-semibold text-brand-slate-900">Paramètres de l&apos;organisation</h2>
            {organization && <p className="text-xs text-brand-slate-400 mt-0.5 font-mono">ID : {organization.id}</p>}
          </div>
          <div className="card-body space-y-4">
            <div>
              <label className="label">Nom de l&apos;organisation *</label>
              <input className="input" type="text" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Mon Organisation" />
            </div>
            <div>
              <label className="label">Secteur d&apos;activité</label>
              <select className="input" value={sector} onChange={e => setSector(e.target.value)}>
                <option value="">Sélectionner...</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Pays</label>
                <select className="input" value={country} onChange={e => setCountry(e.target.value)}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Effectif</label>
                <input className="input" type="number" value={employeeCount} onChange={e => setEmployeeCount(e.target.value)} placeholder="500" />
              </div>
            </div>
            <div className="p-3 bg-brand-slate-50 rounded-lg border border-brand-slate-200">
              <p className="text-xs font-mono text-brand-slate-500">ID Organisation (à partager avec vos collaborateurs) :</p>
              <p className="text-sm font-mono text-brand-slate-700 mt-1 break-all">{organization?.id || '—'}</p>
            </div>
            <button onClick={handleSaveOrg} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />{saving ? 'Sauvegarde...' : 'Sauvegarder l\'organisation'}
            </button>
          </div>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {activeTab === 'notifications' && (
        <div className="card max-w-2xl">
          <div className="card-header"><h2 className="font-semibold text-brand-slate-900">Préférences de notification</h2></div>
          <div className="card-body space-y-4">
            {[
              { label: 'Notifications par email', desc: 'Recevoir les notifications importantes par email', val: emailNotif, set: setEmailNotif },
              { label: 'Rappels d\'évaluation', desc: 'Alertes pour les évaluations en attente ou en retard', val: assessmentReminders, set: setAssessmentReminders },
              { label: 'Alertes plans d\'action', desc: 'Notifications pour les tâches et échéances', val: actionAlerts, set: setActionAlerts },
              { label: 'Synthèse hebdomadaire', desc: 'Récapitulatif de votre posture de sécurité chaque semaine', val: weeklyDigest, set: setWeeklyDigest },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-brand-slate-200 rounded-lg">
                <div>
                  <p className="font-medium text-brand-slate-900">{n.label}</p>
                  <p className="text-sm text-brand-slate-500">{n.desc}</p>
                </div>
                <button
                  onClick={() => n.set(!n.val)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${n.val ? 'bg-brand-green-500' : 'bg-brand-slate-200'}`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${n.val ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
            <button onClick={handleSaveNotifications} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />Sauvegarder les notifications
            </button>
          </div>
        </div>
      )}

      {/* ── SÉCURITÉ ── */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-2xl">
          {/* Password change */}
          <div className="card">
            <div className="card-header"><h2 className="font-semibold text-brand-slate-900">Changer le mot de passe</h2></div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">Nouveau mot de passe</label>
                <div className="relative">
                  <input className="input pr-10" type={showPwd ? 'text' : 'password'} value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Min. 8 caractères" />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-slate-400">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {newPwd && (
                  <div className="mt-2 flex gap-1">
                    {['Faible','Moyen','Fort','Très fort'].map((_s, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full ${newPwd.length > i * 3 + 3 ? (i < 1 ? 'bg-red-400' : i < 2 ? 'bg-orange-400' : i < 3 ? 'bg-yellow-400' : 'bg-green-500') : 'bg-brand-slate-200'}`} />
                    ))}
                    <span className="text-xs text-brand-slate-400 ml-2">{newPwd.length < 6 ? 'Faible' : newPwd.length < 10 ? 'Moyen' : newPwd.length < 14 ? 'Fort' : 'Très fort'}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Confirmer le nouveau mot de passe</label>
                <input className="input" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Confirmer" />
              </div>
              <button onClick={handleChangePassword} disabled={saving || !newPwd} className="btn-primary flex items-center gap-2">
                <Shield className="w-4 h-4" />{saving ? 'Modification...' : 'Changer le mot de passe'}
              </button>
            </div>
          </div>

          {/* MFA */}
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold text-brand-slate-900">Authentification Multi-Facteurs (MFA)</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${profile?.mfa_enabled ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                {profile?.mfa_enabled ? '✓ Activé' : '⚠ Non activé'}
              </span>
            </div>
            <div className="card-body">
              {profile?.mfa_enabled ? (
                <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-sm text-green-700">Le MFA est activé sur votre compte. Votre accès est sécurisé.</p>
                </div>
              ) : mfaQr ? (
                <div className="space-y-4">
                  <div className="p-4 bg-brand-slate-50 rounded-lg border border-brand-slate-200 text-center">
                    <QrCode className="w-8 h-8 text-brand-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-brand-slate-600 mb-3">Scannez ce QR code avec Google Authenticator ou Authy :</p>
                    <img src={mfaQr} alt="QR Code MFA" className="mx-auto w-48 h-48 border-4 border-white shadow-lg rounded" />
                  </div>
                  <div>
                    <label className="label">Code de vérification (6 chiffres)</label>
                    <input className="input text-center tracking-widest text-lg" type="text" maxLength={6} value={mfaCode} onChange={e => setMfaCode(e.target.value.replace(/\D/g,''))} placeholder="000000" />
                  </div>
                  <button onClick={handleVerifyMFA} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />{saving ? 'Vérification...' : 'Activer le MFA'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-brand-slate-600">
                    Protégez votre compte avec une authentification en deux étapes via une application TOTP (Google Authenticator, Authy).
                  </p>
                  <button onClick={handleEnableMFA} disabled={mfaEnrolling} className="btn-primary flex items-center gap-2">
                    <Shield className="w-4 h-4" />{mfaEnrolling ? 'Configuration...' : 'Activer le MFA'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
