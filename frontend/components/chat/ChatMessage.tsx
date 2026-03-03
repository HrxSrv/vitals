'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils/cn';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { User, Bot } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      'group relative flex items-start gap-3',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      {/* Avatar */}
      <div className={cn(
        'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full',
        isUser 
          ? 'bg-primary-500 text-white' 
          : 'bg-muted text-foreground'
      )}>
        {isUser ? (
          <User size={16} strokeWidth={2} />
        ) : (
          <Bot size={16} strokeWidth={2} />
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        'flex-1 space-y-2 overflow-hidden',
        isUser && 'flex flex-col items-end'
      )}>
        <div className={cn(
          'rounded-2xl px-4 py-3 text-sm',
          isUser
            ? 'bg-primary-500 text-white max-w-[85%]'
            : 'bg-muted text-foreground'
        )}>
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className={cn(
              'prose prose-sm max-w-none',
              // Base prose styles
              'prose-p:leading-relaxed prose-p:my-2 prose-p:text-foreground',
              // Headings
              'prose-headings:font-semibold prose-headings:text-foreground prose-headings:mt-4 prose-headings:mb-2',
              'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
              // Lists
              'prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-li:text-foreground',
              // Tables - CRITICAL for rendering
              'prose-table:w-full prose-table:my-4 prose-table:border-collapse',
              'prose-thead:bg-primary-50 prose-thead:border-b-2 prose-thead:border-primary-200',
              'prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-foreground prose-th:border prose-th:border-border',
              'prose-td:px-3 prose-td:py-2 prose-td:text-foreground prose-td:border prose-td:border-border',
              'prose-tr:border-b prose-tr:border-border',
              'prose-tbody:divide-y prose-tbody:divide-border',
              // Code
              'prose-code:text-primary-600 prose-code:bg-primary-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none',
              'prose-pre:bg-background prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-3 prose-pre:overflow-x-auto prose-pre:text-xs',
              // Links
              'prose-a:text-primary-600 prose-a:underline hover:prose-a:text-primary-700',
              // Strong/Bold
              'prose-strong:font-semibold prose-strong:text-foreground',
              // Blockquotes
              'prose-blockquote:border-l-4 prose-blockquote:border-primary-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
              // Horizontal rules
              'prose-hr:border-border prose-hr:my-4',
              // Streaming cursor
              message.isStreaming && 'after:content-["▋"] after:animate-pulse after:text-primary-500 after:ml-0.5'
            )}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || '…'}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
