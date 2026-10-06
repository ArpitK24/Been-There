'use client';

import React, { useState } from 'react';
import { PlaceSearchResult } from '@/lib/types';
import { PlaceCard } from './PlaceCard';
import { Search, MapPin, Loader2 } from 'lucide-react';

export function PlaceSearchInput() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/places/search?q=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data = await responseToJson(res);
        setResults(data.places || []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  async function responseToJson(res: Response) {
    return res.json();
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSearch} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 h-5 w-5 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search restaurants, cafes, breweries, places..."
            className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-12 pr-28 py-4 text-base shadow-lg shadow-zinc-200/50 dark:shadow-none focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching</span>
              </>
            ) : (
              <span>Search</span>
            )}
          </button>
        </div>
      </form>

      {/* Suggested Quick Searches */}
      {!hasSearched && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Try searching:</span>
          {['Coffee', 'Brewery', 'Dessert', 'Indiranagar'].map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => {
                setQuery(term);
              }}
              className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* Results Section */}
      <div className="mt-8">
        {isLoading && (
          <div className="text-center py-10 text-zinc-500 text-sm flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            <span>Finding places...</span>
          </div>
        )}

        {!isLoading && hasSearched && results.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-500 px-1">
              <span>Matching places</span>
              <span>{results.length} found</span>
            </div>
            <div className="grid gap-3">
              {results.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="text-center py-12 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
            <MapPin className="h-8 w-8 mx-auto text-zinc-400 mb-2" />
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              No places found for &ldquo;{query}&rdquo;
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Try searching for &ldquo;Coffee&rdquo; or &ldquo;Toit&rdquo;
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
