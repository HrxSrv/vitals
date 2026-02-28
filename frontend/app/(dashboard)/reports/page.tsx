'use client';

import { useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { FileText } from 'lucide-react';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useReports } from '@/lib/hooks/useReports';
import { useProfileStore } from '@/lib/store/profileStore';
import { ProfileSwitcher } from '@/components/layout/ProfileSwitcher';
import { ReportCard } from '@/components/reports/ReportCard';
import { UploadButton } from '@/components/reports/UploadButton';
import { Header } from '@/components/layout/Header';

export default function ReportsPage() {
  const { data: profiles = [] } = useProfiles();
  const { activeProfileId, setActiveProfile, getActiveProfile } = useProfileStore();
  const activeProfile = getActiveProfile(profiles);

  useEffect(() => {
    if (!activeProfileId && profiles.length > 0) {
      const def = profiles.find((p) => p.isDefault) ?? profiles[0];
      if (def) setActiveProfile(def.id);
    }
  }, [profiles, activeProfileId, setActiveProfile]);

  const profileId = activeProfile?.id ?? null;
  const { data: reports = [], isLoading } = useReports(profileId);

  // Group reports by month
  const grouped = reports.reduce<Record<string, typeof reports>>((acc, r) => {
    const key = r.reportDate ? format(parseISO(r.reportDate), 'MMMM yyyy') : 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Reports"
        actions={
          <div className="flex items-center gap-2">
            {profileId && <UploadButton profileId={profileId} variant="icon" />}
            {profiles.length > 0 && (
              <ProfileSwitcher
                profiles={profiles}
                activeProfileId={activeProfile?.id ?? null}
                onChange={setActiveProfile}
              />
            )}
          </div>
        }
      />

      <main className="flex-1 py-4 px-4 space-y-6">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 skeleton rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && reports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText size={32} className="text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">No reports yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Upload a health report PDF to get started.
            </p>
            {profileId && <UploadButton profileId={profileId} variant="primary" label="Upload Report" />}
          </div>
        )}

        {!isLoading && Object.entries(grouped).map(([month, monthReports]) => (
          <section key={month}>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {month}
            </h2>
            <div className="space-y-3">
              {monthReports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
