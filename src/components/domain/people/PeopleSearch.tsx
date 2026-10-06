'use client';

import React, { useState } from 'react';
import { UserSearchResult } from '@/lib/types';
import { Button, Badge } from '@/components/ui';
import { Search, Loader2, UserPlus, Check, X, Clock, UserCheck } from 'lucide-react';

interface PeopleSearchProps {
  onConnectionChanged?: () => void;
}

export function PeopleSearch({ onConnectionChanged }: PeopleSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchTerm.trim().replace(/^@/, '');
    if (!query) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/users/search?username=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to search users');
      }

      setResults(data.users || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search error');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (targetUser: UserSearchResult) => {
    setActionLoadingId(targetUser.id);
    setError(null);
    try {
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUser.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to send request');
      }

      // Update state locally
      setResults((prev) =>
        prev.map((u) =>
          u.id === targetUser.id
            ? {
                ...u,
                connectionState: 'OUTGOING_PENDING',
                connectionId: data.connection?.id || null,
              }
            : u
        )
      );
      onConnectionChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelRequest = async (user: UserSearchResult) => {
    if (!user.connectionId) return;
    setActionLoadingId(user.id);
    setError(null);

    try {
      const res = await fetch(`/api/connections/${user.connectionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel request');
      }

      setResults((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, connectionState: 'NO_CONNECTION', connectionId: null }
            : u
        )
      );
      onConnectionChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Cancellation failed');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAcceptRequest = async (user: UserSearchResult) => {
    if (!user.connectionId) return;
    setActionLoadingId(user.id);
    setError(null);

    try {
      const res = await fetch(`/api/connections/${user.connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ACCEPT' }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to accept request');
      }

      setResults((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, connectionState: 'CONNECTED' }
            : u
        )
      );
      onConnectionChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to accept request');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRequest = async (user: UserSearchResult) => {
    if (!user.connectionId) return;
    setActionLoadingId(user.id);
    setError(null);

    try {
      const res = await fetch(`/api/connections/${user.connectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT' }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to decline request');
      }

      setResults((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, connectionState: 'REJECTED' }
            : u
        )
      );
      onConnectionChanged?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to decline request');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by @username..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>
        <Button type="submit" variant="primary" disabled={loading} className="px-5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {error && (
        <div className="p-3 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-lg">
          {error}
        </div>
      )}

      {hasSearched && !loading && results.length === 0 && (
        <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
          No people found matching &ldquo;{searchTerm}&rdquo;
        </div>
      )}

      {results.length > 0 && (
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
          {results.map((user) => {
            const isActing = actionLoadingId === user.id;

            return (
              <div
                key={user.id}
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
                    <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      @{user.username}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {user.connectionState === 'CONNECTED' && (
                    <Badge variant="success" className="gap-1 py-1">
                      <UserCheck className="h-3 w-3" />
                      Connected
                    </Badge>
                  )}

                  {user.connectionState === 'OUTGOING_PENDING' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="warning" className="gap-1 py-1">
                        <Clock className="h-3 w-3" />
                        Request Sent
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isActing}
                        onClick={() => handleCancelRequest(user)}
                        className="text-xs text-zinc-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Cancel'}
                      </Button>
                    </div>
                  )}

                  {user.connectionState === 'INCOMING_PENDING' && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isActing}
                        onClick={() => handleAcceptRequest(user)}
                        className="gap-1 text-xs"
                      >
                        {isActing ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-3 w-3" />
                            Accept
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isActing}
                        onClick={() => handleDeclineRequest(user)}
                        className="gap-1 text-xs text-zinc-600 dark:text-zinc-400"
                      >
                        <X className="h-3 w-3" />
                        Decline
                      </Button>
                    </div>
                  )}

                  {user.connectionState === 'NO_CONNECTION' && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isActing}
                      onClick={() => handleConnect(targetUserToUser(user))}
                      className="gap-1.5 text-xs font-semibold"
                    >
                      {isActing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5" />
                          Connect
                        </>
                      )}
                    </Button>
                  )}

                  {user.connectionState === 'REJECTED' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-zinc-400">
                        Declined
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isActing}
                        onClick={() => handleConnect(targetUserToUser(user))}
                        className="gap-1 text-xs"
                      >
                        Re-connect
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function targetUserToUser(user: UserSearchResult): UserSearchResult {
  return user;
}
