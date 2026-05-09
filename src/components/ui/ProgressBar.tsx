interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  label?: string;
  className?: string;
}

function getProgressColor(value: number): string {
  if (value >= 80) return '#22c55e';
  if (value >= 60) return '#3b82f6';
  if (value >= 40) return '#eab308';
  return '#ef4444';
}

export function ProgressBar({ value, max = 100, color, size = 'sm', showLabel, label, className = '' }: ProgressBarProps) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = color ?? getProgressColor(pct);
  const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2' };

  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showLabel && <span className="text-xs font-medium text-slate-300">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className={`w-full bg-white/8 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

interface MaturityBarProps {
  score: number;
  target?: number;
  domain: string;
  compact?: boolean;
}

export function MaturityBar({ score, target, domain, compact }: MaturityBarProps) {
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#3b82f6', '#22c55e'];
  const color = colors[Math.round(score)] ?? '#3b82f6';

  return (
    <div className={compact ? 'flex items-center gap-3' : ''}>
      {!compact && <div className="flex justify-between items-center mb-1.5">
        <span className="text-sm text-slate-300">{domain}</span>
        <div className="flex items-center gap-2">
          {target && <span className="text-xs text-slate-500">Target: {target}</span>}
          <span className="text-sm font-semibold" style={{ color }}>{score.toFixed(1)}</span>
        </div>
      </div>}
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className="flex-1 h-2 rounded-sm transition-all duration-300"
            style={{
              backgroundColor: level <= score ? color : 'rgba(255,255,255,0.08)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
