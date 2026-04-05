'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, TrendingUp, MessageCircle, User, Leaf } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { UsageCard } from '@/components/dashboard/UsageCard';

const NAV_ITEMS = [
  { href: '/home',    label: 'Home',      icon: LayoutDashboard },
  { href: '/reports', label: 'Reports',   icon: FileText },
  { href: '/trends',  label: 'Trends',    icon: TrendingUp },
  { href: '/chat',    label: 'Assistant', icon: MessageCircle },
  { href: '/profile', label: 'Profiles',  icon: User },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center">
          <Leaf size={16} className="text-primary-600" />
        </div>
        <span className="font-display text-lg font-semibold text-foreground">Vithos</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === '/home' ? pathname === '/home' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="shrink-0"
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Usage + footer */}
      <div className="px-3 py-4 border-t border-border space-y-3">
        <UsageCard />
        <div className="flex items-center justify-between px-2 space-x-9">
          <p className="text-[11px] text-muted-foreground">Health Intelligence</p>
          <span className="text-[9px] font-mono font-semibold text-primary-500/70 bg-primary-50 px-1.5 py-0.5 rounded">
            v2.4
          </span>
        </div>
      </div>
    </aside>
  );
}
