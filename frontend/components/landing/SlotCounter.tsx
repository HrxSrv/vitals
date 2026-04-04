'use client';

import { useState, useEffect } from 'react';
import { fetchSlots } from '@/lib/api/slots';
import { SLOTS_FLOOR_VALUE } from '@/lib/utils/constants';

const TOTAL_SLOTS = 1000;

type State = { status: 'loading' } | { status: 'error' } | { status: 'loaded'; remaining: number };

export function SlotCounter() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    fetchSlots()
      .then(({ remaining }) => setState({ status: 'loaded', remaining }))
      .catch(() => setState({ status: 'error' }));
  }, []);

  if (state.status === 'loading') {
    return <div className="h-16 w-full rounded-2xl bg-muted animate-pulse" />;
  }

  if (state.status === 'error') {
    return null;
  }

  const displayCount = Math.max(state.remaining, SLOTS_FLOOR_VALUE);
  const taken = TOTAL_SLOTS - displayCount;
  const pct = Math.min(Math.round((taken / TOTAL_SLOTS) * 100), 100);

  return (
    <div
      aria-live="polite"
      aria-label={`${displayCount} free signup slots remaining`}
      className="w-full bg-primary-50 border border-primary-100 rounded-2xl px-4 py-3.5 space-y-2.5"
    >
      {/* Top row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
          <span className="text-sm font-semibold text-foreground">
            Only{' '}
            <span className="text-primary-600 font-bold text-base">{displayCount}</span>
            {' '}free spots left
          </span>
        </div>
        <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2 py-0.5 rounded-full">
          Free forever
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-primary-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Bottom label */}
      <p className="text-xs text-primary-700/70 font-medium">
        {taken} of {TOTAL_SLOTS} spots claimed, join before it fills up
      </p>
    </div>
  );
}
