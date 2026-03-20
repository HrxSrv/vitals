'use client';

import { Star, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { formatAge, formatRelationship } from '@/lib/utils/formatters';
import type { Profile } from '@/lib/types';

interface ProfileCardProps {
  profile: Profile;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}

const AVATAR_COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
  'bg-pink-100 text-pink-700',
];

export function ProfileCard({ profile, onEdit, onDelete, onSetDefault }: ProfileCardProps) {
  const colorClass = AVATAR_COLORS[profile.name.charCodeAt(0) % AVATAR_COLORS.length];

  return (
    <div className="bg-white rounded-2xl shadow-card p-4 flex items-center gap-4">
      {/* Avatar */}
      <div className={cn('w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0', colorClass)}>
        {profile.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-sm text-foreground truncate">{profile.name}</p>
          {profile.isDefault && (
            <span className="text-[10px] font-bold bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full flex-shrink-0">
              Default
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatRelationship(profile.relationship)}{profile.dob ? ` · ${formatAge(profile.dob)}` : ''}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {!profile.isDefault && (
          <button
            onClick={onSetDefault}
            className="p-2 rounded-xl text-muted-foreground hover:text-yellow-500 hover:bg-yellow-50 transition-colors"
            title="Set as default"
          >
            <Star size={16} />
          </button>
        )}
        <button
          onClick={onEdit}
          className="p-2 rounded-xl text-muted-foreground hover:text-primary-600 hover:bg-primary-50 transition-colors"
        >
          <Pencil size={16} />
        </button>
        {!profile.isDefault && (
          <button
            onClick={onDelete}
            className="p-2 rounded-xl text-muted-foreground hover:text-accent-500 hover:bg-accent-50 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
