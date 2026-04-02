'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Leaf, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { signupSchema, SignupFormData } from '@/lib/utils/validators';
import { cn } from '@/lib/utils/cn';

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupFormData) => {
    setServerError('');
    try {
      await signup(data.email, data.password, data.name);
      // Redirect to check-email page — user must confirm email before accessing the app
      router.replace(`/check-email?email=${encodeURIComponent(data.email)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-6 py-10">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-10">
        <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center">
          <Leaf size={20} className="text-white" />
        </div>
        <span className="font-display text-2xl font-semibold text-foreground">Vithos</span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-7 animate-fade-up">
          <h1 className="font-display text-3xl font-semibold text-foreground mb-2">Create account</h1>
          <p className="text-sm text-muted-foreground">Start tracking your health today.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-fade-up animate-delay-100">
          {serverError && (
            <div className="bg-accent-50 border border-accent-200 text-accent-700 text-sm px-4 py-3 rounded-xl">
              {serverError}
            </div>
          )}

          <Field label="Full name" error={errors.name?.message}>
            <input type="text" placeholder="Aditya Sharma" autoComplete="name" {...register('name')} className={inputClass(!!errors.name)} />
          </Field>

          <Field label="Email" error={errors.email?.message}>
            <input type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} className={inputClass(!!errors.email)} />
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
                {...register('password')}
                className={cn(inputClass(!!errors.password), 'pr-12')}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <Field label="Confirm password" error={errors.confirmPassword?.message}>
            <input
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className={inputClass(!!errors.confirmPassword)}
            />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 mt-2"
          >
            {isSubmitting && <Loader2 size={18} className="animate-spin" />}
            Create Account
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground animate-fade-up animate-delay-200">
          Already have an account?{' '}
          <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
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
