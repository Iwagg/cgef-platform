import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, CircleAlert as AlertCircle, ArrowRight, CircleCheck as CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { supabase } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signOut, verifyLoginMFA, loading, user, mfaPending } = useAuthStore();
  const [mfaCode, setMfaCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();
  const needsMfa = !!user && mfaPending;

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setVerifying(true);
    try {
      await verifyLoginMFA(mfaCode.trim());
      navigate('/');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signIn(email, password);
      if (!useAuthStore.getState().mfaPending) navigate('/');
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Invalid email or password');
    }
  };

  // The emailed link signs the user in and lands on Settings → Security to set a new password
  const handleForgot = async () => {
    setAuthError('');
    setResetSent(false);
    if (!email) { setAuthError('Enter your email address first, then click “Forgot password?”.'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/settings?tab=security` });
    if (error) setAuthError(error.message);
    else setResetSent(true);
  };

  return (
    <div className="min-h-screen bg-surface-950 flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 bg-surface-900 border-r border-white/8 p-10">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-100">CGEF Platform</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-100 leading-tight mb-4">
            Enterprise GRC.<br />
            <span className="text-gradient">Built for CISOs.</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Manage cyber maturity, compliance, risks, and audit readiness across ISO 27001, NIS2, DORA, RGPD, and more — in a single unified platform.
          </p>
          <div className="space-y-3">
            {[
              'Multi-framework compliance management',
              'Real-time risk register & heatmaps',
              'Audit-ready evidence repository',
              'Executive reporting in one click',
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-slate-300">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/4 border border-white/8 rounded-xl p-4">
          <p className="text-xs text-slate-400 leading-relaxed mb-2">
            CGEF™ framework: 8 governance pillars, maturity scored from 1 to 5, mapped to ISO 27001, NIS2, DORA and RGPD.
          </p>
          <p className="text-xs font-medium text-slate-300">Horizons Gov Advisors</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-100">CGEF Platform</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Sign in</h1>
            <p className="text-sm text-slate-400">Welcome back — your security dashboard is ready.</p>
          </div>

          {needsMfa ? (
            <form onSubmit={handleMfa} className="space-y-4">
              <p className="text-sm text-slate-300">Two-factor authentication is enabled. Enter the 6-digit code from your authenticator app.</p>
              {authError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {authError}
                </div>
              )}
              <input className="input tracking-widest text-center text-lg" inputMode="numeric" maxLength={6} autoComplete="one-time-code" autoFocus
                placeholder="000000" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))} />
              <button type="submit" disabled={verifying || mfaCode.length !== 6} className="btn btn-primary w-full gap-2">
                {verifying ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Verify <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button type="button" className="w-full text-xs text-slate-500 hover:text-slate-300" onClick={() => { setMfaCode(''); signOut(); }}>Use another account</button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {authError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {authError}
              </div>
            )}
            {resetSent && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                If an account exists for this address, a reset link has been sent.
              </div>
            )}

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="label mb-0">Password</label>
                <button type="button" onClick={handleForgot} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">Forgot password?</button>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full mt-2 gap-2"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Sign in <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Request access
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
