'use client';

import { QUICK_QUESTIONS } from '@/lib/utils/constants';

interface QuickQuestionsProps {
  onSelect: (q: string) => void;
  disabled?: boolean;
}

export function QuickQuestions({ onSelect, disabled }: QuickQuestionsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-1.5 scrollbar-hide">
      {QUICK_QUESTIONS.map((q) => (
        <button
          key={q}
          onClick={() => onSelect(q)}
          disabled={disabled}
          className="flex-shrink-0 bg-white border border-border hover:border-primary-300 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-foreground px-3.5 py-2 rounded-full font-medium transition-colors whitespace-nowrap"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
