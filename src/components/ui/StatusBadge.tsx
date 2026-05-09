interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

const statusMap: Record<string, { label: string; className: string }> = {
  // Risk statuses
  open: { label: 'Open', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  mitigating: { label: 'Mitigating', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  accepted: { label: 'Accepted', className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' },
  closed: { label: 'Closed', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  // Compliance statuses
  compliant: { label: 'Compliant', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  partial: { label: 'Partial', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  gap: { label: 'Gap', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  na: { label: 'N/A', className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' },
  // Action plan statuses
  todo: { label: 'To Do', className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' },
  in_progress: { label: 'In Progress', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  blocked: { label: 'Blocked', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  done: { label: 'Done', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  // Policy statuses
  draft: { label: 'Draft', className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' },
  under_review: { label: 'Under Review', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  approved: { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  expired: { label: 'Expired', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  // Evidence statuses
  requested: { label: 'Requested', className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' },
  provided: { label: 'Provided', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  reviewed: { label: 'Reviewed', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  rejected: { label: 'Rejected', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  // Third-party
  approved_vendor: { label: 'Approved', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  under_review_vendor: { label: 'Under Review', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  flagged: { label: 'Flagged', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  // Incident
  investigating: { label: 'Investigating', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  resolved: { label: 'Resolved', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  remediated: { label: 'Remediated', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  // Control
  implemented: { label: 'Implemented', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  not_implemented: { label: 'Not Implemented', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  // Project
  planning: { label: 'Planning', className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' },
  active: { label: 'Active', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  // Generic
  high: { label: 'High', className: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  medium: { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  low: { label: 'Low', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
  critical: { label: 'Critical', className: 'bg-red-500/20 text-red-300 border border-red-500/30 font-semibold' },
};

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusMap[status] ?? { label: status, className: 'bg-slate-500/15 text-slate-400 border border-slate-500/20' };
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center rounded-md font-medium ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  );
}

export function RiskBadge({ severity }: { severity: string }) {
  const config: Record<string, { label: string; className: string; dot: string }> = {
    critical: { label: 'Critical', className: 'bg-red-500/15 text-red-300 border border-red-500/30', dot: 'bg-red-400' },
    high: { label: 'High', className: 'bg-orange-500/15 text-orange-400 border border-orange-500/20', dot: 'bg-orange-400' },
    medium: { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20', dot: 'bg-amber-400' },
    low: { label: 'Low', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20', dot: 'bg-emerald-400' },
  };
  const c = config[severity] ?? config.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold ${c.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

export function FrameworkBadge({ framework }: { framework: string }) {
  const colors: Record<string, string> = {
    'ISO 27001': 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    'NIS2': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    'DORA': 'bg-violet-500/15 text-violet-400 border-violet-500/20',
    'RGPD': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    'NIST CSF': 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    'CIS Controls': 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    'SOC 2': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
    'PCI-DSS': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colors[framework] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/20'}`}>
      {framework}
    </span>
  );
}
