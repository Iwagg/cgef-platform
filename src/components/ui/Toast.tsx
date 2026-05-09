import { useState, useCallback, useEffect } from 'react';
import { CircleCheck as CheckCircle, Circle as XCircle, TriangleAlert as AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

let toastCallback: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function toast(t: Omit<Toast, 'id'>) {
  toastCallback?.(t);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    toastCallback = (t) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { ...t, id }]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
    };
    return () => { toastCallback = null; };
  }, []);

  const remove = useCallback((id: string) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
    error: <XCircle className="w-4 h-4 text-red-400" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    info: <Info className="w-4 h-4 text-blue-400" />,
  };

  const borders = {
    success: 'border-emerald-500/20',
    error: 'border-red-500/20',
    warning: 'border-amber-500/20',
    info: 'border-blue-500/20',
  };

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 bg-surface-800 border ${borders[t.type]} rounded-xl px-4 py-3 shadow-modal min-w-[280px] max-w-sm animate-slide-up`}
        >
          <div className="flex-shrink-0 mt-0.5">{icons[t.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200">{t.title}</p>
            {t.message && <p className="text-xs text-slate-400 mt-0.5">{t.message}</p>}
          </div>
          <button onClick={() => remove(t.id)} className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
