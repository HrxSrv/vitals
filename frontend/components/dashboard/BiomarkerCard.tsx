'use client';

import { cn } from '@/lib/utils/cn';
import { TREND_ICON, STATUS_LABEL } from '@/lib/utils/constants';
import type { BiomarkerWithStatus } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  normal:     'bg-primary-50   text-primary-700   border-primary-200',
  borderline: 'bg-warning-50   text-yellow-700    border-yellow-200',
  high:       'bg-accent-50    text-accent-600    border-accent-200',
  low:        'bg-accent-50    text-accent-600    border-accent-200',
};

const TREND_COLOR: Record<string, string> = {
  improving: 'text-primary-600',
  worsening: 'text-accent-500',
  stable:    'text-muted-foreground',
  new:       'text-primary-400',
};

interface BiomarkerCardProps {
  item: BiomarkerWithStatus;
  className?: string;
}

export function BiomarkerCard({ item, className }: BiomarkerCardProps) {
  const { biomarker, definition, status, trend } = item;

  return (
    <div className={cn(
      'bg-white rounded-2xl p-4 shadow-card card-press flex flex-col gap-2',
      className
    )}>
      {/* Status badge */}
      <div className="flex items-center justify-between">
        <span className={cn('status-badge border', STATUS_STYLES[status])}>
          {STATUS_LABEL[status] ?? status}
        </span>
        {trend && (
          <span className={cn('text-lg font-bold leading-none', TREND_COLOR[trend])}>
            {TREND_ICON[trend]}
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-bold text-foreground leading-none">
          {biomarker.value}
          <span className="text-sm font-medium text-muted-foreground ml-1">{biomarker.unit}</span>
        </p>
        {definition && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Ref: {definition.refRangeLow}–{definition.refRangeHigh} {definition.unit}
          </p>
        )}
      </div>

      {/* Name */}
      <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">
        {definition?.displayName ?? biomarker.name}
      </p>
    </div>
  );
}
