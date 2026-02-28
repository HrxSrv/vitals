import { apiClient } from './client';
import type { Profile, ProfileFormData } from '../types';

export const fetchProfiles = async (): Promise<Profile[]> => {
  const { data } = await apiClient.get<{ profiles: Profile[] }>('/profiles');
  return data.profiles;
};

export const createProfile = async (body: ProfileFormData): Promise<Profile> => {
  const { data } = await apiClient.post<{ profile: Profile }>('/profiles', body);
  return data.profile;
};

export const updateProfile = async (id: string, body: Partial<ProfileFormData>): Promise<Profile> => {
  const { data } = await apiClient.patch<{ profile: Profile }>(`/profiles/${id}`, body);
  return data.profile;
};

export const setDefaultProfile = async (id: string): Promise<Profile> => {
  const { data } = await apiClient.patch<{ profile: Profile }>(`/profiles/${id}/default`);
  return data.profile;
};

export const deleteProfile = async (id: string): Promise<void> => {
  await apiClient.delete(`/profiles/${id}`);
};
