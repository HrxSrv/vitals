'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Menu } from 'lucide-react';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useProfileStore } from '@/lib/store/profileStore';
import { useChat } from '@/lib/hooks/useChat';
import {
  useChatSessions,
  useDeleteChatSession,
} from '@/lib/hooks/useChatSessions';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { QuickQuestions } from '@/components/chat/QuickQuestions';
import { ChatSessionsSidebar } from '@/components/chat/ChatSessionsSidebar';
import { ChatSessionsDrawer } from '@/components/chat/ChatSessionsDrawer';
import { ProfileSwitcher } from '@/components/layout/ProfileSwitcher';
import { Header } from '@/components/layout/Header';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ChatPage() {
  const { data: profiles = [] } = useProfiles();
  const { activeProfileId, setActiveProfile, getActiveProfile } = useProfileStore();
  const activeProfile = getActiveProfile(profiles);

  useEffect(() => {
    if (!activeProfileId && profiles.length > 0) {
      const def = profiles.find((p) => p.isDefault) ?? profiles[0];
      if (def) setActiveProfile(def.id);
    }
  }, [profiles, activeProfileId, setActiveProfile]);

  const profileId = activeProfile?.id ?? null;

  // Session list for the active profile
  const { data: sessions = [], isLoading: sessionsLoading } = useChatSessions(profileId);
  const deleteSession = useDeleteChatSession();

  // Mobile drawer open state (desktop uses the persistent sidebar)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Active session — null means "new chat; first message will create the session"
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const lastProfileIdRef = useRef<string | null>(null);
  // Tracks which profile we've already auto-picked a default session for, so
  // explicit user actions (new chat, manual select) aren't clobbered by the
  // default-pick effect the next time sessions re-fetch.
  const defaultedProfileRef = useRef<string | null>(null);

  // Profile switch → forget previous selection and allow default-pick to run again.
  useEffect(() => {
    if (profileId !== lastProfileIdRef.current) {
      lastProfileIdRef.current = profileId;
      defaultedProfileRef.current = null;
      setActiveSessionId(null);
    }
  }, [profileId]);

  // On first sessions-load for a profile, open the most recent one.
  useEffect(() => {
    if (!profileId) return;
    if (defaultedProfileRef.current === profileId) return;
    if (sessions.length === 0) return;
    defaultedProfileRef.current = profileId;
    setActiveSessionId(sessions[0].id);
  }, [sessions, profileId]);

  const handleSessionCreated = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const { messages, isStreaming, sendMessage } = useChat(profileId, activeSessionId, {
    onSessionCreated: handleSessionCreated,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const markUserPicked = useCallback(() => {
    if (profileId) defaultedProfileRef.current = profileId;
  }, [profileId]);

  const handleSelectSession = useCallback(
    (id: string | null) => {
      markUserPicked();
      setActiveSessionId(id);
      setDrawerOpen(false);
    },
    [markUserPicked]
  );

  const handleNewChat = useCallback(() => {
    markUserPicked();
    setActiveSessionId(null);
    setDrawerOpen(false);
  }, [markUserPicked]);

  const handleDeleteSession = useCallback(
    (id: string) => {
      // Clear active immediately if we're deleting the open session — the
      // mutation is optimistic, so the tile vanishes at the same time and
      // we shouldn't keep its messages rendered.
      if (activeSessionId === id) {
        markUserPicked();
        setActiveSessionId(null);
      }
      deleteSession.mutate(id);
    },
    [deleteSession, activeSessionId, markUserPicked]
  );

  return (
    <div className="flex h-[calc(100dvh-6rem)] lg:h-screen overflow-hidden">
      <ChatSessionsSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={handleSelectSession}
        onNewChat={handleNewChat}
        onDelete={handleDeleteSession}
        isLoading={sessionsLoading}
      />

      <ChatSessionsDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelect={handleSelectSession}
        onNewChat={handleNewChat}
        onDelete={handleDeleteSession}
        isLoading={sessionsLoading}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title="Health Assistant"
          leftAction={
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Open chats"
            >
              <Menu size={20} strokeWidth={2} />
            </button>
          }
          actions={
            <div className="flex items-center gap-2">
              {profiles.length > 0 && (
                <ProfileSwitcher
                  profiles={profiles}
                  activeProfileId={activeProfile?.id ?? null}
                  onChange={setActiveProfile}
                />
              )}
            </div>
          }
        />

        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 lg:px-8 py-4 space-y-3 pb-4">
            {messages.length === 0 ? (
              <EmptyChat />
            ) : (
              messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        <div className="shrink-0 bg-background pb-2 lg:pb-3">
          <QuickQuestions onSelect={sendMessage} disabled={isStreaming || !profileId} />
          <div className="px-3 lg:px-6 pt-2">
            <ChatInput onSend={sendMessage} disabled={isStreaming || !profileId} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-center px-6">
      <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-5">
        <MessageCircle size={32} className="text-primary-400" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground mb-2">
        Ask me anything
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed">
        I can answer questions about your biomarkers, explain what your results mean, and compare trends over time.
      </p>
    </div>
  );
}
