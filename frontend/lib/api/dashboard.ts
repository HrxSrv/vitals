import { apiClient } from './client';
import type { DashboardData } from '../types';

export const fetchDashboard = async (profileId: string): Promise<DashboardData> => {
  const { data } = await apiClient.get<DashboardData>('/dashboard', {
    params: { profile_id: profileId },
  });
   // Debug logging
  console.log('Dashboard API response:', {
    profile: data.profile?.name,
    summary: data.summary,
    biomarkerCount: data.latestBiomarkers?.length,
    firstBiomarker: data.latestBiomarkers?.[0],
  });
  return data;
};

export const fetchAllDashboards = async (): Promise<DashboardData[]> => {
  const { data } = await apiClient.get<{ dashboards: DashboardData[] }>('/dashboard/all');

  return data.dashboards;
};

export interface UsageData {
  used: number;
  limit: number;
  month: string;
}

export const fetchUsage = async (): Promise<UsageData> => {
  const { data } = await apiClient.get<UsageData>('/dashboard/usage');
  return data;
};
