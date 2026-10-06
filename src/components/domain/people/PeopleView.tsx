'use client';

import React, { useState, useCallback } from 'react';
import { ConnectionWithUser, IncomingConnectionRequest } from '@/lib/types';
import { PeopleSearch } from './PeopleSearch';
import { ConnectionRequests } from './ConnectionRequests';
import { MyPeopleList } from './MyPeopleList';
import { Users, UserPlus, Inbox, Loader2, ShieldCheck } from 'lucide-react';

interface PeopleViewProps {
  initialTab?: 'people' | 'requests' | 'search';
  initialConnections?: ConnectionWithUser[];
  initialRequests?: IncomingConnectionRequest[];
}

export function PeopleView({
  initialTab = 'people',
  initialConnections = [],
  initialRequests = [],
}: PeopleViewProps) {
  const [activeTab, setActiveTab] = useState<'people' | 'requests' | 'search'>(initialTab);
  const [connections, setConnections] = useState<ConnectionWithUser[]>(initialConnections);
  const [requests, setRequests] = useState<IncomingConnectionRequest[]>(initialRequests);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [connectionsRes, requestsRes] = await Promise.all([
        fetch('/api/connections'),
        fetch('/api/connections/requests'),
      ]);

      if (connectionsRes.ok) {
        const data = await connectionsRes.json();
        setConnections(data.connections || []);
      }

      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.incoming || data.requests || []);
      }
    } catch (err) {
      console.error('Error loading people data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            Your People
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            People whose repeat visits and honest experiences you trust. Never public followers.
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200/50 dark:border-emerald-800/40 shrink-0 self-start sm:self-auto">
          <ShieldCheck className="h-3.5 w-3.5" />
          Explicit Trust Only
        </div>
      </div>

      {/* Pending Incoming Requests Banner (if not on requests tab) */}
      {requests.length > 0 && activeTab !== 'requests' && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Inbox className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-200">
              You have <strong>{requests.length}</strong> incoming connection request{requests.length > 1 ? 's' : ''}.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('requests')}
            className="text-xs font-semibold text-amber-700 dark:text-amber-300 underline hover:no-underline cursor-pointer"
          >
            Review requests
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2">
        <button
          onClick={() => setActiveTab('people')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'people'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>My People</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {connections.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'requests'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Inbox className="h-4 w-4" />
          <span>Requests</span>
          {requests.length > 0 && (
            <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold">
              {requests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === 'search'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          <span>Find People</span>
        </button>
      </div>

      {/* Tab Panels */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Loading circle...</span>
        </div>
      ) : (
        <div className="pt-2">
          {activeTab === 'people' && (
            <MyPeopleList connections={connections} onChanged={loadData} />
          )}

          {activeTab === 'requests' && (
            <ConnectionRequests requests={requests} onChanged={loadData} />
          )}

          {activeTab === 'search' && (
            <PeopleSearch onConnectionChanged={loadData} />
          )}
        </div>
      )}
    </div>
  );
}
