'use client';

import React, { useState } from 'react';
import { IncomingConnectionRequest } from '@/lib/types';
import { Button } from '@/components/ui';
import { Check, X, Loader2, Inbox } from 'lucide-react';

interface ConnectionRequestsProps {
  requests: IncomingConnectionRequest[];
  onChanged?: () => void;
}

export function ConnectionRequests({
  requests,
  onChanged,
}: ConnectionRequestsProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (requestId: string, action: 'ACCEPT' | 'REJECT') => {
    setLoadingId(requestId);
    setError(null);

    try {
      const res = await fetch(`/api/connections/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action.toLowerCase()} request`);
      }

      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setLoadingId(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center">
        <Inbox className="h-8 w-8 text-zinc-400 mb-2" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          No pending requests
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1">
          When friends or trusted contacts find your @username and send a request, they will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg">
          {error}
        </div>
      )}

      <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
        {requests.map((req) => {
          const isActing = loadingId === req.id;

          return (
            <div
              key={req.id}
              className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                  {req.requester.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={req.requester.avatarUrl}
                      alt={req.requester.displayName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    req.requester.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">
                    {req.requester.displayName}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    @{req.requester.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isActing}
                  onClick={() => handleAction(req.id, 'ACCEPT')}
                  className="gap-1 text-xs"
                >
                  {isActing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Accept
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isActing}
                  onClick={() => handleAction(req.id, 'REJECT')}
                  className="gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <X className="h-3.5 w-3.5" />
                  Decline
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
