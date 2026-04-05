'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDashboard, fetchUsage } from '../api/dashboard';

export const useDashboard = (profileId: string | null) =>
  useQuery({
    queryKey: ['dashboard', profileId],
    queryFn: () => fetchDashboard(profileId!),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
    // Poll every 5s while a report is being processed (reports exist but no biomarkers yet)
    refetchInterval: (query) => {
      const data = query.state.data;
      const isProcessing = data && data.summary.totalReports > 0 && data.summary.biomarkerCount === 0;
      return isProcessing ? 5000 : false;
    },
  });

export const useUsage = () =>
  useQuery({
    queryKey: ['usage'],
    queryFn: fetchUsage,
    staleTime: 60 * 1000, // 1 minute
  });
