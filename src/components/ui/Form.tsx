import { type ReactNode } from 'react';
import { Trash2, Inbox } from 'lucide-react';
import { useAction } from '../../hooks/useAction';

export function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export function SubmitButton({ pending, children, onClick, variant = 'btn-primary', disabled }: {
  pending: boolean; children: ReactNode; onClick: () => void; variant?: string; disabled?: boolean;
}) {
  return (
    <button className={`btn ${variant} btn-sm`} onClick={onClick} disabled={pending || disabled}>
      {pending && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {children}
    </button>
  );
}

export function DeleteButton({ onConfirm, label = 'Delete' }: { onConfirm: () => Promise<unknown>; label?: string }) {
  const { pending, run } = useAction();
  return (
    <button
      className="btn btn-outline btn-sm text-red-400 hover:text-red-300"
      disabled={pending}
      onClick={() => { if (window.confirm('Delete this item permanently?')) run(onConfirm, 'Deleted'); }}
    >
      <Trash2 className="w-3.5 h-3.5" /> {label}
    </button>
  );
}

export function EmptyState({ title, message, action }: { title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="bg-surface-850 border border-white/8 rounded-xl text-center py-14 px-6">
      <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-3" />
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {message && <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-7 h-7 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
    </div>
  );
}

export function DetailGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((f) => (
        <div key={f.label} className="bg-white/4 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-0.5">{f.label}</p>
          <p className="text-sm font-medium text-slate-200 break-words">{f.value ?? '—'}</p>
        </div>
      ))}
    </div>
  );
}
