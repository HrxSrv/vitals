'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createChatSession,
  deleteChatSession,
  fetchChatSession,
  fetchChatSessions,
  renameChatSession,
} from '../api/chat';
import type { ChatSession } from '../types';

export const useChatSessions = (profileId: string | null) =>
  useQuery({
    queryKey: ['chatSessions', profileId],
    queryFn: () => fetchChatSessions(profileId ?? undefined),
    enabled: !!profileId,
  });

export const useChatSession = (sessionId: string | null) =>
  useQuery({
    queryKey: ['chatSession', sessionId],
    queryFn: () => fetchChatSession(sessionId!),
    enabled: !!sessionId,
  });

export const useCreateChatSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createChatSession,
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['chatSessions', session.profileId] });
    },
  });
};

export const useRenameChatSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameChatSession(id, title),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['chatSessions', session.profileId] });
      qc.invalidateQueries({ queryKey: ['chatSession', session.id] });
    },
  });
};

export const useDeleteChatSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteChatSession(id),
    onMutate: async (id) => {
      // Stop in-flight refetches so they don't overwrite our optimistic update.
      await qc.cancelQueries({ queryKey: ['chatSessions'] });

      // Snapshot every cached sessions list (keyed by profileId) so we can
      // roll back on failure.
      const snapshot = qc.getQueriesData<ChatSession[]>({ queryKey: ['chatSessions'] });

      // Remove the doomed session from every cached list immediately.
      qc.setQueriesData<ChatSession[]>({ queryKey: ['chatSessions'] }, (old) =>
        old ? old.filter((s) => s.id !== id) : old
      );

      return { snapshot };
    },
    onError: (_err, _id, ctx) => {
      // Restore every snapshotted cache entry.
      if (ctx?.snapshot) {
        for (const [key, data] of ctx.snapshot) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['chatSessions'] });
    },
  });
};
