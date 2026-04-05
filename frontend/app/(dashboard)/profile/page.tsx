'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, LogOut, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useProfileStore } from '@/lib/store/profileStore';
import {
  useProfiles,
  useCreateProfile,
  useUpdateProfile,
  useDeleteProfile,
  useSetDefaultProfile,
} from '@/lib/hooks/useProfiles';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { Header } from '@/components/layout/Header';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Profile, ProfileFormData } from '@/lib/types';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const { clearActiveProfile } = useProfileStore();
  const { data: profiles = [], isLoading } = useProfiles();

  const { mutateAsync: createProfile, isPending: isCreating } = useCreateProfile();
  const { mutateAsync: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { mutateAsync: deleteProfile } = useDeleteProfile();
  const { mutateAsync: setDefault } = useSetDefaultProfile();

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Profile | null>(null);

  const handleCreate = async (data: ProfileFormData) => {
    await createProfile(data);
    setModalMode(null);
  };

  const handleEdit = async (data: ProfileFormData) => {
    if (!editingProfile) return;
    await updateProfile({ id: editingProfile.id, data });
    setModalMode(null);
    setEditingProfile(null);
  };

  const handleDelete = async (profile: Profile) => {
    await deleteProfile(profile.id);
    setDeleteConfirm(null);
  };

  const handleLogout = async () => {
    clearActiveProfile();
    await logout();
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Profiles"
        actions={
          <button
            onClick={() => setModalMode('create')}
            className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add
          </button>
        }
      />

      <main className="flex-1 py-4 lg:py-8 px-4 lg:px-8 space-y-6">
        {/* Desktop: two-column layout */}
        <div className="lg:grid lg:grid-cols-[1fr_1fr] lg:gap-8 lg:items-start space-y-6 lg:space-y-0">
          {/* Left: user info + about */}
          <div className="space-y-6">
            {/* User info */}
            <div className="bg-white rounded-2xl shadow-card p-4">
              <div className="flex items-center gap-3 mb-4">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg">
                    {user?.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-between px-4 py-3 bg-accent-50 hover:bg-accent-100 text-accent-600 rounded-xl text-sm font-semibold transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LogOut size={16} />
                  Sign out
                </div>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Settings links */}
            <section>
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">About</h2>
              <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                {[
                  { label: 'Privacy Policy', href: '/privacy' },
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'Help & Support', href: '/help' },
                ].map(({ label, href }) => (
                  <Link
                    key={label}
                    href={href}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted text-sm font-medium text-foreground transition-colors border-b border-border/50 last:border-0"
                  >
                    {label}
                    <ChevronRight size={14} className="text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Right: profiles */}
          <section>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Health Profiles
            </h2>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onEdit={() => { setEditingProfile(profile); setModalMode('edit'); }}
                    onDelete={() => setDeleteConfirm(profile)}
                    onSetDefault={() => setDefault(profile.id)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Create/Edit Modal */}
      <Dialog open={!!modalMode} onOpenChange={(open: boolean) => { if (!open) { setModalMode(null); setEditingProfile(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalMode === 'create' ? 'Add Profile' : 'Edit Profile'}
            </DialogTitle>
          </DialogHeader>
          <ProfileForm
            profile={editingProfile ?? undefined}
            onSubmit={modalMode === 'create' ? handleCreate : handleEdit}
            onCancel={() => { setModalMode(null); setEditingProfile(null); }}
            isLoading={isCreating || isUpdating}
          />
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open: boolean) => { if (!open) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Remove {deleteConfirm?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-5">
            All health data and reports for this profile will be permanently deleted.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold">Cancel</button>
            <button onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-accent-500 text-white text-sm font-semibold">Remove</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
