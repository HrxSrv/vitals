'use client';

import Link from 'next/link';
import { ChevronRight, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDate } from '@/lib/utils/formatters';
import type { Report, ProcessingStatus } from '@/lib/types';

const STATUS_CONFIG: Record<ProcessingStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending:    { label: 'Pending',    color: 'bg-gray-100  text-gray-600',   icon: <Clock size={12} /> },
  processing: { label: 'Processing', color: 'bg-blue-50   text-blue-600',   icon: <Loader2 size={12} className="animate-spin" /> },
  done:       { label: 'Ready',      color: 'bg-primary-50 text-primary-700', icon: <CheckCircle2 size={12} /> },
  failed:     { label: 'Failed',     color: 'bg-accent-50 text-accent-600', icon: <AlertTriangle size={12} /> },
};

interface ReportCardProps {
  report: Report;
}

export function ReportCard({ report }: ReportCardProps) {
  const cfg = STATUS_CONFIG[report.processingStatus];
  const bioCount = report.biomarkers?.length ?? 0;

  return (
    <Link href={`/reports/${report.id}`}>
      <div className="bg-white rounded-2xl p-4 shadow-card card-press flex items-center gap-3">
        {/* Date block */}
        <div className="w-12 h-12 rounded-xl bg-primary-50 flex flex-col items-center justify-center flex-shrink-0">
          <span className="text-[10px] text-primary-500 font-semibold uppercase tracking-wide leading-none">
            {formatDate(report.reportDate).split(' ')[0]}
          </span>
          <span className="text-lg font-bold text-primary-700 leading-tight">
            {formatDate(report.reportDate).split(' ')[1]?.replace(',', '') ?? '—'}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Health Report
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(report.reportDate)}
            {bioCount > 0 && ` · ${bioCount} markers`}
          </p>
          <div className={cn('inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold', cfg.color)}>
            {cfg.icon}
            {cfg.label}
          </div>
        </div>

        <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
      </div>
    </Link>
  );
}
