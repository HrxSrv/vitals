'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchDashboard } from '../api/dashboard';

export const useDashboard = (profileId: string | null) =>
  useQuery({
    queryKey: ['dashboard', profileId],
    queryFn: () => fetchDashboard(profileId!),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
