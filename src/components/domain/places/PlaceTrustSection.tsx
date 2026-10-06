import React from 'react';
import { PlaceTrustSummary } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlaceTrustSectionProps {
  summary: PlaceTrustSummary;
}

export function PlaceTrustSection({ summary }: PlaceTrustSectionProps) {
  const {
    connectionCount,
    totalVisits,
    recommendationCounts,
    repeatVisitorCount,
    recentActivities,
  } = summary;

  if (connectionCount === 0) {
    return (
      <Card className="bg-zinc-50 dark:bg-zinc-900/50 border-dashed">
        <CardHeader>
          <CardTitle className="text-base text-zinc-700 dark:text-zinc-300">
            No connections have been here yet
          </CardTitle>
          <CardDescription>
            Be the first person in your circle to log an experience and help your friends decide!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>Your people have been here</span>
          </CardTitle>
          <Badge variant="success">
            {connectionCount} {connectionCount === 1 ? 'connection' : 'connections'}
          </Badge>
        </div>
        <CardDescription>
          Real experiences from people you trust, evaluated before anonymous reviews.
        </CardDescription>
      </CardHeader>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="rounded-lg bg-white dark:bg-zinc-800 p-3 text-center border border-zinc-100 dark:border-zinc-700">
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalVisits}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Combined visits</div>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-800 p-3 text-center border border-zinc-100 dark:border-zinc-700">
          <div className="text-2xl font-bold text-emerald-600">{recommendationCounts.recommend}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Recommend</div>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-800 p-3 text-center border border-zinc-100 dark:border-zinc-700">
          <div className="text-2xl font-bold text-amber-600">{recommendationCounts.neutral}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Neutral</div>
        </div>
        <div className="rounded-lg bg-white dark:bg-zinc-800 p-3 text-center border border-zinc-100 dark:border-zinc-700">
          <div className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">{repeatVisitorCount}</div>
          <div className="text-xs text-zinc-500 mt-0.5">Repeat visitors</div>
        </div>
      </div>

      {/* Activity Evidence List */}
      <div className="mt-5 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Trusted Activity Evidence
        </h4>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {recentActivities.map((item, idx) => (
            <div key={`${item.userId}-${idx}`} className="py-3 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                    {item.displayName}
                  </span>
                  {item.isRepeatVisitor && (
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                      {item.visitCount} visits (Regular)
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  Action: <span className="capitalize">{item.activityType}</span>
                  {item.activityDate ? ` • ${item.activityDate}` : ''}
                </div>
              </div>
              <Badge
                variant={
                  item.recommendation === 'RECOMMEND'
                    ? 'success'
                    : item.recommendation === 'NEUTRAL'
                    ? 'warning'
                    : 'danger'
                }
              >
                {item.recommendation === 'RECOMMEND'
                  ? 'Recommends'
                  : item.recommendation === 'NEUTRAL'
                  ? 'Neutral'
                  : 'Does not recommend'}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
