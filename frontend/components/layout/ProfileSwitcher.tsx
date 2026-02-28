'use client';

import { useState } from 'react';
import { ChevronDown, Check, UserCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatRelationship } from '@/lib/utils/formatters';
import type { Profile } from '@/lib/types';

interface ProfileSwitcherProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onChange: (profileId: string) => void;
}

export function ProfileSwitcher({ profiles, activeProfileId, onChange }: ProfileSwitcherProps) {
  const [open, setOpen] = useState(false);
  const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  if (!active) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors text-primary-700 text-sm font-semibold"
      >
        <UserCircle size={16} />
        <span>{active.name}</span>
        <ChevronDown size={14} className={cn('transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-card-hover border border-border z-50 overflow-hidden animate-fade-up">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => { onChange(profile.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatRelationship(profile.relationship)}</p>
                </div>
                {profile.id === activeProfileId && (
                  <Check size={14} className="text-primary-600 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
