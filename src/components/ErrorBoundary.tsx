import { Component, type ReactNode } from 'react';
import { Shield, RefreshCw } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[CGEF ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-brand-slate-50 p-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-brand-slate-900 mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-brand-slate-500 mb-2 text-sm">
              {this.state.error?.message || 'Erreur inattendue'}
            </p>
            <p className="text-brand-slate-400 mb-6 text-xs">
              Si l&apos;erreur persiste, contactez le support technique.
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              Recharger la page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
