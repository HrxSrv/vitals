'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReports, fetchReport, uploadReport, deleteReport } from '../api/reports';

export const useReports = (profileId: string | null) =>
  useQuery({
    queryKey: ['reports', profileId],
    queryFn: () => fetchReports(profileId!),
    enabled: !!profileId,
  });

export const useReport = (id: string | null) =>
  useQuery({
    queryKey: ['report', id],
    queryFn: () => fetchReport(id!),
    enabled: !!id,
  });

export const useUploadReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: uploadReport,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['dashboard', variables.profileId] });
    },
  });
};

export const useDeleteReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reports'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
