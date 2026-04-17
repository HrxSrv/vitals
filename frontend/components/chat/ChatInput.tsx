'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function ChatInput({ onSend, disabled, placeholder = 'Ask about your health…' }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const canSend = !!value.trim() && !disabled;

  return (
    <div
      className={cn(
        'flex items-end gap-1.5 bg-white border border-border rounded-3xl pl-4 pr-1.5 py-1.5',
        'shadow-sm transition-all duration-200',
        'focus-within:border-primary-400 focus-within:shadow-md',
        disabled && 'opacity-60'
      )}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          'flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none py-2 leading-relaxed',
          'min-h-[24px] max-h-[120px]',
          disabled && 'cursor-not-allowed'
        )}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
        className={cn(
          'shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200',
          canSend
            ? 'bg-primary-500 hover:bg-primary-600 text-white active:scale-95'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        <Send size={15} strokeWidth={2.5} />
      </button>
    </div>
  );
}
