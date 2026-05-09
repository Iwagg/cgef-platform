import { useState } from 'react';
import { Shield, Building2, Users, ArrowRight, CircleAlert as AlertCircle, CircleCheck as CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

const SECTORS = [
  'Finance & Banking', 'Insurance', 'Healthcare', 'Energy & Utilities',
  'Transportation', 'Telecommunications', 'Manufacturing', 'Retail & Distribution',
  'Professional Services', 'Public Sector', 'Technology', 'Other',
];

const COUNTRIES = [
  { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' },
  { code: 'IT', name: 'Italy' }, { code: 'ES', name: 'Spain' },
  { code: 'BE', name: 'Belgium' }, { code: 'NL', name: 'Netherlands' },
  { code: 'LU', name: 'Luxembourg' }, { code: 'CH', name: 'Switzerland' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'OTHER', name: 'Other' },
];

type Mode = 'choice' | 'create' | 'join';

export function Onboarding() {
  const { createOrganization, joinOrganization, loading } = useAuthStore();
  const [mode, setMode] = useState<Mode>('choice');
  const [error, setError] = useState<string | null>(null);
  const [orgName, setOrgName] = useState('');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('FR');
  const [orgId, setOrgId] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try { await createOrganization(orgName, sector, country); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed to create organisation'); }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try { await joinOrganization(orgId.trim()); }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Organisation not found'); }
  };

  return (
    <div className="min-h-screen bg-surface-950 flex">
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-surface-900 border-r border-white/8 p-10">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-100">CGEF Platform</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-100 leading-tight mb-4">
            Set up your workspace.<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Ready in 2 minutes.</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Create or join your organisation to start managing cyber maturity, compliance, and risk — all in one place.
          </p>
          <div className="space-y-4">
            {[
              { step: '1', label: 'Create or join your organisation' },
              { step: '2', label: 'Select your active compliance frameworks' },
              { step: '3', label: 'Invite your team members' },
              { step: '4', label: 'Launch your first assessment' },
            ].map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0">
                  {s.step}
                </div>
                <span className="text-sm text-slate-300">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/4 border border-white/8 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Trusted by 200+ security teams</span>
          </div>
          <p className="text-xs text-slate-500">ISO 27001 · NIS2 · DORA · RGPD · NIST CSF · CIS Controls · SOC 2</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-100">CGEF Platform</span>
          </div>

          {mode === 'choice' && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Welcome to CGEF Platform</h1>
                <p className="text-sm text-slate-400">To get started, you need to belong to an organisation.</p>
              </div>
              <div className="space-y-3">
                <button onClick={() => setMode('create')}
                  className="w-full p-5 bg-surface-850 border border-white/8 rounded-xl hover:border-brand-500/40 hover:bg-brand-500/5 transition-all text-left group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-500/15 rounded-lg flex items-center justify-center group-hover:bg-brand-500/25 transition-colors">
                      <Building2 className="w-5 h-5 text-brand-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-200 text-sm">Create an organisation</p>
                      <p className="text-xs text-slate-500 mt-0.5">You are a CISO, CTO, or admin — set up your workspace</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-brand-400 transition-colors" />
                  </div>
                </button>
                <button onClick={() => setMode('join')}
                  className="w-full p-5 bg-surface-850 border border-white/8 rounded-xl hover:border-white/20 hover:bg-white/3 transition-all text-left group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-500/15 rounded-lg flex items-center justify-center group-hover:bg-slate-500/25 transition-colors">
                      <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-200 text-sm">Join an organisation</p>
                      <p className="text-xs text-slate-500 mt-0.5">Your admin provided you with an organisation ID</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode === 'create' && (
            <div>
              <button onClick={() => setMode('choice')} className="text-slate-500 hover:text-slate-300 text-sm mb-6 flex items-center gap-1 transition-colors">
                ← Back
              </button>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Create your organisation</h1>
                <p className="text-sm text-slate-400">You will be automatically assigned as administrator.</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-5 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="label">Organisation name</label>
                  <input className="input" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Acme Corporation" required />
                </div>
                <div>
                  <label className="label">Industry sector</label>
                  <select className="select" value={sector} onChange={(e) => setSector(e.target.value)} required>
                    <option value="">Select a sector</option>
                    {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Country</label>
                  <select className="select" value={country} onChange={(e) => setCountry(e.target.value)} required>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2 mt-2">
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create organisation <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </div>
          )}

          {mode === 'join' && (
            <div>
              <button onClick={() => setMode('choice')} className="text-slate-500 hover:text-slate-300 text-sm mb-6 flex items-center gap-1 transition-colors">
                ← Back
              </button>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-100 mb-2">Join an organisation</h1>
                <p className="text-sm text-slate-400">Request the organisation ID from your CGEF administrator.</p>
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-5 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="label">Organisation ID</label>
                  <input className="input font-mono text-sm" type="text" value={orgId} onChange={(e) => setOrgId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
                  <p className="text-xs text-slate-500 mt-1.5">UUID format — provided by your administrator</p>
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2 mt-2">
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Join organisation <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
