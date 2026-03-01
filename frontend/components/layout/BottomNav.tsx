'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, TrendingUp, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home',     icon: LayoutDashboard },
  { href: '/reports',   label: 'Reports',  icon: FileText },
  { href: '/trends',    label: 'Trends',   icon: TrendingUp },
  { href: '/chat',      label: 'Chat',     icon: MessageCircle },
  { href: '/profile',   label: 'Profile',  icon: User },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 backdrop-blur-sm shadow-nav border-t border-border z-50 safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-primary-600'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-lg transition-all duration-200',
                isActive ? 'bg-primary-100' : 'bg-transparent'
              )}>
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="transition-all duration-200"
                />
              </div>
              <span className={cn(
                'text-[10px] font-semibold tracking-wide transition-all duration-200',
                isActive ? 'text-primary-600' : 'text-muted-foreground'
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
