import { useState } from 'react';
import { Server, Plus, Search, TriangleAlert as AlertTriangle } from 'lucide-react';
import { mockAssets, mockThirdParties } from '../lib/mock-data';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';

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

export function AssetsThirdParties() {
  const [activeTab, setActiveTab] = useState<'assets' | 'vendors'>('assets');
  const [search, setSearch] = useState('');

  const criticalAssets = mockAssets.filter((a) => a.criticality === 'critical').length;
  const highRiskVendors = mockThirdParties.filter((t) => t.riskScore >= 60).length;
  const flaggedVendors = mockThirdParties.filter((t) => t.status === 'flagged').length;
  const pendingDPA = mockThirdParties.filter((t) => t.dpaStatus === 'pending').length;

  return (
    <div className="page-container">
      <PageHeader
        title="Assets & Third Parties"
        subtitle="Critical asset inventory and third-party risk management"
        breadcrumb={[{ label: 'Assets' }, { label: 'Assets & Third Parties' }]}
        actions={
          <button className="btn btn-primary btn-sm">
            <Plus className="w-3.5 h-3.5" />
            {activeTab === 'assets' ? 'Add Asset' : 'Add Vendor'}
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Critical Assets" value={criticalAssets} sublabel="requiring protection" icon={<Server className="w-4 h-4 text-red-400" />} iconBg="bg-red-500/15" variant="danger" />
        <MetricCard label="Total Assets" value={mockAssets.length} sublabel="in inventory" icon={<Server className="w-4 h-4 text-brand-400" />} iconBg="bg-brand-500/15" />
        <MetricCard label="High-Risk Vendors" value={highRiskVendors} sublabel="score ≥ 60" icon={<AlertTriangle className="w-4 h-4 text-orange-400" />} iconBg="bg-orange-500/15" variant="warning" />
        <MetricCard label="Pending DPA" value={pendingDPA} sublabel="contracts to sign" icon={<AlertTriangle className="w-4 h-4 text-amber-400" />} iconBg="bg-amber-500/15" />
      </div>

      <div className="flex border-b border-white/8 mb-5 gap-1">
        {[{ key: 'assets', label: 'Asset Inventory' }, { key: 'vendors', label: 'Third-Party Vendors' }].map((t) => (
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

      {activeTab === 'assets' && (
        <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
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
              {mockAssets.filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase())).map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-200">{a.name}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{a.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${criticalityColors[a.criticality]}`}>
                      {a.criticality.charAt(0).toUpperCase() + a.criticality.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{a.classification}</td>
                  <td className="px-4 py-3"><RiskScore score={a.riskScore} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{a.owner.split(' ')[0]}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-400">{new Date(a.lastReview).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="space-y-3">
          {/* Flagged vendors alert */}
          {flaggedVendors > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>{flaggedVendors} vendor(s) flagged</strong> for security review — Infotel requires immediate assessment before contract renewal.</span>
            </div>
          )}
          <div className="bg-surface-850 rounded-xl border border-white/8 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-800 border-b border-white/8">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Vendor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Tier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Risk Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">DPA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Last Assessment</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide hidden xl:table-cell">Annual Spend</th>
                </tr>
              </thead>
              <tbody>
                {mockThirdParties.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase())).map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">
                          {t.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-200">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-400">{t.category}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${t.tier === 1 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                        Tier {t.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3"><RiskScore score={t.riskScore} /></td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status === 'approved' ? 'compliant' : t.status === 'under_review' ? 'partial' : 'gap'} size="sm" />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${t.dpaStatus === 'signed' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {t.dpaStatus === 'signed' ? 'Signed' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400">{new Date(t.lastAssessment).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-slate-400">€{(t.spend / 1000).toFixed(0)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
