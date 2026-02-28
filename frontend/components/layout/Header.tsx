'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  className?: string;
}

export function Header({ title, showBack, actions, className }: HeaderProps) {
  const router = useRouter();

  return (
    <header className={cn('sticky-header px-4 py-3 flex items-center gap-3', className)}>
      {showBack && (
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
      )}

      {title && (
        <h1 className="flex-1 font-display text-xl font-semibold text-foreground">
          {title}
        </h1>
      )}

      {actions && (
        <div className="flex items-center gap-2 ml-auto">
          {actions}
        </div>
      )}
    </header>
  );
}
