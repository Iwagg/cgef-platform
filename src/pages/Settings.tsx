import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { User, Building2, Bell, Shield, Save, Users, Copy, UserMinus } from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { PageHeader } from '../components/ui/PageHeader';
import { toast } from '../components/ui/Toast';
import { Field, SubmitButton, LoadingState, useAction } from '../components/ui/Form';
import { useOrgTable } from '../hooks/useOrgTable';
import { supabase } from '../lib/supabase';
import { hasRole } from '../lib/rbac';
import { SECTORS, COUNTRIES, ORG_SIZES } from '../lib/constants';
import { ALERT_CATEGORIES, isCategoryEnabled } from '../lib/notifications';
import { FRAMEWORKS, type OrgFramework, type OrgMember } from '../lib/db-types';
import type { UserRole } from '../lib/types';

const tabs = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'organisation', label: 'Organisation', icon: Building2 },
  { key: 'team', label: 'Team & Roles', icon: Users },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
];

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'analyst', label: 'Analyst', description: 'Create and edit records, run assessments' },
  { value: 'manager', label: 'Manager', description: '+ delete records, approve policies & evidence, export reports' },
  { value: 'ciso', label: 'CISO', description: '+ manage organisation settings, team roles and audit logs' },
  { value: 'admin', label: 'Admin', description: 'Full control, including removing members' },
];

function ProfileTab() {
  const { user, profile, updateProfile } = useAuthStore();
  const [name, setName] = useState(profile?.full_name ?? '');
  const { pending, run } = useAction();
  return (
    <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-5">Profile Information</h3>
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-xl bg-brand-500/20 flex items-center justify-center text-2xl font-bold text-brand-400">{(profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()}</div>
        <div>
          <p className="text-sm font-semibold text-slate-200">{profile?.full_name || 'User'}</p>
          <p className="text-xs text-slate-400 capitalize">{profile?.role}</p>
        </div>
      </div>
      <div className="space-y-4 max-w-md">
        <Field label="Full Name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Email Address"><input type="email" className="input opacity-60" value={user?.email ?? ''} disabled /></Field>
        <Field label="Role"><input className="input opacity-60 capitalize" value={profile?.role ?? ''} disabled /><p className="text-xs text-slate-500 mt-1">Roles are assigned by your CISO or administrator.</p></Field>
      </div>
      <div className="mt-5 pt-4 border-t border-white/8">
        <SubmitButton pending={pending} onClick={() => run(async () => {
          if (!name.trim()) throw new Error('Name cannot be empty');
          await updateProfile({ full_name: name.trim() });
        }, 'Profile saved')}><Save className="w-3.5 h-3.5" /> Save Changes</SubmitButton>
      </div>
    </div>
  );
}

function OrganisationTab() {
  const { profile, organization, updateOrganization } = useAuthStore();
  const frameworks = useOrgTable<OrgFramework>('org_frameworks', { orderBy: 'framework', ascending: true });
  const [form, setForm] = useState({ name: organization?.name ?? '', sector: organization?.sector ?? '', country: organization?.country ?? 'FR', size: organization?.size ?? '' });
  const { pending, run } = useAction();
  const canEdit = hasRole(profile?.role, 'ciso');

  const toggleFramework = (name: string) => run(async () => {
    const existing = frameworks.rows.find((f) => f.framework === name);
    if (existing) await frameworks.update(existing.id, { is_active: !existing.is_active });
    else await frameworks.create({ framework: name, is_active: true });
  });

  const copyId = () => { navigator.clipboard.writeText(organization?.id ?? ''); toast({ type: 'success', title: 'Organisation ID copied' }); };

  return (
    <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-5">Organisation Settings</h3>
      <div className="mb-5 p-3 bg-white/4 border border-white/8 rounded-lg max-w-md">
        <p className="text-xs text-slate-500 mb-1">Organisation ID (share it with colleagues so they can join)</p>
        <div className="flex items-center gap-2">
          <code className="text-xs text-slate-200 break-all flex-1">{organization?.id}</code>
          <button className="btn btn-outline btn-sm" onClick={copyId}><Copy className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <fieldset disabled={!canEdit} className="space-y-4 max-w-md">
        <Field label="Organisation Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Sector"><select className="select" value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}><option value="">—</option>{SECTORS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country"><select className="select" value={form.country ?? ''} onChange={(e) => setForm({ ...form, country: e.target.value })}>{COUNTRIES.filter((c) => c.code.length === 2).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</select></Field>
          <Field label="Organisation Size"><select className="select" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}><option value="">—</option>{ORG_SIZES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        </div>
      </fieldset>
      {canEdit ? (
        <div className="mt-5">
          <SubmitButton pending={pending} onClick={() => run(async () => {
            if (!form.name.trim()) throw new Error('Organisation name is required');
            await updateOrganization({ name: form.name.trim(), sector: form.sector || undefined, country: form.country, size: form.size || undefined });
          }, 'Organisation saved')}><Save className="w-3.5 h-3.5" /> Save Changes</SubmitButton>
        </div>
      ) : <p className="text-xs text-slate-500 mt-4">Only a CISO or administrator can edit organisation settings.</p>}

      <div className="mt-6 pt-5 border-t border-white/8">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Active Frameworks</h4>
        <p className="text-xs text-slate-500 mb-3">Frameworks shown in the Compliance Center and on the dashboard.</p>
        {frameworks.loading ? <LoadingState /> : (
          <div className="grid grid-cols-2 gap-2 max-w-md">
            {FRAMEWORKS.map((f) => {
              const active = frameworks.rows.find((r) => r.framework === f)?.is_active ?? false;
              return (
                <label key={f} className={`flex items-center gap-2 text-sm text-slate-300 p-2 rounded-lg hover:bg-white/4 ${canEdit ? 'cursor-pointer' : 'opacity-60'}`}>
                  <input type="checkbox" className="accent-brand-500" checked={active} disabled={!canEdit || pending} onChange={() => toggleFramework(f)} />
                  {f}
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamTab() {
  const { profile, organization } = useAuthStore();
  const [members, setMembers] = useState<OrgMember[] | null>(null);
  const { pending, run } = useAction();
  const canManage = hasRole(profile?.role, 'ciso');
  const isAdmin = hasRole(profile?.role, 'admin');

  const load = async () => {
    const { data, error } = await supabase.rpc('list_org_members');
    if (error) { toast({ type: 'error', title: 'Could not load team', message: error.message }); setMembers([]); return; }
    setMembers(data as OrgMember[]);
  };
  useEffect(() => { load(); }, []);

  const changeRole = (m: OrgMember, role: UserRole) => run(async () => {
    const { error } = await supabase.rpc('set_member_role', { p_profile_id: m.id, p_role: role });
    if (error) throw error;
    await load();
  }, 'Role updated');

  const removeMember = (m: OrgMember) => {
    if (!window.confirm(`Remove ${m.full_name || m.email} from the organisation?`)) return;
    run(async () => {
      const { error } = await supabase.rpc('remove_member', { p_profile_id: m.id });
      if (error) throw error;
      await load();
    }, 'Member removed');
  };

  return (
    <div className="space-y-4">
      <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Invite a colleague</h3>
        <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside">
          <li>Ask them to create an account on this platform (Register page).</li>
          <li>On the welcome screen they choose <span className="text-slate-200">Join an organisation</span> and paste this ID:</li>
        </ol>
        <div className="flex items-center gap-2 mt-3 max-w-lg">
          <code className="text-xs text-slate-200 bg-white/4 border border-white/8 rounded-lg px-3 py-2 break-all flex-1">{organization?.id}</code>
          <button className="btn btn-outline btn-sm" onClick={() => { navigator.clipboard.writeText(organization?.id ?? ''); toast({ type: 'success', title: 'Organisation ID copied' }); }}><Copy className="w-3.5 h-3.5" /> Copy</button>
        </div>
        <p className="text-xs text-slate-500 mt-2">New members join as Analyst; promote them below.</p>
      </div>

      <div className="bg-surface-850 rounded-xl border border-white/8 overflow-x-auto">
        <div className="px-5 py-4 border-b border-white/8"><h3 className="text-sm font-semibold text-slate-200">Team Members {members ? `(${members.length})` : ''}</h3></div>
        {!members ? <LoadingState /> : (
          <table className="w-full text-sm">
            <thead className="bg-surface-800 border-b border-white/8">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">MFA</th>
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.id === profile?.id;
                return (
                  <tr key={m.id} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">{(m.full_name || m.email).charAt(0).toUpperCase()}</div>
                        <span className="text-slate-200 font-medium">{m.full_name || '—'}{isSelf && <span className="text-xs text-slate-500"> (you)</span>}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{m.email}</td>
                    <td className="px-4 py-3">
                      {canManage && !isSelf ? (
                        <select className="select h-8 text-xs w-auto" value={m.role} disabled={pending} onChange={(e) => changeRole(m, e.target.value as UserRole)}>
                          {ROLES.filter((r) => isAdmin || r.value !== 'admin' || m.role === 'admin').map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-brand-500/15 text-brand-400 border border-brand-500/20 capitalize">{m.role}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">{m.mfa_enabled ? <span className="text-emerald-400">Enabled</span> : <span className="text-slate-500">Off</span>}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        {!isSelf && <button className="text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1" disabled={pending} onClick={() => removeMember(m)}><UserMinus className="w-3.5 h-3.5" /> Remove</button>}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Role permissions</h4>
        <div className="space-y-2">
          {ROLES.map((r) => <div key={r.value} className="flex gap-3 text-xs"><span className="w-16 text-slate-200 font-medium">{r.label}</span><span className="text-slate-400">{r.description}</span></div>)}
        </div>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { profile, updateProfile } = useAuthStore();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(profile?.notification_prefs ?? {});
  const { pending, run } = useAction();
  return (
    <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-1">Notification Preferences</h3>
      <p className="text-xs text-slate-500 mb-5">Choose which live alerts appear in the bell at the top of the screen.</p>
      <div className="space-y-3 max-w-lg">
        {ALERT_CATEGORIES.map((n) => (
          <label key={n.key} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-white/4 cursor-pointer">
            <div><p className="text-sm text-slate-200">{n.label}</p><p className="text-xs text-slate-500">{n.sublabel}</p></div>
            <input type="checkbox" className="accent-brand-500 w-4 h-4" checked={isCategoryEnabled(prefs, n.key)} onChange={(e) => setPrefs({ ...prefs, [n.key]: e.target.checked })} />
          </label>
        ))}
      </div>
      <div className="mt-5 pt-4 border-t border-white/8">
        <SubmitButton pending={pending} onClick={() => run(() => updateProfile({ notification_prefs: prefs }), 'Preferences saved')}><Save className="w-3.5 h-3.5" /> Save Preferences</SubmitButton>
      </div>
    </div>
  );
}

function SecurityTab() {
  const { profile, changePassword, enableMFA, verifyMFA } = useAuthStore();
  const [pwd, setPwd] = useState({ next: '', confirm: '' });
  const [mfa, setMfa] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const { pending, run } = useAction();

  const updatePassword = () => run(async () => {
    if (pwd.next.length < 8) throw new Error('Password must be at least 8 characters');
    if (pwd.next !== pwd.confirm) throw new Error('Passwords do not match');
    await changePassword(pwd.next);
    setPwd({ next: '', confirm: '' });
  }, 'Password updated');

  const startMfa = () => run(async () => {
    // Remove a previously unfinished enrolment so a new QR code can be issued
    const { data } = await supabase.auth.mfa.listFactors();
    for (const f of data?.all ?? []) if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    setMfa(await enableMFA());
  });

  const confirmMfa = () => run(async () => {
    if (!(await verifyMFA(code.trim()))) throw new Error('Invalid code, try again');
    setMfa(null);
    setCode('');
  }, 'MFA enabled');

  return (
    <div className="space-y-4">
      <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-4">Password</h3>
        <div className="space-y-3 max-w-md">
          <Field label="New Password"><input type="password" className="input" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} /></Field>
          <Field label="Confirm New Password"><input type="password" className="input" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} /></Field>
        </div>
        <div className="mt-4"><SubmitButton pending={pending} onClick={updatePassword}>Update Password</SubmitButton></div>
      </div>
      <div className="bg-surface-850 rounded-xl border border-white/8 p-5">
        <h3 className="text-sm font-semibold text-slate-200 mb-2">Multi-Factor Authentication</h3>
        <p className="text-xs text-slate-400 mb-4">Protect your account with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).</p>
        {profile?.mfa_enabled ? (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-xs text-emerald-400 font-medium">MFA is enabled on your account</span>
          </div>
        ) : mfa ? (
          <div className="space-y-3 max-w-md">
            <p className="text-xs text-slate-300">1. Scan this QR code with your authenticator app:</p>
            <img src={mfa.qr} alt="MFA QR code" className="w-44 h-44 bg-white rounded-lg p-2" />
            <p className="text-xs text-slate-500">Or enter this secret manually: <code className="text-slate-300 break-all">{mfa.secret}</code></p>
            <Field label="2. Enter the 6-digit code"><input className="input w-40 tracking-widest" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /></Field>
            <div className="flex gap-2"><SubmitButton pending={pending} onClick={confirmMfa} disabled={code.length !== 6}>Verify & Enable</SubmitButton><button className="btn btn-outline btn-sm" onClick={() => setMfa(null)}>Cancel</button></div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4"><div className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-xs text-amber-400 font-medium">MFA is not enabled</span></div>
            <SubmitButton pending={pending} variant="btn-secondary" onClick={startMfa}>Enable MFA</SubmitButton>
          </>
        )}
      </div>
    </div>
  );
}

export function Settings() {
  const [params, setParams] = useSearchParams();
  const activeTab = tabs.some((t) => t.key === params.get('tab')) ? params.get('tab')! : 'profile';

  return (
    <div className="page-container">
      <PageHeader title="Settings" subtitle="Manage your account, organisation, and platform preferences" />
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-48 flex-shrink-0">
          <nav className="flex md:flex-col gap-0.5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setParams({ tab: tab.key })}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-brand-500/15 text-slate-100 border border-brand-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/6'}`}
              >
                <tab.icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="flex-1 min-w-0 space-y-5">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'organisation' && <OrganisationTab />}
          {activeTab === 'team' && <TeamTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'security' && <SecurityTab />}
        </div>
      </div>
    </div>
  );
}
