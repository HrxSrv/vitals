import { apiClient } from './client';
import { getAuthToken } from '../supabase';
import type { ChatMessageRecord, ChatSession } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const fetchChatSessions = async (profileId?: string): Promise<ChatSession[]> => {
  const { data } = await apiClient.get<{ sessions: ChatSession[] }>('/chat/sessions', {
    params: profileId ? { profileId } : undefined,
  });
  return data.sessions;
};

export const fetchChatSession = async (
  id: string
): Promise<{ session: ChatSession; messages: ChatMessageRecord[] }> => {
  const { data } = await apiClient.get<{
    session: ChatSession;
    messages: ChatMessageRecord[];
  }>(`/chat/sessions/${id}`);
  return data;
};

export const createChatSession = async (payload: {
  profileId: string;
  title?: string;
}): Promise<ChatSession> => {
  const { data } = await apiClient.post<{ session: ChatSession }>('/chat/sessions', payload);
  return data.session;
};

export const renameChatSession = async (
  id: string,
  title: string
): Promise<ChatSession> => {
  const { data } = await apiClient.patch<{ session: ChatSession }>(
    `/chat/sessions/${id}`,
    { title }
  );
  return data.session;
};

export const deleteChatSession = async (id: string): Promise<void> => {
  await apiClient.delete(`/chat/sessions/${id}`);
};

export interface StreamChatCallbacks {
  onSession?: (meta: { sessionId: string; title: string; created: boolean }) => void;
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export const streamChat = async (
  payload: { message: string; profileId: string; sessionId?: string | null },
  callbacks: StreamChatCallbacks
): Promise<void> => {
  const token = await getAuthToken();

  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message: payload.message,
        profileId: payload.profileId,
        ...(payload.sessionId ? { sessionId: payload.sessionId } : {}),
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent: string | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line. Split the buffer on \n
      // and parse event/data lines, retaining any trailing partial line.
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const raw of lines) {
        const line = raw.replace(/\r$/, '');
        if (line === '') {
          currentEvent = null;
          continue;
        }
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
          continue;
        }
        if (!line.startsWith('data: ')) continue;

        const payloadStr = line.slice(6);
        try {
          const parsed = JSON.parse(payloadStr);
          switch (currentEvent) {
            case 'session':
              callbacks.onSession?.(parsed);
              break;
            case 'message':
              if (parsed.chunk) callbacks.onChunk(parsed.chunk);
              break;
            case 'done':
              callbacks.onDone();
              return;
            case 'error':
              callbacks.onError(
                new Error(parsed.error?.message || 'Chat stream error')
              );
              return;
            default:
              break;
          }
        } catch {
          // skip malformed lines
        }
      }
    }

    callbacks.onDone();
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
};
