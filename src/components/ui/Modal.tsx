import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  actions?: ReactNode;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
};

export function Modal({ open, onClose, title, subtitle, children, size = 'md', actions }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal-panel ${sizes[size]} w-full`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-start justify-between p-5 border-b border-white/8">
            <div>
              <h2 className="text-base font-semibold text-slate-100">{title}</h2>
              {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="btn-ghost btn-icon ml-3 flex-shrink-0 -mt-0.5 -mr-0.5"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
        {actions && (
          <div className="px-5 pb-5 flex items-center justify-end gap-3 border-t border-white/8 pt-4">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, children, width = 'max-w-xl' }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-all duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
    >
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300`}
        onClick={onClose}
      />
      <div
        className={`relative ${width} w-full bg-surface-850 border-l border-white/8 shadow-modal flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 flex-shrink-0">
            <h2 className="text-base font-semibold text-slate-100">{title}</h2>
            <button onClick={onClose} className="btn-ghost btn-icon">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
