'use client';

import { AlertCircle, Calendar, FileText, Activity } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatDate, formatRelationship } from '@/lib/utils/formatters';
import type { Profile, DashboardSummary } from '@/lib/types';

interface HealthSummaryCardProps {
  profile: Profile;
  summary: DashboardSummary;
  alertCount: number;
}

export function HealthSummaryCard({ profile, summary, alertCount }: HealthSummaryCardProps) {
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
            icon={<Activity size={14} />}
            label="Markers"
            value={String(summary.biomarkerCount)}
          />
        </div>
      </div>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white/15 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-1 text-white/70 mb-1">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-white font-bold text-sm leading-tight">{value}</p>
    </div>
  );
}
