'use client';

import { useState, useCallback, useRef } from 'react';
import { streamChat } from '../api/chat';
import type { ChatMessage } from '../types';

let msgIdCounter = 0;
const nextId = () => `msg-${++msgIdCounter}-${Date.now()}`;

export const useChat = (profileId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!profileId || isStreaming) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: 'user',
        content,
        timestamp: new Date(),
      };

      const aiId = nextId();
      const aiMsg: ChatMessage = {
        id: aiId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      streamingIdRef.current = aiId;
      setMessages((prev) => [...prev, userMsg, aiMsg]);
      setIsStreaming(true);
      setError(null);

      await streamChat(
        content,
        profileId,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, content: m.content + chunk } : m
            )
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId ? { ...m, isStreaming: false } : m
            )
          );
          setIsStreaming(false);
          streamingIdRef.current = null;
        },
        (err) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiId
                ? { ...m, content: 'Sorry, something went wrong. Please try again.', isStreaming: false }
                : m
            )
          );
          setIsStreaming(false);
          setError(err.message);
          streamingIdRef.current = null;
        }
      );
    },
    [profileId, isStreaming]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isStreaming, error, sendMessage, clearMessages };
};
