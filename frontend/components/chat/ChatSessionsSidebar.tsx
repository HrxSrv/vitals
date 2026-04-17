'use client';

import { useMemo, useState } from 'react';
import { MessageSquare, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ChatSession } from '@/lib/types';

interface ChatSessionsSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string | null) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

interface SessionGroup {
  label: string;
  items: ChatSession[];
}

function groupSessions(sessions: ChatSession[]): SessionGroup[] {
  const msDay = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  const startOfYesterday = startOfToday - msDay;
  const startOfWeek = startOfToday - 7 * msDay;

  const today: ChatSession[] = [];
  const yesterday: ChatSession[] = [];
  const week: ChatSession[] = [];
  const older: ChatSession[] = [];

  for (const s of sessions) {
    const ts = new Date(s.lastMessageAt).getTime();
    if (ts >= startOfToday) today.push(s);
    else if (ts >= startOfYesterday) yesterday.push(s);
    else if (ts >= startOfWeek) week.push(s);
    else older.push(s);
  }

  const groups: SessionGroup[] = [];
  if (today.length) groups.push({ label: 'Today', items: today });
  if (yesterday.length) groups.push({ label: 'Yesterday', items: yesterday });
  if (week.length) groups.push({ label: 'This week', items: week });
  if (older.length) groups.push({ label: 'Older', items: older });
  return groups;
}

interface ChatSessionsBodyProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelect: (id: string | null) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * The scrollable grouped list of sessions. Shared between the desktop sidebar
 * and the mobile drawer; layout (new-chat button placement, headers) differs
 * per surface so it's composed externally.
 */
export function ChatSessionsBody({
  sessions,
  activeSessionId,
  onSelect,
  onDelete,
  isLoading,
  className,
}: ChatSessionsBodyProps) {
  const groups = useMemo(() => groupSessions(sessions), [sessions]);
  const [pendingDelete, setPendingDelete] = useState<ChatSession | null>(null);

  const handleConfirmDelete = () => {
    if (pendingDelete) onDelete(pendingDelete.id);
    setPendingDelete(null);
  };

  return (
    <>
      <div className={cn('flex-1 overflow-y-auto px-2 py-3 space-y-4', className)}>
        {isLoading && sessions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            No conversations yet. Start one below.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((session) => (
                  <li key={session.id}>
                    <div
                      className={cn(
                        'group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors',
                        activeSessionId === session.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'hover:bg-muted text-foreground'
                      )}
                      onClick={() => onSelect(session.id)}
                    >
                      <MessageSquare size={14} className="shrink-0 opacity-70" />
                      <span className="flex-1 truncate text-sm">{session.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(session);
                        }}
                        className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-background transition-opacity"
                        aria-label="Delete chat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete chat?</DialogTitle>
            <DialogDescription>
              This will permanently remove
              {pendingDelete ? ` "${pendingDelete.title}"` : ' this chat'} and all of its
              messages. This action can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * The inner content used by the desktop sidebar: new-chat button on top,
 * followed by the shared sessions body.
 */
export function ChatSessionsList({
  onNewChat,
  ...bodyProps
}: ChatSessionsSidebarProps) {
  return (
    <>
      <div className="p-3 border-b border-border">
        <NewChatButton onClick={onNewChat} />
      </div>
      <ChatSessionsBody {...bodyProps} />
    </>
  );
}

export function NewChatButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted transition-colors text-sm font-medium"
    >
      <Plus size={16} strokeWidth={2} />
      New chat
    </button>
  );
}

export function ChatSessionsSidebar(props: ChatSessionsSidebarProps) {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-muted/30">
      <ChatSessionsList {...props} />
    </aside>
  );
}
