import { useState } from 'react';
import { User, Building2, Bell, Shield, Save, Users, Key, CreditCard, CircleAlert as AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { PageHeader } from '../components/ui/PageHeader';
import { toast } from '../components/ui/Toast';
import { mockUsers } from '../lib/mock-data';

const tabs = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'organisation', label: 'Organisation', icon: Building2 },
  { key: 'team', label: 'Team & Roles', icon: Users },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'api', label: 'API Keys', icon: Key },
  { key: 'billing', label: 'Billing', icon: CreditCard },
];

const roleOptions = ['admin', 'ciso', 'manager', 'analyst', 'auditor', 'consultant', 'viewer'];

export function Settings() {
  const { profile, organization } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [name, setName] = useState(profile?.full_name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast({ type: 'success', title: 'Settings saved', message: 'Your changes have been saved successfully.' });
  };

  return (
    <div className="page-container">
      <PageHeader title="Settings" subtitle="Manage your account, organisation, and platform preferences" />

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.key ? 'bg-brand-500/15 text-slate-100 border border-brand-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/6'
                }`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {activeTab === 'profile' && (
            <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-5">Profile Information</h3>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl bg-brand-500/20 flex items-center justify-center text-2xl font-bold text-brand-400">
                  {(profile?.full_name ?? 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{profile?.full_name ?? 'User'}</p>
                  <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
                  <button className="text-xs text-brand-400 hover:text-brand-300 mt-1 transition-colors">Change avatar</button>
                </div>
              </div>
              <div className="space-y-4 max-w-md">
                <div><label className="label">Full Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div><label className="label">Email Address</label><input type="email" className="input" defaultValue={profile?.full_name ? `${profile.full_name.toLowerCase().replace(' ', '.')}@company.com` : ''} /></div>
                <div><label className="label">Role</label><select className="select" defaultValue={profile?.role}>{roleOptions.map(r => <option key={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}</select></div>
                <div><label className="label">Language</label><select className="select"><option>English</option><option>French</option><option>German</option></select></div>
              </div>
              <div className="mt-5 pt-4 border-t border-white/8">
                <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                  {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'organisation' && (
            <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-5">Organisation Settings</h3>
              <div className="space-y-4 max-w-md">
                <div><label className="label">Organisation Name</label><input className="input" defaultValue={organization?.name ?? ''} /></div>
                <div><label className="label">Sector</label><select className="select"><option>Finance</option><option>Insurance</option><option>Healthcare</option><option>Industry</option><option>Energy</option><option>Public Sector</option><option>Technology</option><option>Consulting</option></select></div>
                <div><label className="label">Country</label><input className="input" defaultValue="France" /></div>
                <div><label className="label">Organisation Size</label><select className="select"><option>SME (1–249)</option><option>Mid-market (250–999)</option><option>Enterprise (1000+)</option></select></div>
              </div>
              <div className="mt-5">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Active Frameworks</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['ISO 27001', 'NIS2', 'DORA', 'RGPD', 'NIST CSF', 'CIS Controls', 'SOC 2', 'PCI-DSS'].map((f) => (
                    <label key={f} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer p-2 rounded-lg hover:bg-white/4">
                      <input type="checkbox" className="accent-brand-500" defaultChecked={['ISO 27001', 'NIS2', 'DORA', 'RGPD'].includes(f)} />
                      {f}
                    </label>
                  ))}
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-white/8">
                <button className="btn btn-primary btn-sm" onClick={handleSave}>
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'team' && (
            <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Team Members</h3>
                <button className="btn btn-primary btn-sm">Invite Member</button>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-surface-800 border-b border-white/8">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockUsers.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">{u.name.charAt(0)}</div>
                          <span className="text-slate-200 font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-brand-500/15 text-brand-400 border border-brand-500/20">
                          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-slate-400 hover:text-slate-200 transition-colors">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-5">Notification Preferences</h3>
              <div className="space-y-3 max-w-lg">
                {[
                  { label: 'Critical risk created', sublabel: 'Notify when a critical severity risk is added', checked: true },
                  { label: 'Compliance gap detected', sublabel: 'Alert when a new compliance gap is identified', checked: true },
                  { label: 'Action plan overdue', sublabel: 'Reminder when an action plan passes its due date', checked: true },
                  { label: 'Evidence requested', sublabel: 'Notify when evidence is requested for an audit', checked: true },
                  { label: 'Policy review due', sublabel: 'Reminder 30 days before policy review deadline', checked: false },
                  { label: 'Weekly digest', sublabel: 'Summary of all activity every Monday', checked: false },
                  { label: 'Report generated', sublabel: 'Notify when a scheduled report is ready', checked: true },
                ].map((n) => (
                  <label key={n.label} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-white/4 cursor-pointer">
                    <div>
                      <p className="text-sm text-slate-200">{n.label}</p>
                      <p className="text-xs text-slate-500">{n.sublabel}</p>
                    </div>
                    <input type="checkbox" className="accent-brand-500 w-4 h-4" defaultChecked={n.checked} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
                <h3 className="text-sm font-semibold text-slate-200 mb-4">Password</h3>
                <div className="space-y-3 max-w-md">
                  <div><label className="label">Current Password</label><input type="password" className="input" placeholder="••••••••" /></div>
                  <div><label className="label">New Password</label><input type="password" className="input" placeholder="••••••••" /></div>
                  <div><label className="label">Confirm New Password</label><input type="password" className="input" placeholder="••••••••" /></div>
                </div>
                <button className="btn btn-primary btn-sm mt-4">Update Password</button>
              </div>
              <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Multi-Factor Authentication</h3>
                <p className="text-xs text-slate-400 mb-4">Add an extra layer of security to your account.</p>
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs text-emerald-400 font-medium">MFA is enabled on your account</span>
                </div>
                <button className="btn btn-secondary btn-sm">Manage MFA devices</button>
              </div>
              <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Active Sessions</h3>
                <div className="space-y-2 text-xs">
                  {[
                    { device: 'Chrome on macOS', location: 'Paris, France', current: true, last: 'Active now' },
                    { device: 'Safari on iPhone 15', location: 'Paris, France', current: false, last: '2 hours ago' },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/4 rounded-lg">
                      <div>
                        <p className="text-slate-200 font-medium">{s.device} {s.current && <span className="text-emerald-400">(Current)</span>}</p>
                        <p className="text-slate-500">{s.location} · {s.last}</p>
                      </div>
                      {!s.current && <button className="text-red-400 hover:text-red-300 transition-colors">Revoke</button>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-2">API Keys</h3>
              <p className="text-xs text-slate-400 mb-5">Use API keys to programmatically access CGEF Platform data.</p>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-400">API access is available on Enterprise plans. Contact your account manager to enable.</p>
              </div>
              <button className="btn btn-secondary btn-sm opacity-50 cursor-not-allowed">Generate API Key</button>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-5">Billing & Subscription</h3>
              <div className="bg-gradient-to-r from-brand-900/50 to-surface-800 border border-brand-500/20 rounded-xl p-5 mb-5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-brand-400 font-semibold uppercase tracking-wide">Enterprise Plan</span>
                    <p className="text-xl font-bold text-slate-100 mt-1">€2,400<span className="text-sm font-normal text-slate-400">/month</span></p>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-md text-xs font-medium">Active</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                  <div className="text-center"><p className="text-slate-100 font-bold">Unlimited</p><p className="text-slate-500">Users</p></div>
                  <div className="text-center"><p className="text-slate-100 font-bold">7</p><p className="text-slate-500">Frameworks</p></div>
                  <div className="text-center"><p className="text-slate-100 font-bold">API</p><p className="text-slate-500">Access</p></div>
                </div>
              </div>
              <p className="text-xs text-slate-500">Next billing date: June 1, 2026 · Payment method: •••• 4242</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
