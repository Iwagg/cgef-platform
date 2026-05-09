import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, CircleAlert as AlertCircle, ArrowRight, CircleCheck as CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

export function Register() {
  const { signUp, loading } = useAuthStore();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (password !== confirmPassword) { setAuthError('Passwords do not match'); return; }
    if (password.length < 8) { setAuthError('Password must be at least 8 characters'); return; }
    try {
      await signUp(email, password, fullName);
      setSuccess(true);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Failed to create account. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface-950 flex items-center justify-center p-8">
        <div className="bg-surface-850 border border-white/8 rounded-2xl shadow-modal p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Account created</h2>
          <p className="text-sm text-slate-400 mb-6">Your account is ready. Sign in to access your dashboard.</p>
          <button onClick={() => navigate('/login')} className="btn btn-primary w-full gap-2">
            Sign in <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

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
            Join the platform.<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Start in minutes.</span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Create your account to access enterprise-grade GRC: risk management, compliance tracking, audit evidence, and executive reporting.
          </p>
          <div className="space-y-3">
            {['ISO 27001, NIS2, DORA, RGPD out of the box', 'Risk register with scoring & heatmaps', 'Automated audit evidence collection', 'Board-ready reporting in one click'].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-sm text-slate-300">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white/4 border border-white/8 rounded-xl p-4">
          <p className="text-xs text-slate-400 leading-relaxed italic mb-2">
            "Onboarding took less than a day. Within a week our entire compliance posture was visible to the board."
          </p>
          <p className="text-xs font-medium text-slate-300">Marie L. · Head of GRC, MedCore Health Systems</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-100">CGEF Platform</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Create your account</h1>
            <p className="text-sm text-slate-400">Get started — no credit card required.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {authError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {authError}
              </div>
            )}
            <div>
              <label className="label">Full name</label>
              <input type="text" className="input" placeholder="Your name" value={fullName}
                onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
            </div>
            <div>
              <label className="label">Work email</label>
              <input type="email" className="input" placeholder="you@company.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPassword ? 'text' : 'password'} className="input pr-10"
                  placeholder="Min. 8 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Confirm password</label>
              <input type="password" className="input" placeholder="Repeat your password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2 gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">Sign in</Link>
          </p>
          <div className="mt-8 pt-6 border-t border-white/8 text-center">
            <p className="text-xs text-slate-600">By registering, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
