import { useState } from 'react';
import { Shield, Building2, Users, ArrowRight, CircleAlert as AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

const SECTORS = [
  'Banque & Finance', 'Assurance', 'Santé', 'Énergie', 'Transport',
  'Télécommunications', 'Industrie', 'Commerce & Distribution',
  'Services', 'Secteur Public', 'Technologies', 'Autre',
];

const COUNTRIES = [
  { code: 'FR', name: 'France' }, { code: 'DE', name: 'Allemagne' },
  { code: 'IT', name: 'Italie' }, { code: 'ES', name: 'Espagne' },
  { code: 'BE', name: 'Belgique' }, { code: 'NL', name: 'Pays-Bas' },
  { code: 'LU', name: 'Luxembourg' }, { code: 'CH', name: 'Suisse' },
  { code: 'GB', name: 'Royaume-Uni' }, { code: 'OTHER', name: 'Autre' },
];

type Mode = 'choice' | 'create' | 'join';

export function Onboarding() {
  const { createOrganization, joinOrganization, loading } = useAuthStore();
  const [mode, setMode] = useState<Mode>('choice');
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [orgName, setOrgName] = useState('');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('FR');

  // Join form state
  const [orgId, setOrgId] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createOrganization(orgName, sector, country);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await joinOrganization(orgId.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Organisation introuvable');
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-slate-900 via-brand-slate-800 to-brand-green-900 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-10 h-10 text-brand-green-400" />
          <span className="text-2xl font-bold text-white">CGEF Platform</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6">Bienvenue sur CGEF Platform®</h1>
          <p className="text-brand-slate-300 text-lg">
            Créez ou rejoignez votre organisation pour commencer à évaluer votre maturité cybersécurité.
          </p>
        </div>
        <p className="text-brand-slate-400 text-sm">Horizons Gov Advisors — CGEF Platform® v1.0</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-brand-slate-50">
        <div className="w-full max-w-md">
          {mode === 'choice' && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-2xl font-bold text-brand-slate-900 mb-2">Configuration de votre espace</h2>
              <p className="text-brand-slate-500 mb-8">
                Pour utiliser CGEF Platform®, vous devez appartenir à une organisation.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => setMode('create')}
                  className="w-full p-5 border-2 border-brand-green-200 rounded-xl hover:border-brand-green-500 hover:bg-brand-green-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-green-100 rounded-xl flex items-center justify-center group-hover:bg-brand-green-200 transition-colors">
                      <Building2 className="w-6 h-6 text-brand-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-brand-slate-900">Créer une organisation</p>
                      <p className="text-sm text-brand-slate-500">Vous êtes RSSI, DSI ou Admin — créez votre espace</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-brand-slate-300 group-hover:text-brand-green-500 ml-auto transition-colors" />
                  </div>
                </button>

                <button
                  onClick={() => setMode('join')}
                  className="w-full p-5 border-2 border-brand-blue-200 rounded-xl hover:border-brand-blue-500 hover:bg-brand-blue-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-brand-blue-100 rounded-xl flex items-center justify-center group-hover:bg-brand-blue-200 transition-colors">
                      <Users className="w-6 h-6 text-brand-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-brand-slate-900">Rejoindre une organisation</p>
                      <p className="text-sm text-brand-slate-500">Votre admin vous a fourni un identifiant d'organisation</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-brand-slate-300 group-hover:text-brand-blue-500 ml-auto transition-colors" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode === 'create' && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <button onClick={() => setMode('choice')} className="text-brand-slate-400 hover:text-brand-slate-600 text-sm mb-6 flex items-center gap-1">
                ← Retour
              </button>
              <h2 className="text-2xl font-bold text-brand-slate-900 mb-2">Créer votre organisation</h2>
              <p className="text-brand-slate-500 mb-6">Vous serez automatiquement administrateur.</p>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="label">Nom de l&apos;organisation *</label>
                  <input className="input" type="text" value={orgName} onChange={e => setOrgName(e.target.value)}
                    placeholder="Ex : Acme Corporation" required />
                </div>
                <div>
                  <label className="label">Secteur d&apos;activité *</label>
                  <select className="input" value={sector} onChange={e => setSector(e.target.value)} required>
                    <option value="">Sélectionner un secteur</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Pays *</label>
                  <select className="input" value={country} onChange={e => setCountry(e.target.value)} required>
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? 'Création...' : 'Créer l\'organisation'}
                </button>
              </form>
            </div>
          )}

          {mode === 'join' && (
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <button onClick={() => setMode('choice')} className="text-brand-slate-400 hover:text-brand-slate-600 text-sm mb-6 flex items-center gap-1">
                ← Retour
              </button>
              <h2 className="text-2xl font-bold text-brand-slate-900 mb-2">Rejoindre une organisation</h2>
              <p className="text-brand-slate-500 mb-6">Demandez l&apos;identifiant à votre administrateur CGEF.</p>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{error}</span>
                </div>
              )}

              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="label">Identifiant de l&apos;organisation *</label>
                  <input className="input" type="text" value={orgId} onChange={e => setOrgId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
                  <p className="text-xs text-brand-slate-400 mt-1">
                    Format UUID, fourni par votre administrateur
                  </p>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                  {loading ? 'Vérification...' : 'Rejoindre l\'organisation'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
