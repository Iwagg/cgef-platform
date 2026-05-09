import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Shield, TriangleAlert as AlertTriangle, SquareCheck as CheckSquare, BookOpen, FileText, Zap, Server, Map, ChartBar as BarChart3, Settings, LogOut, ChevronLeft, ChevronRight, Building2, FlaskConical } from 'lucide-react';
import { useAuthStore } from '../../stores/auth';

const navigation = [
  { group: 'Overview', items: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
  ]},
  { group: 'Security', items: [
    { label: 'Cyber Maturity', icon: Shield, href: '/maturity' },
    { label: 'Risk Register', icon: AlertTriangle, href: '/risks' },
    { label: 'Controls Library', icon: CheckSquare, href: '/controls' },
    { label: 'Incidents & Actions', icon: Zap, href: '/incidents' },
  ]},
  { group: 'Compliance', items: [
    { label: 'Compliance Center', icon: BookOpen, href: '/compliance' },
    { label: 'Audit & Evidence', icon: FlaskConical, href: '/audit' },
    { label: 'Policies & Docs', icon: FileText, href: '/policies' },
  ]},
  { group: 'Assets', items: [
    { label: 'Assets & Third Parties', icon: Server, href: '/assets' },
  ]},
  { group: 'Planning', items: [
    { label: 'Roadmap & Projects', icon: Map, href: '/roadmap' },
    { label: 'Reports', icon: BarChart3, href: '/reporting' },
  ]},
  { group: 'Management', items: [
    { label: 'Clients & Orgs', icon: Building2, href: '/clients' },
  ]},
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, organization, signOut } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside
      className={`flex flex-col h-screen bg-surface-900 border-r border-white/8 transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}
    >
      {/* Logo */}
      <div className={`flex items-center border-b border-white/8 flex-shrink-0 h-14 ${collapsed ? 'justify-center' : 'px-4 gap-3'}`}>
        <div className="w-7 h-7 rounded-lg bg-brand-500 flex items-center justify-center flex-shrink-0">
          <Shield className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span className="text-sm font-bold text-slate-100 block truncate">CGEF Platform</span>
            <span className="text-xs text-slate-500 block truncate">GRC &amp; Compliance</span>
          </div>
        )}
      </div>

      {!collapsed && organization && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/8 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-200 truncate">{organization.name}</p>
            <p className="text-xs text-slate-500 truncate">{(organization as { sector?: string }).sector ?? 'Enterprise'}</p>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navigation.map((group) => (
          <div key={group.group} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">{group.group}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) =>
                      `flex items-center transition-all duration-150 group relative ${
                        collapsed
                          ? 'justify-center w-10 h-10 mx-auto rounded-lg'
                          : 'gap-3 px-3 py-2 rounded-lg text-sm font-medium'
                      } ${
                        isActive
                          ? 'bg-brand-500/15 text-slate-100 border border-brand-500/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/6'
                      }`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-surface-800 border border-white/10 rounded-md text-xs text-slate-200 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-modal">
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/8 p-2 flex-shrink-0 space-y-0.5">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center transition-all ${
              collapsed ? 'justify-center w-10 h-10 mx-auto rounded-lg' : 'gap-3 px-3 py-2 rounded-lg text-sm font-medium'
            } ${isActive ? 'bg-white/8 text-slate-200' : 'text-slate-400 hover:text-slate-200 hover:bg-white/6'}`
          }
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>

        {!collapsed && profile && (
          <button
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 group transition-colors"
            onClick={handleSignOut}
          >
            <div className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 flex-shrink-0">
              {profile.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-xs font-medium text-slate-300 truncate">{profile.full_name ?? 'User'}</p>
              <p className="text-xs text-slate-500 capitalize truncate">{profile.role}</p>
            </div>
            <LogOut className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        )}

        {collapsed && (
          <button
            onClick={handleSignOut}
            className="flex items-center justify-center w-10 h-10 mx-auto rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/6 transition-all"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`flex items-center justify-center w-10 h-10 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/6 transition-all ${collapsed ? 'mx-auto' : 'ml-auto'}`}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
