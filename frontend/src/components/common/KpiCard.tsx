import React, { ReactNode } from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  icon,
  trend,
  onClick,
  className = ''
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-container-lowest border border-outline-variant/80 rounded-lg p-space-lg flex flex-col justify-between transition-all ${
        onClick ? 'cursor-pointer hover:border-secondary hover:shadow-sm' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-space-sm mb-space-sm">
        <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-semibold">
          {label}
        </span>
        <div className="p-1.5 rounded-md bg-surface-container-low text-secondary flex-shrink-0">
          {icon}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-space-xs mt-1">
        <span className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight">
          {value}
        </span>
        {trend && (
          <span
            className={`font-code-sm text-code-sm font-semibold px-1.5 py-0.5 rounded ${
              trend.isPositive ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-space-xs font-body-sm text-body-sm text-on-surface-variant">
          {subtext}
        </p>
      )}
    </div>
  );
};
