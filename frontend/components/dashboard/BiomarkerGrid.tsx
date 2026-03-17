'use client';

import { BiomarkerCard } from './BiomarkerCard';
import type { BiomarkerWithStatus } from '@/lib/types';

interface BiomarkerGridProps {
  biomarkers: BiomarkerWithStatus[];
}

export function BiomarkerGrid({ biomarkers }: BiomarkerGridProps) {
  const preview = biomarkers.slice(0, 6);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-4 lg:px-0">
      {preview.map((item, i) => {
        // Safety check for malformed data
        if (!item?.biomarker?.id) {
          console.error('Invalid biomarker data:', item);
          return null;
        }
        
        return (
          <div
            key={item.biomarker.id}
            className="animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <BiomarkerCard item={item} className="h-full" />
          </div>
        );
      })}
    </div>
  );
}
