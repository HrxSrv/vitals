'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Only redirect once auth state is confirmed — never while loading
    if (!isLoading && isAuthenticated) {
      router.replace('/home');
    }
  }, [isAuthenticated, isLoading, router]);

  // Don't render auth pages while we're still checking session
  // (avoids flash of login form for already-authenticated users)
  if (isLoading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-[480px]">
        {children}
      </div>
    </div>
  );
}
