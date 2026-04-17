'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { streamChat } from '../api/chat';
import { useChatSession } from './useChatSessions';
import type { ChatMessage, ChatMessageRecord } from '../types';

let msgIdCounter = 0;
const nextId = () => `msg-${++msgIdCounter}-${Date.now()}`;

/**
 * Stateful hook for a chat session.
 *
 * Messages are sourced from the server (React Query). During streaming we keep
 * an in-flight assistant bubble in local state and render it alongside the
 * cached history. When the stream finishes we invalidate the server cache,
 * which replaces the local bubble with the persisted record — a single source
 * of truth without 60+ cache rewrites per token.
 */
export const useChat = (
  profileId: string | null,
  sessionId: string | null,
  opts?: { onSessionCreated?: (sessionId: string) => void }
) => {
  const qc = useQueryClient();
  const { data, isLoading } = useChatSession(sessionId);

  const [pendingUser, setPendingUser] = useState<ChatMessage | null>(null);
  const [streamingAssistant, setStreamingAssistant] = useState<ChatMessage | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSessionCreatedRef = useRef(opts?.onSessionCreated);
  onSessionCreatedRef.current = opts?.onSessionCreated;

  // Tracks a sessionId transition we triggered ourselves mid-stream (when
  // the backend auto-creates a session for the first message). If the prop's
  // next sessionId matches this ref, we skip the reset effect so the
  // in-flight streaming bubble stays visible.
  const expectedSessionIdRef = useRef<string | null>(null);

  // Clear local state when the user switches sessions. Skip if the change
  // came from our own mid-stream session creation.
  useEffect(() => {
    if (expectedSessionIdRef.current && sessionId === expectedSessionIdRef.current) {
      expectedSessionIdRef.current = null;
      return;
    }
    setPendingUser(null);
    setStreamingAssistant(null);
    setError(null);
  }, [sessionId]);

  const persistedMessages: ChatMessage[] = useMemo(() => {
    const records: ChatMessageRecord[] = data?.messages ?? [];
    return records.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.createdAt),
      isPartial: m.isPartial,
    }));
  }, [data]);

  const messages: ChatMessage[] = useMemo(() => {
    const out = [...persistedMessages];
    if (pendingUser) out.push(pendingUser);
    if (streamingAssistant) out.push(streamingAssistant);
    return out;
  }, [persistedMessages, pendingUser, streamingAssistant]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!profileId || isStreaming) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };
      const assistantId = nextId();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setPendingUser(userMsg);
      setStreamingAssistant(assistantMsg);
      setIsStreaming(true);
      setError(null);

      let nextSessionId = sessionId;

      await streamChat(
        { message: content, profileId, sessionId },
        {
          onSession: (meta) => {
            nextSessionId = meta.sessionId;
            if (meta.created) {
              // Mark this as an expected (self-triggered) session change so
              // the [sessionId] effect below won't clear our streaming state.
              expectedSessionIdRef.current = meta.sessionId;
              onSessionCreatedRef.current?.(meta.sessionId);
            }
          },
          onChunk: (chunk) => {
            setStreamingAssistant((prev) =>
              prev ? { ...prev, content: prev.content + chunk } : prev
            );
          },
          onDone: async () => {
            setIsStreaming(false);
            // Keep the local user/assistant bubbles visible until the server
            // refetch populates the cache with their persisted records —
            // otherwise the UI flashes empty in the gap.
            const refetches: Promise<unknown>[] = [
              qc.invalidateQueries({ queryKey: ['chatSessions'] }),
            ];
            if (nextSessionId) {
              refetches.push(
                qc.invalidateQueries({ queryKey: ['chatSession', nextSessionId] })
              );
            }
            await Promise.all(refetches);
            setPendingUser(null);
            setStreamingAssistant(null);
          },
          onError: async (err) => {
            setIsStreaming(false);
            setStreamingAssistant((prev) =>
              prev
                ? {
                    ...prev,
                    content: prev.content || 'Sorry, something went wrong. Please try again.',
                    isStreaming: false,
                    isPartial: true,
                  }
                : prev
            );
            setError(err.message);
            const refetches: Promise<unknown>[] = [
              qc.invalidateQueries({ queryKey: ['chatSessions'] }),
            ];
            if (nextSessionId) {
              refetches.push(
                qc.invalidateQueries({ queryKey: ['chatSession', nextSessionId] })
              );
            }
            await Promise.all(refetches);
            setPendingUser(null);
            setStreamingAssistant(null);
          },
        }
      );
    },
    [profileId, sessionId, isStreaming, qc]
  );

  return {
    messages,
    isStreaming,
    isLoading,
    error,
    sendMessage,
    session: data?.session,
  };
};
