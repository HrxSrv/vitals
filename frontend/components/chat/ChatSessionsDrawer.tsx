'use client';

import { Leaf, X } from 'lucide-react';
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  ChatSessionsBody,
  NewChatButton,
} from './ChatSessionsSidebar';
import type { ChatSession } from '@/lib/types';

interface ChatSessionsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string | null) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

/**
 * Mobile left-slide drawer. Layout:
 *   - top bar: Vithos logo on the left, close (X) on the right
 *   - new-chat button, just above the sessions list
 *   - scrollable list of past sessions
 * Rendered `lg:hidden`; desktop uses ChatSessionsSidebar instead.
 */
export function ChatSessionsDrawer({
  open,
  onOpenChange,
  sessions,
  activeSessionId,
  onSelect,
  onNewChat,
  onDelete,
  isLoading,
}: ChatSessionsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="lg:hidden p-0 gap-0 w-[82vw] max-w-[320px] bg-background"
      >
        <SheetTitle className="sr-only">Chat sessions</SheetTitle>

        <div className="flex items-center justify-between px-3 py-3">
          <div
            className="w-10 h-10 rounded-2xl bg-primary-100 flex items-center justify-center"
            aria-label="Vithos"
          >
            <Leaf size={20} className="text-primary-600" />
          </div>
          <SheetClose asChild>
            <button
              className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X size={20} strokeWidth={2} />
            </button>
          </SheetClose>
        </div>

        <div className="px-3 py-3">
          <NewChatButton onClick={onNewChat} />
        </div>

        <ChatSessionsBody
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelect={onSelect}
          onDelete={onDelete}
          isLoading={isLoading}
        />
      </SheetContent>
    </Sheet>
  );
}
