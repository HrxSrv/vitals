'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { profileSchema, ProfileFormData } from '@/lib/utils/validators';
import { RELATIONSHIP_OPTIONS, GENDER_OPTIONS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/cn';
import type { Profile } from '@/lib/types';

interface ProfileFormProps {
  profile?: Profile;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const NAME_PLACEHOLDER: Record<string, string> = {
  self: 'e.g. Aditya',
  mother: 'e.g. Mummy',
  father: 'e.g. Papa',
  spouse: 'e.g. Priya',
  grandmother: 'e.g. Nani',
  grandfather: 'e.g. Nana',
  other: 'e.g. Uncle Raj',
};

export function ProfileForm({ profile, onSubmit, onCancel, isLoading }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile
      ? { name: profile.name, relationship: profile.relationship, dob: profile.dob, gender: profile.gender }
      : undefined,
  });

  const relationship = useWatch({ control, name: 'relationship' });
  const namePlaceholder = NAME_PLACEHOLDER[relationship] ?? 'e.g. Mummy';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Field label="Relationship" error={errors.relationship?.message}>
        <select {...register('relationship')} className={inputClass(!!errors.relationship)}>
          <option value="">Select…</option>
          {RELATIONSHIP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </Field>

      <Field label="Name" error={errors.name?.message}>
        <input
          {...register('name')}
          placeholder={namePlaceholder}
          className={inputClass(!!errors.name)}
        />
      </Field>

      <Field label="Date of birth (optional)" error={errors.dob?.message}>
        <input
          type="date"
          {...register('dob')}
          className={inputClass(!!errors.dob)}
        />
      </Field>

      <Field label="Gender" error={errors.gender?.message}>
        <div className="flex gap-3">
          {GENDER_OPTIONS.map((o) => (
            <label key={o.value} className="flex-1 cursor-pointer">
              <input type="radio" value={o.value} {...register('gender')} className="peer sr-only" />
              <div className={cn(
                'text-center py-2.5 rounded-xl border text-sm font-medium transition-colors',
                'peer-checked:border-primary-400 peer-checked:bg-primary-50 peer-checked:text-primary-700',
                'border-border hover:border-primary-300 hover:bg-primary-50/50'
              )}>
                {o.label}
              </div>
            </label>
          ))}
        </div>
        {errors.gender && <p className="text-xs text-accent-500 mt-1">{errors.gender.message}</p>}
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-2xl border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {profile ? 'Save changes' : 'Add profile'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-accent-500 mt-1">{error}</p>}
    </div>
  );
}

const inputClass = (hasError: boolean) =>
  cn(
    'w-full px-4 py-2.5 rounded-xl border text-sm text-foreground bg-muted',
    'focus:outline-none focus:bg-white transition-all duration-200',
    hasError
      ? 'border-accent-400 focus:border-accent-400'
      : 'border-border focus:border-primary-400'
  );
