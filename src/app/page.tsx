import React from 'react';
import Link from 'next/link';
import { PlaceSearchInput } from '@/components/domain/places';
import { Users, Repeat, ShieldCheck, Compass } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-zinc-900 dark:text-zinc-100">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Compass className="h-5 w-5" />
            </span>
            <span>Been-There</span>
          </Link>

          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl transition-colors"
            >
              Create account
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Hero & Search Section */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center w-full">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold mb-6 border border-emerald-200/50 dark:border-emerald-800/40">
          <span>Trusted Experience Layer</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 max-w-2xl mx-auto leading-tight sm:leading-tight">
          Know who&apos;s been there before you.
        </h1>

        <p className="mt-5 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
          Make confident decisions based on the real-world experiences and repeat visits of people you trust — not anonymous online ratings.
        </p>

        {/* Search Entry Point */}
        <div className="mt-10 sm:mt-12">
          <p className="text-xs uppercase tracking-wider font-semibold text-zinc-400 mb-3">
            Where are you thinking of going?
          </p>
          <PlaceSearchInput />
        </div>

        {/* Core Principles */}
        <div className="mt-24 grid sm:grid-cols-3 gap-6 text-left border-t border-zinc-200 dark:border-zinc-800 pt-12">
          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              People before ratings
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Trusted relationships are far more indicative than anonymous aggregate review scores.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <Repeat className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Experience before opinion
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Repeat visits and verified frequency provide stronger signal than one-time complaints.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Privacy by design
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
              Server-enforced boundaries: you control whether your activity is visible and to whom.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Been-There — Trusted Experience Graph</span>
          <span>Next.js • TypeScript • Drizzle • Supabase</span>
        </div>
      </footer>
    </div>
  );
}
