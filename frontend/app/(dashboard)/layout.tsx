'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import { BottomNav } from '@/components/layout/BottomNav';
import { SideNav } from '@/components/layout/SideNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center animate-pulse">
            <div className="w-6 h-6 rounded-full bg-primary-400" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Loading your health data…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <SideNav />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-0">
        {children}
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
