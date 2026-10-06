import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { ConnectionsService } from '@/server/connections';
import { PeopleView } from '@/components/domain/people';
import { Compass, Users, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function PeoplePage() {
  const session = await getAuthSession();

  // 1. Unauthenticated -> redirect to login
  if (!session) {
    redirect('/login');
  }

  // 2. Authenticated but unverified -> redirect to verification gate
  if (!session.isEmailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(session.email)}`);
  }

  const [initialConnections, initialRequests] = await Promise.all([
    ConnectionsService.getAcceptedConnections(session.id),
    ConnectionsService.getIncomingPendingRequests(session.id),
  ]);

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

          <nav className="flex items-center gap-5">
            <Link
              href="/"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              Search Places
            </Link>
            <Link
              href="/people"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 transition-colors"
            >
              <Users className="h-3.5 w-3.5" />
              People
            </Link>
            <Link
              href="/profile"
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 transition-colors"
            >
              <User className="h-3.5 w-3.5" />
              Profile
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 w-full">
        <PeopleView
          initialConnections={initialConnections}
          initialRequests={initialRequests}
        />
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
        <p>Been-There &mdash; Know who&apos;s been there before you.</p>
      </footer>
    </div>
  );
}
