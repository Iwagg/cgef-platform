import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield, LayoutDashboard, ClipboardCheck, FileCheck2, ListTodo, Settings, ChevronLeft, ChevronRight, LogOut, User, FileText, Bell } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';

const NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
  { to: '/assessments', icon: ClipboardCheck, label: 'Évaluations' },
  { to: '/compliance', icon: FileCheck2, label: 'Conformité' },
  { to: '/action-plans', icon: ListTodo, label: 'Plans d\'action' },
  { to: '/reporting', icon: FileText, label: 'Reporting' },
  { to: '/regulatory-intel', icon: Bell, label: 'Veille Réglementaire' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, organization, signOut } = useAuthStore();
  const roleLabels: Record<string, string> = { analyst: 'Analyste', manager: 'Manager', ciso: 'RSSI', admin: 'Admin' };

  return (
    <aside className={`flex flex-col h-screen bg-brand-slate-900 text-white transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'} flex-shrink-0`}>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-brand-slate-700">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center w-full' : ''}`}>
          <Shield className="w-8 h-8 text-brand-green-400 flex-shrink-0" />
          {!collapsed && (
            <div>
              <span className="font-bold text-base leading-tight block">CGEF Platform®</span>
              {organization && <span className="text-xs text-brand-slate-400 truncate block max-w-[130px]">{organization.name}</span>}
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="p-1.5 rounded-lg hover:bg-brand-slate-700 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {collapsed && (
        <button onClick={() => setCollapsed(false)} className="p-3 mx-auto mt-2 rounded-lg hover:bg-brand-slate-700 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                isActive ? 'bg-brand-green-600 text-white' : 'text-brand-slate-300 hover:bg-brand-slate-800 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </NavLink>
        ))}

        <div className="border-t border-brand-slate-700 my-2" />
        <NavLink to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              isActive ? 'bg-brand-green-600 text-white' : 'text-brand-slate-300 hover:bg-brand-slate-800 hover:text-white'
            } ${collapsed ? 'justify-center' : ''}`
          }
          title={collapsed ? 'Paramètres' : undefined}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Paramètres</span>}
        </NavLink>
      </nav>

      {/* User */}
      <div className="p-3 border-t border-brand-slate-700">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-brand-green-600 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.full_name || 'Utilisateur'}</p>
              <p className="text-xs text-brand-slate-400">{roleLabels[profile?.role || ''] || profile?.role}</p>
            </div>
          )}
          <button onClick={signOut} className="p-1.5 rounded-lg hover:bg-brand-slate-700 transition-colors flex-shrink-0" title="Déconnexion">
            <LogOut className="w-4 h-4 text-brand-slate-400" />
          </button>
        </div>
      </div>
    </aside>
  );
}
