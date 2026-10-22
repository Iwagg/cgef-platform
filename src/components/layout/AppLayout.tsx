import { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '../ui/Toast';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/auth';
import { isCategoryEnabled, type AlertCategory } from '../../lib/notifications';

const commandItems = [
  { label: 'Dashboard', href: '/', group: 'Navigation' },
  { label: 'Assessments', href: '/assessments', group: 'Navigation' },
  { label: 'Cyber Maturity', href: '/maturity', group: 'Navigation' },
  { label: 'Policies & Documents', href: '/policies', group: 'Navigation' },
  { label: 'Regulatory Intelligence', href: '/regulatory-intel', group: 'Navigation' },
  { label: 'Risk Register', href: '/risks', group: 'Navigation' },
  { label: 'Compliance Center', href: '/compliance', group: 'Navigation' },
  { label: 'Controls Library', href: '/controls', group: 'Navigation' },
  { label: 'Audit & Evidence', href: '/audit', group: 'Navigation' },
  { label: 'Incidents & Actions', href: '/incidents', group: 'Navigation' },
  { label: 'Assets & Third Parties', href: '/assets', group: 'Navigation' },
  { label: 'Roadmap & Projects', href: '/roadmap', group: 'Navigation' },
  { label: 'Reports', href: '/reporting', group: 'Navigation' },
  { label: 'Clients & Organisations', href: '/clients', group: 'Navigation' },
  { label: 'Settings', href: '/settings', group: 'Navigation' },
];

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commandItems.filter((i) =>
    i.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && filtered[selected]) {
        navigate(filtered[selected].href);
        onClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, filtered, selected, navigate, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel max-w-lg w-full mt-[-15vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
            placeholder="Search pages, actions..."
            className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />
          <kbd className="text-xs text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">ESC</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500 text-center">No results found</p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.href}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${i === selected ? 'bg-brand-500/15 text-slate-100' : 'text-slate-300 hover:bg-white/5'}`}
                onClick={() => { navigate(item.href); onClose(); }}
                onMouseEnter={() => setSelected(i)}
              >
                <span className="text-xs text-slate-500 w-20 flex-shrink-0">{item.group}</span>
                {item.label}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface LiveAlert { key: AlertCategory; title: string; href: string; type: 'error' | 'warning' | 'info' }

/** Counts computed from live data; categories can be muted in Settings → Notifications. */
async function loadAlerts(orgId: string, prefs: Record<string, boolean> | undefined): Promise<LiveAlert[]> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const inDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const head = (table: string) => supabase.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', orgId);

  const [critical, overdue, incidents, evidence, policies, deadlines] = await Promise.all([
    count(head('risks').eq('severity', 'critical').neq('status', 'closed')),
    count(head('action_plans').in('status', ['todo', 'in_progress', 'blocked']).lt('due_date', todayIso)),
    count(head('incidents').in('status', ['open', 'investigating'])),
    count(head('evidences').in('status', ['provided', 'reviewed'])),
    count(head('policy_documents').eq('status', 'approved').lte('next_review', inDays(30))),
    supabase.from('regulatory_calendars').select('title, deadline_date').gte('deadline_date', todayIso).lte('deadline_date', inDays(60)).order('deadline_date'),
  ]);

  const alerts: LiveAlert[] = [];
  if (critical) alerts.push({ key: 'critical_risk', title: `${critical} critical risk(s) open`, href: '/risks', type: 'error' });
  if (overdue) alerts.push({ key: 'action_overdue', title: `${overdue} action plan(s) overdue`, href: '/incidents', type: 'warning' });
  if (incidents) alerts.push({ key: 'incident_open', title: `${incidents} incident(s) being handled`, href: '/incidents', type: 'error' });
  if (evidence) alerts.push({ key: 'evidence_review', title: `${evidence} evidence item(s) awaiting review`, href: '/audit', type: 'info' });
  if (policies) alerts.push({ key: 'policy_review', title: `${policies} policy review(s) due within 30 days`, href: '/policies', type: 'warning' });
  (deadlines.data ?? []).forEach((d) => alerts.push({ key: 'regulatory_deadline', title: `${d.title} — ${new Date(d.deadline_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`, href: '/regulatory-intel', type: 'info' }));
  return alerts.filter((a) => isCategoryEnabled(prefs, a.key));
}

export function AppLayout() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { organization, profile } = useAuthStore();
  const unreadCount = alerts.length;

  useEffect(() => {
    if (!organization) return;
    loadAlerts(organization.id, profile?.notification_prefs).then(setAlerts).catch(() => setAlerts([]));
  }, [organization, profile?.notification_prefs, location.pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen bg-surface-950 overflow-hidden">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 flex-shrink-0 flex items-center justify-between px-5 border-b border-white/8 bg-surface-900/80 backdrop-blur-sm">
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/8 hover:bg-white/8 transition-colors text-sm text-slate-400 hover:text-slate-300 min-w-[200px]"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left text-sm">Quick search...</span>
            <span className="flex items-center gap-0.5">
              <kbd className="text-xs bg-white/5 px-1 py-0.5 rounded border border-white/10">⌘K</kbd>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="btn-ghost btn-icon relative"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-surface-800 border border-white/10 rounded-xl shadow-modal z-50 animate-scale-in">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
                    <span className="text-sm font-semibold text-slate-200">Notifications</span>
                    <button onClick={() => setNotifOpen(false)} className="text-slate-500 hover:text-slate-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {alerts.map((n, i) => (
                      <button key={i} onClick={() => { navigate(n.href); setNotifOpen(false); }} className="w-full text-left flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-colors">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.type === 'error' ? 'bg-red-400' : n.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'}`} />
                        <p className="flex-1 min-w-0 text-xs text-slate-300 leading-relaxed">{n.title}</p>
                      </button>
                    ))}
                    {alerts.length === 0 && <p className="px-4 py-6 text-center text-xs text-slate-500">Nothing needs your attention.</p>}
                  </div>
                  <div className="px-4 py-2.5 text-center">
                    <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors" onClick={() => { navigate('/settings?tab=notifications'); setNotifOpen(false); }}>Notification settings</button>
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-sm gap-1.5" onClick={() => navigate('/assessments')}>
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Assessment</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-surface-950">
          <div className="max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <ToastContainer />
    </div>
  );
}
