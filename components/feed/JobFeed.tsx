'use client';

import { useEffect, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { JobCard, type JobSource } from './JobCard';
import { FeedFilters, DEFAULT_FILTERS } from './FeedFilters';
import type { FeedFilterState } from './FeedFilters';
import { Loader2, SearchX } from 'lucide-react';

export function JobFeed() {
  const [filters, setFilters] = useState<FeedFilterState>(DEFAULT_FILTERS);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Load all referral contacts once — used to show referral chips on cards
  const { data: allContacts = [] } = trpc.referrals.getAll.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  // Parse salary strings to numbers for the query
  const salaryMinNum = filters.salaryMin ? Number(filters.salaryMin) : undefined;
  const salaryMaxNum = filters.salaryMax ? Number(filters.salaryMax) : undefined;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.jobs.getFeed.useInfiniteQuery(
    {
      limit: 20,
      minWoroScore: filters.minWoroScore,
      remoteOnly: filters.remoteOnly,
      matchedOnly: filters.matchedOnly,
      techStack: filters.techStack,
      salaryMin: salaryMinNum,
      salaryMax: salaryMaxNum,
      currency: filters.currency || undefined,
      location: filters.location || undefined,
    },
    {
      getNextPageParam: (page) => page.nextCursor,
      initialCursor: undefined,
      refetchOnWindowFocus: false,
    }
  );

  // Infinite scroll sentinel
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
  const visibleItems = allItems.filter((m) => m.job !== null);

  return (
    <div className="space-y-4">
      <FeedFilters filters={filters} onChange={setFilters} />

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
          <p className="font-medium text-gray-500">No matches for these filters</p>
          <p className="mt-1 text-xs text-gray-400">
            Try relaxing a filter, or upload a resume and run the ingest cron to populate your feed.
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
            source={job.source as JobSource}
            externalId={job.externalId}
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
            applyUrl={job.applyUrl ?? null}
            postedAt={job.postedAt ?? null}
            referralContacts={allContacts.filter(
              (c) => c.company && job.company &&
                c.company.toLowerCase().includes(job.company.toLowerCase())
            )}
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
          {visibleItems.length} match{visibleItems.length !== 1 ? 'es' : ''} shown
        </p>
      )}
    </div>
  );
}
