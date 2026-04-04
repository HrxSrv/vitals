'use client';

import { ChevronDown, Check, UserCircle } from 'lucide-react';
import { formatRelationship } from '@/lib/utils/formatters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Profile } from '@/lib/types';

interface ProfileSwitcherProps {
  profiles: Profile[];
  activeProfileId: string | null;
  onChange: (profileId: string) => void;
}

export function ProfileSwitcher({ profiles, activeProfileId, onChange }: ProfileSwitcherProps) {
  const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0];

  if (!active) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 transition-colors text-primary-700 text-sm font-semibold">
          <UserCircle size={16} />
          <span>{active.name}</span>
          <ChevronDown size={14} className="transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-0">
        {profiles.map((profile) => (
          <DropdownMenuItem
            key={profile.id}
            onClick={() => onChange(profile.id)}
            className="flex items-center gap-3 px-4 py-3 cursor-pointer rounded-xl hover:bg-muted focus:bg-muted"
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
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
