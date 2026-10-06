import React from 'react';
import Link from 'next/link';
import { PlaceSearchResult } from '@/lib/types';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlaceCardProps {
  place: PlaceSearchResult;
  connectionCount?: number;
}

export function PlaceCard({ place, connectionCount }: PlaceCardProps) {
  return (
    <Link href={`/places/${place.id}`} className="block group">
      <Card className="transition-all hover:border-emerald-500 hover:shadow-md">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="group-hover:text-emerald-600 transition-colors">
              {place.name}
            </CardTitle>
            <CardDescription className="mt-1">{place.address}</CardDescription>
          </div>
          <Badge variant="outline">{place.category}</Badge>
        </div>

        {typeof connectionCount === 'number' && (
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-semibold text-emerald-600 mr-1.5">
              {connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
            </span>
            <span>have been here</span>
          </div>
        )}
      </Card>
    </Link>
  );
}
