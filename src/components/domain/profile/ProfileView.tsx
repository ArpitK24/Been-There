'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LogOut, Edit3, CheckCircle2, AlertCircle, Loader2, User as UserIcon } from 'lucide-react';

interface ProfileViewProps {
  initialProfile: User;
  email: string;
  isEmailVerified: boolean;
}

export function ProfileView({
  initialProfile,
  email,
  isEmailVerified,
}: ProfileViewProps) {
  const router = useRouter();

  const [profile, setProfile] = useState<User>(initialProfile);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [username, setUsername] = useState(profile.username);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');

  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          username,
          avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to update profile.',
        });
      } else {
        setProfile(data.profile);
        setIsEditing(false);
        setFeedback({
          type: 'success',
          message: 'Profile updated successfully!',
        });
        router.refresh();
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'A network error occurred. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const initials = profile.displayName
    ? profile.displayName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  className="h-16 w-16 rounded-2xl object-cover border border-zinc-200 dark:border-zinc-700"
                />
              ) : (
                <div className="h-16 w-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                  {initials}
                </div>
              )}
              <div>
                <CardTitle className="text-xl">{profile.displayName}</CardTitle>
                <CardDescription className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                  @{profile.username}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:hover:bg-rose-950/30 text-xs font-semibold text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LogOut className="h-3.5 w-3.5" />
                )}
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </CardHeader>

        {/* Profile Details or Edit Form */}
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 block font-medium mb-1">Email Address</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">{email}</span>
                  {isEmailVerified ? (
                    <Badge variant="success" className="text-[10px] py-0 px-2">
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="warning" className="text-[10px] py-0 px-2">
                      Unverified
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <span className="text-zinc-400 block font-medium mb-1">Member Since</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {new Date(profile.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Edit Profile Details
              </h4>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  Unique handle for your account. Letters, numbers, and underscores only.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Avatar Image URL (Optional)
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDisplayName(profile.displayName);
                    setUsername(profile.username);
                    setAvatarUrl(profile.avatarUrl || '');
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </Card>

      {/* Account Security & Privacy Overview */}
      <Card className="bg-zinc-50/50 dark:bg-zinc-900/50 border-dashed">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-0.5">
              Account Credentials & Security
            </span>
            Password and email verification credentials are managed securely by Supabase Auth.
            Passwords are never stored in the Been-There application database.
          </div>
        </div>
      </Card>
    </div>
  );
}
