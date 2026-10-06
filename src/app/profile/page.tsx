import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { ProfileView } from '@/components/domain/profile';
import { Compass } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const session = await getAuthSession();

  // 1. Unauthenticated -> redirect to login
  if (!session) {
    redirect('/login');
  }

  // 2. Authenticated but unverified -> redirect to verification gate
  if (!session.isEmailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(session.email)}`);
  }

  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Compass className="h-5 w-5" />
            </span>
            <span>Been-There</span>
          </Link>

          <nav className="flex items-center gap-4">
            <Link
              href="/"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Search Places
            </Link>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/50 dark:border-emerald-800/40">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Verified Account</span>
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Your Profile</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your personal profile and account credentials.
          </p>
        </div>

        <ProfileView
          initialProfile={session}
          email={session.email}
          isEmailVerified={session.isEmailVerified}
        />
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-400">
        Been-There — Know who&apos;s been there before you.
      </footer>
    </div>
  );
}
