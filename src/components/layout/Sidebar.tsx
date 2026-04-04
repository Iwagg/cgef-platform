import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  ClipboardCheck,
  FileCheck2,
  ListTodo,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/assessments', icon: ClipboardCheck, label: 'Evaluations' },
  { to: '/compliance', icon: FileCheck2, label: 'Conformite' },
  { to: '/action-plans', icon: ListTodo, label: 'Plans d\'action' },
  { to: '/settings', icon: Settings, label: 'Parametres' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut } = useAuthStore();

  return (
    <aside
      className={`flex flex-col h-screen bg-brand-slate-900 text-white transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center justify-between p-4 border-b border-brand-slate-700">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
          <Shield className="w-8 h-8 text-brand-green-400 flex-shrink-0" />
          {!collapsed && (
            <span className="font-bold text-lg">CGEF</span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg hover:bg-brand-slate-700 transition-colors ${
            collapsed ? 'hidden' : ''
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="p-3 mx-auto mt-2 rounded-lg hover:bg-brand-slate-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-brand-green-600 text-white'
                  : 'text-brand-slate-300 hover:bg-brand-slate-800 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-brand-slate-700">
        <div
          className={`flex items-center gap-3 mb-3 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-brand-green-600 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.full_name || 'Utilisateur'}
              </p>
              <p className="text-xs text-brand-slate-400 truncate">
                {profile?.role === 'ciso' ? 'RSSI' : profile?.role || 'Analyste'}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={signOut}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-brand-slate-300 hover:bg-brand-slate-800 hover:text-white transition-colors ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Deconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
