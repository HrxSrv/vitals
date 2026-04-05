'use client';

import Link from 'next/link';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useUsage } from '@/lib/hooks/useDashboard';

interface UsageCardProps {
  isMobile?: boolean;
}

export function UsageCard({ isMobile = false }: UsageCardProps) {
  const { data } = useUsage();

  if (!data) return null;

  const { used, limit, month } = data;
  const pct = Math.min(Math.round((used / limit) * 100), 100);
  const remaining = Math.max(limit - used, 0);
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  // Format month label: "2026-04" → "Apr 2026"
  const [year, mon] = month.split('-');
  const monthLabel = new Date(Number(year), Number(mon) - 1).toLocaleString('en', { month: 'short', year: 'numeric' });

  // Circular progress calculation
  const circumference = 2 * Math.PI * 36; // radius = 36
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  if (isMobile) {
    return (
      <Link
        href="/profile"
        className={cn(
          'rounded-2xl p-4 transition-all shadow-soft hover:shadow-soft-lg active:scale-[0.98] flex flex-col items-center justify-center gap-3 h-full',
          isAtLimit
            ? 'bg-accent-50 border border-accent-200'
            : isNearLimit
              ? 'bg-yellow-50 border border-yellow-200'
              : 'bg-white',
        )}
      >
        {/* Circular Progress */}
        <div className="relative w-16 h-16">
          <svg className="transform -rotate-90 w-16 h-16">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="5"
              fill="none"
              className="text-muted"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="5"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={cn(
                'transition-all duration-500',
                isAtLimit ? 'text-accent-500' : isNearLimit ? 'text-yellow-400' : 'text-primary-500'
              )}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn(
              'text-base font-bold leading-none',
              isAtLimit ? 'text-accent-600' : isNearLimit ? 'text-yellow-700' : 'text-primary-600'
            )}>
              {pct}%
            </span>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs font-semibold text-foreground leading-tight-heading tracking-tight-md">Monthly Usage</p>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-tight-sm">{remaining} pages left</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href="/profile"
      className={cn(
        'block rounded-2xl p-4 transition-all shadow-soft hover:shadow-soft-lg',
        isAtLimit
          ? 'bg-accent-50 border border-accent-200'
          : isNearLimit
            ? 'bg-yellow-50 border border-yellow-200'
            : 'bg-white',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            isAtLimit ? 'bg-accent-100' : isNearLimit ? 'bg-yellow-100' : 'bg-primary-100',
          )}>
            <FileText size={16} className={cn(
              isAtLimit ? 'text-accent-600' : isNearLimit ? 'text-yellow-600' : 'text-primary-600',
            )} />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground leading-tight-heading tracking-tight-md">Monthly Usage</p>
            <p className="text-[10px] text-muted-foreground tracking-tight-sm">{monthLabel}</p>
          </div>
        </div>
        <span className={cn(
          'text-xs font-bold px-2 py-0.5 rounded-full',
          isAtLimit
            ? 'bg-accent-100 text-accent-600'
            : isNearLimit
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-primary-50 text-primary-600',
        )}>
          {remaining} left
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-2">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isAtLimit ? 'bg-accent-500' : isNearLimit ? 'bg-yellow-400' : 'bg-primary-500',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-[10px] text-muted-foreground tracking-tight-sm">
        {used} of {limit} pages used
      </p>
    </Link>
  );
}
