import { useState } from 'react';
import { Server, Plus, Search, TriangleAlert as AlertTriangle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Field, SubmitButton, DeleteButton, LoadingState, useAction } from '../components/ui/Form';
import { useOrgTable } from '../hooks/useOrgTable';
import type { Asset, ThirdParty } from '../lib/db-types';
import { fmtDate, fmtMoney, firstName, capitalize } from '../lib/format';

function RiskScore({ score }: { score: number }) {
  const color = score >= 70 ? '#ef4444' : score >= 50 ? '#f97316' : score >= 30 ? '#eab308' : '#22c55e';
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold" style={{ color }}>{score}</span>
    </div>
  );
}

const criticalityColors: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-300 border-red-500/20',
  high: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

const ASSET_TYPES = ['Application', 'Data Store', 'Infrastructure', 'Cloud Platform', 'SaaS', 'Endpoint', 'Network', 'OT / ICS'];
const CLASSIFICATIONS = ['Public', 'Internal', 'Confidential', 'Restricted'];
const VENDOR_CATEGORIES = ['Cloud Infrastructure', 'IT Services', 'SaaS', 'Managed Security', 'Audit & Consulting', 'IT Development', 'Financial Network', 'Telecom'];

const emptyAsset: Partial<Asset> = { name: '', type: ASSET_TYPES[0], criticality: 'medium', classification: 'Internal', owner: '', description: '', risk_score: 0, last_review: null };
const emptyVendor: Partial<ThirdParty> = { name: '', category: VENDOR_CATEGORIES[0], tier: 2, risk_score: 0, status: 'under_review', dpa_status: 'pending', contact: '', annual_spend: null, last_assessment: null, next_assessment: null };

export function AssetsThirdParties() {
  const assets = useOrgTable<Asset>('assets', { orderBy: 'ref', ascending: true });
  const vendors = useOrgTable<ThirdParty>('third_parties', { orderBy: 'name', ascending: true });
  const [activeTab, setActiveTab] = useState<'assets' | 'vendors'>('assets');
  const [search, setSearch] = useState('');
  const [assetForm, setAssetForm] = useState<Partial<Asset> | null>(null);
  const [vendorForm, setVendorForm] = useState<Partial<ThirdParty> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { pending, run } = useAction();

  const q = search.toLowerCase();
  const criticalAssets = assets.rows.filter((a) => a.criticality === 'critical').length;
  const highRiskVendors = vendors.rows.filter((t) => t.risk_score >= 60).length;
  const flagged = vendors.rows.filter((t) => t.status === 'flagged');
  const pendingDPA = vendors.rows.filter((t) => t.dpa_status === 'pending').length;

  const setA = <K extends keyof Asset>(k: K, v: Asset[K]) => setAssetForm((f) => ({ ...f, [k]: v }));
  const setV = <K extends keyof ThirdParty>(k: K, v: ThirdParty[K]) => setVendorForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditingId(null);
    if (activeTab === 'assets') setAssetForm(emptyAsset); else setVendorForm(emptyVendor);
  };

  const saveAsset = () => run(async () => {
    if (!assetForm?.name?.trim()) throw new Error('Asset name is required');
    if (editingId) await assets.update(editingId, assetForm); else await assets.create(assetForm);
    setAssetForm(null);
  }, editingId ? 'Asset updated' : 'Asset added');

  const saveVendor = () => run(async () => {
    if (!vendorForm?.name?.trim()) throw new Error('Vendor name is required');
    if (editingId) await vendors.update(editingId, vendorForm); else await vendors.create(vendorForm);
    setVendorForm(null);
  }, editingId ? 'Vendor updated' : 'Vendor added');

  const loading = activeTab === 'assets' ? assets.loading : vendors.loading;

  return (
    <div className="page-container">
      <PageHeader
        title="Assets & Third Parties"
        subtitle="Critical asset inventory and third-party risk management"
        breadcrumb={[{ label: 'Assets' }, { label: 'Assets & Third Parties' }]}
        actions={
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            {activeTab === 'assets' ? 'Add Asset' : 'Add Vendor'}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Critical Assets" value={criticalAssets} sublabel="requiring protection" icon={<Server className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
        <MetricCard label="Total Assets" value={assets.rows.length} sublabel="in inventory" icon={<Server className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="High-Risk Vendors" value={highRiskVendors} sublabel="score ≥ 60" icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} iconBg="bg-orange-500/15" variant="warning" />
        <MetricCard label="Pending DPA" value={pendingDPA} sublabel="contracts to sign" icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" />
      </div>

      <div className="flex border-b border-white/8 mb-5 gap-1">
        {[{ key: 'assets', label: `Asset Inventory (${assets.rows.length})` }, { key: 'vendors', label: `Third-Party Vendors (${vendors.rows.length})` }].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === t.key ? 'text-brand-400 border-brand-400' : 'text-slate-400 border-transparent hover:text-slate-200'}`}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1 flex justify-end items-center pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input className="input pl-9 h-8 text-sm w-48" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {loading && <LoadingState />}

      {!loading && activeTab === 'assets' && (
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-800 border-b border-white/8">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Asset</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Criticality</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Classification</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Risk Score</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Owner</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">Last Review</th>
              </tr>
            </thead>
            <tbody>
              {assets.rows.filter((a) => !q || a.name.toLowerCase().includes(q) || a.ref.toLowerCase().includes(q)).map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => { setEditingId(a.id); setAssetForm(a); }}>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.ref}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{a.name}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{a.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${criticalityColors[a.criticality]}`}>{capitalize(a.criticality)}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{a.classification}</td>
                  <td className="px-4 py-3"><RiskScore score={a.risk_score} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{firstName(a.owner)}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-400">{fmtDate(a.last_review)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {assets.rows.length === 0 && <div className="text-center py-12 text-slate-500 text-sm">No assets yet. Add your critical applications, data stores and infrastructure.</div>}
        </div>
      )}

      {!loading && activeTab === 'vendors' && (
        <div className="space-y-3">
          {flagged.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{flagged.length} vendor(s) flagged</strong> for security review — {flagged.map((v) => v.name).join(', ')}.</span>
            </div>
          )}
          <div className="bg-surface-850 rounded-xl border border-white/8 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-800 border-b border-white/8">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Risk Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">DPA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Next Assessment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">Annual Spend</th>
                </tr>
              </thead>
              <tbody>
                {vendors.rows.filter((t) => !q || t.name.toLowerCase().includes(q)).map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => { setEditingId(t.id); setVendorForm(t); }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">{t.name.charAt(0)}</div>
                        <span className="font-medium text-slate-200">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{t.category}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${t.tier === 1 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>Tier {t.tier}</span>
                    </td>
                    <td className="px-4 py-3"><RiskScore score={t.risk_score} /></td>
                    <td className="px-4 py-3"><StatusBadge status={t.status === 'approved' ? 'approved_vendor' : t.status === 'under_review' ? 'under_review_vendor' : 'flagged'} size="sm" /></td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${t.dpa_status === 'signed' ? 'text-emerald-400' : t.dpa_status === 'pending' ? 'text-amber-400' : 'text-slate-500'}`}>
                        {t.dpa_status === 'signed' ? 'Signed' : t.dpa_status === 'pending' ? 'Pending' : 'Not required'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{fmtDate(t.next_assessment)}</td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-400">{fmtMoney(t.annual_spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vendors.rows.length === 0 && <div className="text-center py-12 text-slate-500 text-sm">No vendors yet. Add your ICT third parties (DORA requires a register of information).</div>}
          </div>
        </div>
      )}

      <Modal open={!!assetForm} onClose={() => setAssetForm(null)} title={editingId ? `Edit Asset ${assetForm?.ref ?? ''}` : 'Add Asset'} size="lg"
        actions={<>
          {editingId && <DeleteButton onConfirm={async () => { await assets.remove(editingId); setAssetForm(null); }} />}
          <button className="btn btn-outline btn-sm" onClick={() => setAssetForm(null)}>Cancel</button>
          <SubmitButton pending={pending} onClick={saveAsset}>{editingId ? 'Save Changes' : 'Add Asset'}</SubmitButton>
        </>}
      >
        {assetForm && (
          <div className="space-y-4">
            <Field label="Asset Name"><input className="input" placeholder="e.g., Core Banking Platform" value={assetForm.name ?? ''} onChange={(e) => setA('name', e.target.value)} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Type"><select className="select" value={assetForm.type ?? ''} onChange={(e) => setA('type', e.target.value)}>{ASSET_TYPES.map(t => <option key={t}>{t}</option>)}</select></Field>
              <Field label="Criticality"><select className="select" value={assetForm.criticality} onChange={(e) => setA('criticality', e.target.value as Asset['criticality'])}>{['critical', 'high', 'medium', 'low'].map(c => <option key={c} value={c}>{capitalize(c)}</option>)}</select></Field>
              <Field label="Classification"><select className="select" value={assetForm.classification ?? ''} onChange={(e) => setA('classification', e.target.value)}>{CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Owner"><input className="input" value={assetForm.owner ?? ''} onChange={(e) => setA('owner', e.target.value)} /></Field>
              <Field label="Risk Score (0–100)"><input type="number" min={0} max={100} className="input" value={assetForm.risk_score ?? 0} onChange={(e) => setA('risk_score', Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /></Field>
              <Field label="Last Review"><input type="date" className="input" value={assetForm.last_review ?? ''} onChange={(e) => setA('last_review', e.target.value || null)} /></Field>
            </div>
            <Field label="Description / Dependencies"><textarea className="input resize-none" rows={3} value={assetForm.description ?? ''} onChange={(e) => setA('description', e.target.value)} /></Field>
          </div>
        )}
      </Modal>

      <Modal open={!!vendorForm} onClose={() => setVendorForm(null)} title={editingId ? 'Edit Vendor' : 'Add Vendor'} size="lg"
        actions={<>
          {editingId && <DeleteButton onConfirm={async () => { await vendors.remove(editingId); setVendorForm(null); }} />}
          <button className="btn btn-outline btn-sm" onClick={() => setVendorForm(null)}>Cancel</button>
          <SubmitButton pending={pending} onClick={saveVendor}>{editingId ? 'Save Changes' : 'Add Vendor'}</SubmitButton>
        </>}
      >
        {vendorForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Vendor Name"><input className="input" value={vendorForm.name ?? ''} onChange={(e) => setV('name', e.target.value)} /></Field>
              <Field label="Category"><select className="select" value={vendorForm.category ?? ''} onChange={(e) => setV('category', e.target.value)}>{VENDOR_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tier"><select className="select" value={vendorForm.tier} onChange={(e) => setV('tier', Number(e.target.value))}><option value={1}>Tier 1 (critical)</option><option value={2}>Tier 2</option><option value={3}>Tier 3</option></select></Field>
              <Field label="Risk Score (0–100)"><input type="number" min={0} max={100} className="input" value={vendorForm.risk_score ?? 0} onChange={(e) => setV('risk_score', Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /></Field>
              <Field label="Annual Spend (€)"><input type="number" min={0} className="input" value={vendorForm.annual_spend ?? ''} onChange={(e) => setV('annual_spend', e.target.value === '' ? null : Number(e.target.value))} /></Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Status"><select className="select" value={vendorForm.status} onChange={(e) => setV('status', e.target.value as ThirdParty['status'])}><option value="approved">Approved</option><option value="under_review">Under Review</option><option value="flagged">Flagged</option></select></Field>
              <Field label="DPA"><select className="select" value={vendorForm.dpa_status} onChange={(e) => setV('dpa_status', e.target.value as ThirdParty['dpa_status'])}><option value="signed">Signed</option><option value="pending">Pending</option><option value="not_required">Not required</option></select></Field>
              <Field label="Contact"><input className="input" value={vendorForm.contact ?? ''} onChange={(e) => setV('contact', e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Last Assessment"><input type="date" className="input" value={vendorForm.last_assessment ?? ''} onChange={(e) => setV('last_assessment', e.target.value || null)} /></Field>
              <Field label="Next Assessment"><input type="date" className="input" value={vendorForm.next_assessment ?? ''} onChange={(e) => setV('next_assessment', e.target.value || null)} /></Field>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
