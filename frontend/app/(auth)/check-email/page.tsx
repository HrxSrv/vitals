'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Leaf, Mail } from 'lucide-react';
import { Suspense } from 'react';

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? 'your email';

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center">
          <Leaf size={20} className="text-white" />
        </div>
        <span className="font-display text-2xl font-semibold text-foreground">Vithos</span>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center text-center animate-fade-up">
        <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-6">
          <Mail size={36} className="text-primary-500" />
        </div>

        <h1 className="font-display text-3xl font-semibold text-foreground mb-3">
          Check your inbox
        </h1>

        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-2">
          We sent a confirmation link to
        </p>
        <p className="text-sm font-semibold text-foreground mb-6 max-w-sm break-all">
          {email}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-8">
          Click the link in the email to activate your account. It may take a minute or two to arrive.
        </p>

        <div className="w-full max-w-sm space-y-3">
          <Link
            href="/login"
            className="block w-full py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm text-center transition-colors"
          >
            Go to sign in
          </Link>
          <Link
            href="/signup"
            className="block w-full py-3.5 rounded-2xl border border-border text-sm font-semibold text-foreground text-center hover:bg-muted transition-colors"
          >
            Use a different email
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}
