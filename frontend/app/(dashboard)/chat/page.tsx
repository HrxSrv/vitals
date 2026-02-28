'use client';

import { useEffect, useRef } from 'react';
import { MessageCircle, Trash2 } from 'lucide-react';
import { useProfiles } from '@/lib/hooks/useProfiles';
import { useProfileStore } from '@/lib/store/profileStore';
import { useChat } from '@/lib/hooks/useChat';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { QuickQuestions } from '@/components/chat/QuickQuestions';
import { ProfileSwitcher } from '@/components/layout/ProfileSwitcher';
import { Header } from '@/components/layout/Header';

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
  const { messages, isStreaming, sendMessage, clearMessages } = useChat(profileId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      <Header
        title="Health Assistant"
        actions={
          <div className="flex items-center gap-2">
            {profiles.length > 0 && (
              <ProfileSwitcher
                profiles={profiles}
                activeProfileId={activeProfile?.id ?? null}
                onChange={setActiveProfile}
              />
            )}
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Clear chat"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
        }
      />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-4">
        {messages.length === 0 ? (
          <EmptyChat />
        ) : (
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      <div className="py-2 bg-background/90 backdrop-blur-sm border-t border-border">
        <QuickQuestions onSelect={sendMessage} disabled={isStreaming || !profileId} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={isStreaming || !profileId} />
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
