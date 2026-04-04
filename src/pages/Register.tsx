import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Eye, EyeOff, CircleAlert as AlertCircle, CircleCheck as CheckCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth';

export function Register() {
  const { signUp, loading } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }

    try {
      await signUp(email, password, fullName);
      setSuccess(true);
    } catch (err) {
      setError('Erreur lors de la creation du compte');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-slate-50 p-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-brand-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-brand-slate-900 mb-2">
            Compte cree avec succes
          </h2>
          <p className="text-brand-slate-500 mb-6">
            Vous pouvez maintenant vous connecter avec vos identifiants.
          </p>
          <Link to="/login" className="btn-primary w-full py-3 inline-block">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-brand-slate-900 via-brand-slate-800 to-brand-green-900 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-10 h-10 text-brand-green-400" />
          <span className="text-2xl font-bold text-white">CGEF Platform</span>
        </div>
        <div className="max-w-md">
          <h1 className="text-4xl font-bold text-white mb-6">
            Rejoignez la plateforme CGEF
          </h1>
          <p className="text-brand-slate-300 text-lg">
            Creez votre compte pour commencer a evaluer et ameliorer votre posture cybersecurite.
          </p>
        </div>
        <p className="text-brand-slate-400 text-sm">
          Horizons GovAdvisors - CGEF Platform v1.0
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-brand-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <Shield className="w-8 h-8 text-brand-green-500" />
            <span className="text-xl font-bold text-brand-slate-900">CGEF Platform</span>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-brand-slate-900 mb-2">Creer un compte</h2>
            <p className="text-brand-slate-500 mb-6">
              Remplissez les informations ci-dessous
            </p>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nom complet</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input"
                  placeholder="Jean Dupont"
                  required
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="vous@exemple.com"
                  required
                />
              </div>

              <div>
                <label className="label">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pr-10"
                    placeholder="Min. 8 caracteres"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-slate-400 hover:text-brand-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirmer le mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Confirmer votre mot de passe"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3"
              >
                {loading ? 'Creation...' : 'Creer mon compte'}
              </button>
            </form>

            <p className="text-center text-brand-slate-500 mt-6">
              Deja un compte ?{' '}
              <Link to="/login" className="text-brand-green-600 hover:underline font-medium">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
