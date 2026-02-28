import { apiClient } from './client';
import type { DashboardData } from '../types';

export const fetchDashboard = async (profileId: string): Promise<DashboardData> => {
  const { data } = await apiClient.get<DashboardData>('/dashboard', {
    params: { profile_id: profileId },
  });
  return data;
};

export const fetchAllDashboards = async (): Promise<DashboardData[]> => {
  const { data } = await apiClient.get<{ dashboards: DashboardData[] }>('/dashboard/all');
  return data.dashboards;
};
