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

  return (
    <div className="flex items-end gap-3 bg-white border-t border-border px-4 py-3">
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
          'flex-1 resize-none rounded-2xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground',
          'placeholder:text-muted-foreground focus:outline-none focus:border-primary-400 focus:bg-white',
          'transition-all duration-200 min-h-[42px] max-h-[120px]',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0',
          value.trim() && !disabled
            ? 'bg-primary-500 hover:bg-primary-600 text-white active:scale-95'
            : 'bg-muted text-muted-foreground cursor-not-allowed'
        )}
      >
        <Send size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
