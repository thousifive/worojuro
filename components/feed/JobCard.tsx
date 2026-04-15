'use client';

import { Bookmark, X, MapPin, Wifi, Building2, ExternalLink } from 'lucide-react';
import { WoroScoreBadge } from './WoroScoreBadge';
import { trpc } from '@/lib/trpc/client';
import type { WoroSignals } from '@/types';

interface JobCardProps {
  matchId: string;
  jobId: string;
  title: string;
  company: string;
  location: string | null;
  remoteType: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  techStack: string[];
  woroScore: number | null;
  woroSignals: WoroSignals | null;
  matchScore: number;
  isSaved: boolean;
  postedAt: string | Date | null;
  onDismiss?: (jobId: string) => void;
  onSave?: (jobId: string) => void;
}

export function JobCard({
  jobId,
  title,
  company,
  location,
  remoteType,
  salaryMin,
  salaryMax,
  salaryCurrency,
  techStack,
  woroScore,
  woroSignals,
  matchScore,
  isSaved,
  postedAt,
  onDismiss,
  onSave,
}: JobCardProps) {
  const utils = trpc.useUtils();

  const dismissMutation = trpc.jobs.dismissJob.useMutation({
    onSuccess: () => {
      utils.jobs.getFeed.invalidate();
      onDismiss?.(jobId);
    },
  });

  const saveMutation = trpc.jobs.saveJob.useMutation({
    onSuccess: () => {
      utils.jobs.getFeed.invalidate();
      onSave?.(jobId);
    },
  });

  const salaryLabel = salaryMin
    ? `${salaryCurrency ?? 'USD'} ${(salaryMin / 1000).toFixed(0)}k${salaryMax ? `–${(salaryMax / 1000).toFixed(0)}k` : '+'}`
    : null;

  const postedLabel = postedAt
    ? new Date(postedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
            {isSaved && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-medium flex-none">
                Saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Building2 size={11} />
              {company}
            </span>

            {remoteType === 'remote' ? (
              <span className="flex items-center gap-1 text-green-600">
                <Wifi size={11} />
                Remote
              </span>
            ) : location ? (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {location}
              </span>
            ) : null}

            {salaryLabel && <span className="text-gray-600 font-medium">{salaryLabel}</span>}
            {postedLabel && <span className="text-gray-400">{postedLabel}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-none">
          {/* Match score */}
          <span
            className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"
            title="Resume match score"
          >
            {matchScore}% match
          </span>

          {/* Woro score badge */}
          <WoroScoreBadge score={woroScore} signals={woroSignals} />
        </div>
      </div>

      {/* Tech stack chips */}
      {techStack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {techStack.slice(0, 6).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-50 text-gray-600 border border-gray-100 px-2 py-0.5 rounded-md"
            >
              {tag}
            </span>
          ))}
          {techStack.length > 6 && (
            <span className="text-xs text-gray-400">+{techStack.length - 6} more</span>
          )}
        </div>
      )}

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => saveMutation.mutate({ jobId })}
          disabled={isSaved || saveMutation.isPending}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 transition-colors"
        >
          <Bookmark size={12} className={isSaved ? 'fill-indigo-500 text-indigo-500' : ''} />
          {isSaved ? 'Saved' : 'Save'}
        </button>

        <button
          onClick={() => dismissMutation.mutate({ jobId })}
          disabled={dismissMutation.isPending}
          className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-500 disabled:opacity-40 transition-colors"
        >
          <X size={12} />
          Dismiss
        </button>

        <span className="flex-1" />

        <a
          href={`https://www.google.com/search?q=${encodeURIComponent(`${title} ${company} job`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <ExternalLink size={11} />
          Search
        </a>
      </div>
    </div>
  );
}
