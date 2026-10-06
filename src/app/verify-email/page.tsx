'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Compass, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState(initialEmail);
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    errorParam === 'invalid_or_expired'
      ? { type: 'error', message: 'The verification link was invalid or has expired. Please request a new one.' }
      : null
  );

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsResending(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({
          type: 'error',
          message: data.error || 'Unable to resend verification email.',
        });
      } else {
        setFeedback({
          type: 'success',
          message: data.message || 'Verification link sent! Please check your inbox.',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'A network error occurred. Please try again.',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm text-center">
      <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6 border border-emerald-100 dark:border-emerald-800/40">
        <Mail className="h-7 w-7" />
      </div>

      <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
        We sent a verification link to your email address. Click the link in the message to activate your Been-There account.
      </p>

      {feedback && (
        <div
          className={`my-6 p-3.5 rounded-xl text-xs flex items-start gap-2.5 text-left ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleResend} className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800">
        <p className="text-xs text-zinc-500 mb-3 text-left">
          Didn&apos;t receive the link? Enter your email to resend:
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@example.com"
            className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3.5 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={isResending || !email}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-900 text-white font-medium text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {isResending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Resend link</span>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 text-center text-xs text-zinc-500">
        Already confirmed?{' '}
        <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
          Sign in to your account
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Compass className="h-5 w-5" />
            </span>
            <span>Been-There</span>
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Suspense
          fallback={
            <div className="text-center py-12 text-zinc-400 text-sm flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              <span>Loading verification screen...</span>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-400">
        Been-There — Know who&apos;s been there before you.
      </footer>
    </div>
  );
}
