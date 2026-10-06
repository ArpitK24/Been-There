'use client';

import React, { useState } from 'react';
import { ConnectionWithUser } from '@/lib/types';
import { Button, Badge } from '@/components/ui';
import { UserCheck, UserMinus, Loader2, Users, AlertTriangle } from 'lucide-react';

interface MyPeopleListProps {
  connections: ConnectionWithUser[];
  onChanged?: () => void;
}

export function MyPeopleList({ connections, onChanged }: MyPeopleListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async (connectionId: string) => {
    setRemovingId(connectionId);
    setError(null);

    try {
      const res = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove connection');
      }

      setConfirmId(null);
      onChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Removal failed');
    } finally {
      setRemovingId(null);
    }
  };

  if (connections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center">
        <Users className="h-10 w-10 text-zinc-400 mb-3" />
        <p className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
          No trusted connections yet
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
          Been-There is built on personal trust. Use the search tab to find people you trust by their @username and connect.
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
        {connections.map((conn) => {
          const user = conn.connectedUser;
          const isRemoving = removingId === conn.id;
          const isConfirming = confirmId === conn.id;

          return (
            <div
              key={conn.id}
              className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center shrink-0 border border-emerald-200/50 dark:border-emerald-800/50">
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    user.displayName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">
                      {user.displayName}
                    </p>
                    <Badge variant="success" className="gap-1 py-0.5 px-2 text-[10px]">
                      <UserCheck className="h-3 w-3" />
                      Connected
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    @{user.username}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isConfirming ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/50 p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400 ml-1" />
                    <span className="text-xs text-rose-700 dark:text-rose-300 font-medium mr-1">
                      Remove?
                    </span>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isRemoving}
                      onClick={() => handleRemove(conn.id)}
                      className="bg-rose-600 hover:bg-rose-700 text-xs py-1 px-2.5 h-7"
                    >
                      {isRemoving ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Yes'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isRemoving}
                      onClick={() => setConfirmId(null)}
                      className="text-xs py-1 px-2 h-7 text-zinc-600 dark:text-zinc-400"
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmId(conn.id)}
                    className="gap-1.5 text-xs text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
