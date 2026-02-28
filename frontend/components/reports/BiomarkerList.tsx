'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { BIOMARKER_CATEGORY_ORDER, STATUS_LABEL, TREND_ICON } from '@/lib/utils/constants';
import type { BiomarkerWithStatus } from '@/lib/types';

const STATUS_STYLES: Record<string, string> = {
  normal:     'text-primary-600 bg-primary-50',
  borderline: 'text-yellow-700  bg-yellow-50',
  high:       'text-accent-600  bg-accent-50',
  low:        'text-accent-600  bg-accent-50',
};

const TREND_COLOR: Record<string, string> = {
  improving: 'text-primary-600',
  worsening: 'text-accent-500',
  stable:    'text-muted-foreground',
  new:       'text-primary-400',
};

interface BiomarkerListProps {
  biomarkers: BiomarkerWithStatus[];
}

export function BiomarkerList({ biomarkers }: BiomarkerListProps) {
  // Group by category
  const grouped = biomarkers.reduce<Record<string, BiomarkerWithStatus[]>>((acc, item) => {
    const cat = item.definition?.category ?? item.biomarker.category ?? 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const sortedCategories = [
    ...BIOMARKER_CATEGORY_ORDER.filter((c) => grouped[c]),
    ...Object.keys(grouped).filter((c) => !BIOMARKER_CATEGORY_ORDER.includes(c)),
  ];

  return (
    <div className="space-y-3 px-4">
      {sortedCategories.map((category) => (
        <CategorySection
          key={category}
          category={category}
          items={grouped[category]}
        />
      ))}
    </div>
  );
}

function CategorySection({ category, items }: { category: string; items: BiomarkerWithStatus[] }) {
  const [open, setOpen] = useState(true);
  const abnormal = items.filter((i) => i.status !== 'normal').length;

  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-foreground">{category}</span>
          {abnormal > 0 && (
            <span className="text-[10px] font-bold bg-accent-50 text-accent-600 px-2 py-0.5 rounded-full">
              {abnormal} flagged
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{items.length} markers</span>
          <ChevronDown
            size={16}
            className={cn('text-muted-foreground transition-transform duration-200', open && 'rotate-180')}
          />
        </div>
      </button>

      {open && (
        <div className="border-t border-border">
          {items.map((item, i) => (
            <BiomarkerRow
              key={item.biomarker.id}
              item={item}
              isLast={i === items.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BiomarkerRow({ item, isLast }: { item: BiomarkerWithStatus; isLast: boolean }) {
  const { biomarker, definition, status, trend } = item;

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', !isLast && 'border-b border-border/50')}>
      {/* Status dot */}
      <div className={cn(
        'w-2 h-2 rounded-full flex-shrink-0',
        status === 'normal'     ? 'bg-primary-500' :
        status === 'borderline' ? 'bg-yellow-400'  : 'bg-accent-400'
      )} />

      {/* Name + ref range */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {definition?.displayName ?? biomarker.name}
        </p>
        {definition && (
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Ref: {definition.refRangeLow}–{definition.refRangeHigh} {definition.unit}
          </p>
        )}
      </div>

      {/* Value + trend */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={cn('text-xs font-bold px-2 py-1 rounded-lg', STATUS_STYLES[status])}>
          {biomarker.value} {biomarker.unit}
        </div>
        {trend && (
          <span className={cn('text-sm font-bold', TREND_COLOR[trend])}>
            {TREND_ICON[trend]}
          </span>
        )}
      </div>
    </div>
  );
}
