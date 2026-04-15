'use client';

import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { JobCard } from './JobCard';
import { Loader2, SearchX } from 'lucide-react';

export function JobFeed() {
  const [minWoroScore, setMinWoroScore] = useState(30);
  const [filterRemote, setFilterRemote] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.jobs.getFeed.useInfiniteQuery(
    {
      limit: 20,
      minWoroScore,
      remoteOnly: filterRemote,
    },
    {
      getNextPageParam: (page) => page.nextCursor,
      initialCursor: undefined,
      refetchOnWindowFocus: false,
    }
  );

  // Infinite scroll — IntersectionObserver on sentinel div
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];
  // Filter out matches with null job (job deleted or filtered by woro score condition)
  const visibleItems = allItems.filter((m) => m.job !== null);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 pb-2">
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={filterRemote}
            onChange={(e) => setFilterRemote(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          Remote only
        </label>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>Hide Woro &lt;</span>
          <select
            value={minWoroScore}
            onChange={(e) => setMinWoroScore(Number(e.target.value))}
            className="text-xs border-gray-200 rounded px-1.5 py-0.5 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value={0}>0 (show all)</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
            <option value={70}>70</option>
          </select>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-200 rounded-full" />
                  <div className="h-6 w-12 bg-gray-200 rounded-full" />
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <div className="h-5 w-20 bg-gray-100 rounded" />
                <div className="h-5 w-16 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && visibleItems.length === 0 && (
        <div className="text-center py-16 text-sm text-gray-400">
          <SearchX className="mx-auto mb-3 text-gray-300" size={36} />
          <p className="font-medium text-gray-500">No matches yet</p>
          <p className="mt-1 text-xs text-gray-400">
            Upload a resume and run the ingest cron to populate your feed.
          </p>
        </div>
      )}

      {/* Job cards */}
      {visibleItems.map((match) => {
        const job = match.job!;
        return (
          <JobCard
            key={match.id}
            matchId={match.id}
            jobId={match.jobId}
            title={job.title}
            company={job.company}
            location={job.location ?? null}
            remoteType={job.remoteType ?? null}
            salaryMin={job.salaryMin ?? null}
            salaryMax={job.salaryMax ?? null}
            salaryCurrency={job.salaryCurrency ?? null}
            techStack={job.techStack ?? []}
            woroScore={job.woroScore ?? null}
            woroSignals={(job.woroSignals as import('@/types').WoroSignals) ?? null}
            matchScore={match.matchScore}
            isSaved={match.isSaved}
            postedAt={job.postedAt ?? null}
          />
        );
      })}

      {/* Infinite scroll sentinel */}
      <div ref={loadMoreRef} className="h-4" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-4">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      )}

      {!isLoading && !hasNextPage && visibleItems.length > 0 && (
        <p className="text-center text-xs text-gray-400 py-4">
          You&apos;ve seen all {visibleItems.length} matches
        </p>
      )}
    </div>
  );
}
