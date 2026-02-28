'use client';

import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { cn } from '@/lib/utils/cn';
import type { ChatMessage as ChatMessageType } from '@/lib/types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[82%] flex flex-col gap-1', isUser && 'items-end')}>
        <div className={cn(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed',
          isUser
            ? 'bg-primary-500 text-white rounded-tr-sm'
            : 'bg-white text-foreground shadow-card rounded-tl-sm'
        )}>
          {isUser ? (
            <p>{message.content}</p>
          ) : (
            <div className={cn(
              'prose prose-sm max-w-none',
              '[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5',
              '[&_strong]:font-semibold',
              message.isStreaming && 'after:content-["▋"] after:animate-pulse after:text-primary-500 after:ml-0.5'
            )}>
              <ReactMarkdown>{message.content || '…'}</ReactMarkdown>
            </div>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground px-1">
          {format(message.timestamp, 'h:mm a')}
        </p>
      </div>
    </div>
  );
}
