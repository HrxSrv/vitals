'use client';

import { AlertCircle, Calendar, FileText, Activity, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDate, formatRelationship } from '@/lib/utils/formatters';
import type { Profile, DashboardSummary } from '@/lib/types';

interface HealthSummaryCardProps {
  profile: Profile;
  summary: DashboardSummary;
  alertCount: number;
}

export function HealthSummaryCard({ profile, summary, alertCount }: HealthSummaryCardProps) {
  const isProcessing = summary.totalReports > 0 && summary.biomarkerCount === 0;

  return (
    <div className="mx-4 lg:mx-0 rounded-2xl bg-sage-gradient p-5 text-white overflow-hidden relative">
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -right-2 w-20 h-20 rounded-full bg-white/10" />

      <div className="relative">
        {/* Name + relationship */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">
              {formatRelationship(profile.relationship)}
            </p>
            <h2 className="font-display text-2xl font-semibold leading-tight">{profile.name}</h2>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-1 bg-accent-400/90 text-white rounded-full px-2.5 py-1 text-xs font-bold">
              <AlertCircle size={12} />
              <span>{alertCount} alert{alertCount > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-2">
          <StatItem
            icon={<FileText size={14} />}
            label="Reports"
            value={String(summary.totalReports)}
          />
          <StatItem
            icon={<Calendar size={14} />}
            label="Last check"
            value={summary.latestReportDate ? formatDate(summary.latestReportDate) : 'None yet'}
          />
          <StatItem
            icon={isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />}
            label="Markers"
            value={isProcessing ? 'Analyzing…' : String(summary.biomarkerCount)}
            muted={isProcessing}
          />
        </div>

        {isProcessing && (
          <p className="text-white/60 text-[10px] mt-2.5 text-center">
            Your report is being processed — results will appear shortly
          </p>
        )}
      </div>
    </div>
  );
}

function StatItem({ icon, label, value, muted }: { icon: React.ReactNode; label: string; value: string; muted?: boolean }) {
  return (
    <div className="bg-white/15 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1 text-white/70 mb-1">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className={cn('font-bold text-sm leading-tight', muted ? 'text-white/60 italic' : 'text-white')}>{value}</p>
    </div>
  );
}
