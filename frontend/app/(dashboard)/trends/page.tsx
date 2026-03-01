'use client';

import { useEffect, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useProfileStore } from '@/lib/store/profileStore';
import { ProfileSwitcher } from '@/components/layout/ProfileSwitcher';
import { Header } from '@/components/layout/Header';
import { BiomarkerTrendChart } from '@/components/trends/BiomarkerTrendChart';
import { useBiomarkerTrends } from '@/lib/hooks/useTrends';

export default function TrendsPage() {
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
  const { data: trends = [], isLoading, error } = useBiomarkerTrends(profileId);

  // Debug logging
  useEffect(() => {
    console.log('Trends Debug:', {
      profileId,
      activeProfile,
      trendsCount: trends.length,
      isLoading,
      error,
      trends: trends.slice(0, 2), // Log first 2 trends
    });
  }, [profileId, activeProfile, trends, isLoading, error]);

  // Group trends by category
  const groupedTrends = trends.reduce<Record<string, typeof trends>>((acc, trend) => {
    const category = trend.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(trend);
    return acc;
  }, {});

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Trends"
        actions={
          <div className="flex items-center gap-2">
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
              <div key={i} className="h-64 skeleton rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && trends.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <TrendingUp size={32} className="text-muted-foreground" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-2">No trend data yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload multiple reports to see biomarker trends over time.
            </p>
          </div>
        )}

        {!isLoading && Object.entries(groupedTrends).map(([category, categoryTrends]) => (
          <section key={category}>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              {category}
            </h2>
            <div className="space-y-4">
              {categoryTrends.map((trend) => (
                <BiomarkerTrendChart key={trend.nameNormalized} trend={trend} />
              ))}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
