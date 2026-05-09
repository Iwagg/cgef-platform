import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  icon?: ReactNode;
  iconBg?: string;
  sublabel?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  onClick?: () => void;
}

export function MetricCard({
  label,
  value,
  unit,
  trend,
  trendLabel,
  icon,
  iconBg = 'bg-brand-500/15',
  sublabel,
  variant = 'default',
  onClick,
}: MetricCardProps) {
  const variantBorder = {
    default: 'border-white/8',
    danger: 'border-red-500/20',
    warning: 'border-amber-500/20',
    success: 'border-emerald-500/20',
  }[variant];

  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;
  const trendNeutral = trend === undefined || trend === 0;

  const trendColor = trendPositive
    ? 'text-emerald-400'
    : trendNegative
    ? 'text-red-400'
    : 'text-slate-500';

  return (
    <div
      className={`bg-surface-850 rounded-xl border ${variantBorder} p-5 transition-all duration-200 ${onClick ? 'cursor-pointer hover:border-white/15 hover:bg-surface-800' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide leading-tight">{label}</p>
        {icon && (
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-slate-100 leading-none">{value}</span>
        {unit && <span className="text-sm text-slate-400 mb-0.5">{unit}</span>}
      </div>
      {(trend !== undefined || sublabel) && (
        <div className="mt-2 flex items-center gap-1.5">
          {trend !== undefined && (
            <>
              {trendPositive && <TrendingUp className={`w-3.5 h-3.5 ${trendColor}`} />}
              {trendNegative && <TrendingDown className={`w-3.5 h-3.5 ${trendColor}`} />}
              {trendNeutral && <Minus className={`w-3.5 h-3.5 ${trendColor}`} />}
              <span className={`text-xs font-medium ${trendColor}`}>
                {trend > 0 ? '+' : ''}{trend}
              </span>
            </>
          )}
          {trendLabel && (
            <span className="text-xs text-slate-500">{trendLabel}</span>
          )}
          {sublabel && !trendLabel && (
            <span className="text-xs text-slate-500">{sublabel}</span>
          )}
        </div>
      )}
    </div>
  );
}

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export function ScoreRing({
  score,
  maxScore = 100,
  size = 80,
  strokeWidth = 6,
  label,
  sublabel,
  color = '#3b82f6',
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score / maxScore, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        {label && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-sm font-bold text-slate-100">{label}</span>
            {sublabel && <span className="text-xs text-slate-500">{sublabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
