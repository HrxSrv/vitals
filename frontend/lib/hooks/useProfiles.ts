'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProfiles,
  createProfile,
  updateProfile,
  setDefaultProfile,
  deleteProfile,
} from '../api/profiles';
import type { ProfileFormData } from '../types';

export const useProfiles = () =>
  useQuery({
    queryKey: ['profiles'],
    queryFn: fetchProfiles,
  });

export const useCreateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProfileFormData) => createProfile(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
};

export const useUpdateProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ProfileFormData> }) =>
      updateProfile(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
};

export const useSetDefaultProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => setDefaultProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
};

export const useDeleteProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProfile(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profiles'] }),
  });
};
