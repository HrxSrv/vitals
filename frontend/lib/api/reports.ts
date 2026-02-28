import { apiClient } from './client';
import type { Report } from '../types';

export const fetchReports = async (profileId: string): Promise<Report[]> => {
  const { data } = await apiClient.get<{ reports: Report[] }>('/reports', {
    params: { profileId },
  });
  return data.reports;
};

export const fetchReport = async (id: string): Promise<Report> => {
  const { data } = await apiClient.get<{ report: Report }>(`/reports/${id}`);
  return data.report;
};

export const uploadReport = async (payload: {
  file: File;
  profileId: string;
  reportDate?: string;
}): Promise<Report> => {
  const form = new FormData();
  form.append('file', payload.file);
  form.append('profileId', payload.profileId);
  if (payload.reportDate) form.append('reportDate', payload.reportDate);

  const { data } = await apiClient.post<{ report: Report }>('/reports', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.report;
};

export const deleteReport = async (id: string): Promise<void> => {
  await apiClient.delete(`/reports/${id}`);
};
