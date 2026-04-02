'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Leaf, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { loginSchema, LoginFormData } from '@/lib/utils/validators';
import { cn } from '@/lib/utils/cn';
import { Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const authError = searchParams.get('error');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setServerError('');
    try {
      await login(data.email, data.password);
      router.replace('/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-12">
        <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center">
          <Leaf size={20} className="text-white" />
        </div>
        <span className="font-display text-2xl font-semibold text-foreground">Vithos</span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-8 animate-fade-up">
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to check your health trends.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-fade-up animate-delay-100">
          {authError === 'auth_failed' && (
            <div className="bg-accent-50 border border-accent-200 text-accent-700 text-sm px-4 py-3 rounded-xl">
              Email confirmation failed or link expired. Please try signing in or request a new link.
            </div>
          )}

          {serverError && (
            <div className="bg-accent-50 border border-accent-200 text-accent-700 text-sm px-4 py-3 rounded-xl">
              {serverError}
            </div>
          )}

          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              {...register('email')}
              className={inputClass(!!errors.email)}
            />
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
                autoComplete="current-password"
                {...register('password')}
                className={cn(inputClass(!!errors.password), 'pr-12')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 mt-2"
          >
            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
            Sign In
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground animate-fade-up animate-delay-200">
          New here?{' '}
          <Link href="/signup" className="text-primary-600 font-semibold hover:text-primary-700">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-foreground mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-accent-500 mt-1">{error}</p>}
    </div>
  );
}

const inputClass = (hasError: boolean) =>
  cn(
    'w-full px-4 py-3 rounded-xl border text-sm text-foreground bg-muted',
    'focus:outline-none focus:bg-white transition-all duration-200 placeholder:text-muted-foreground',
    hasError ? 'border-accent-400' : 'border-border focus:border-primary-400'
  );
