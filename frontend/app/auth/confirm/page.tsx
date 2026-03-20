'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Leaf, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Suspense } from 'react';

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/home';

    if (!code) {
      router.replace('/login?error=auth_failed');
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          router.replace('/login?error=auth_failed');
        } else {
          router.replace(next);
        }
      });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-primary-500 flex items-center justify-center">
        <Leaf size={22} className="text-white" />
      </div>
      <Loader2 size={24} className="animate-spin text-primary-500" />
      <p className="text-sm text-muted-foreground font-medium">Confirming your account…</p>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  );
}
