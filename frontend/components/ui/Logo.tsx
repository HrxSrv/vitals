import { cn } from '@/lib/utils/cn';

/**
 * Vithos brand leaf mark (gradient, no wordmark). Drop-in replacement for the
 * old lucide <Leaf> placeholder. Size it with className (e.g. "w-8 h-8").
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/vithos-mark.svg"
      alt="Vithos"
      className={cn('w-8 h-8 select-none', className)}
      draggable={false}
    />
  );
}

/** Full Vithos lockup (leaf mark + wordmark). */
export function Logo({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/vithos-logo.svg"
      alt="Vithos"
      className={cn('h-8 w-auto select-none', className)}
      draggable={false}
    />
  );
}
