'use client';

import { useState } from 'react';
import { Bookmark, X, MapPin, Wifi, Building2, ExternalLink, CheckCircle2, Users } from 'lucide-react';
import { WoroScoreBadge } from './WoroScoreBadge';
import { trpc } from '@/lib/trpc/client';
import type { WoroSignals } from '@/types';

interface ReferralContact {
  id: string;
  fullName: string;
  role: string | null;
}

export type JobSource = 'remotive' | 'jobicy' | 'remoteok' | 'adzuna' | 'hn' | 'linkedin' | 'himalayas';

/** Construct the job listing URL from source + externalId when apply_url is null. */
function sourceListingUrl(source: JobSource, externalId: string): string {
  switch (source) {
    case 'remotive':
      return `https://remotive.com/remote-jobs/software-dev/${externalId}`;
    case 'jobicy':
      return `https://jobicy.com/jobs/${externalId}`;
    case 'remoteok':
      return `https://remoteok.com/remote-jobs/${externalId}`;
    case 'hn':
      return `https://news.ycombinator.com/item?id=${externalId}`;
    case 'himalayas':
      // externalId is the guid slug e.g. "stripe-senior-engineer-abc123"
      return `https://himalayas.app/jobs/${externalId}`;
    case 'adzuna': {
      // externalId is "country-id", e.g. "us-12345"
      const [country, ...rest] = externalId.split('-');
      const id = rest.join('-');
      return `https://www.adzuna.com/details/${id}?country=${country ?? 'us'}`;
    }
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(`${externalId} job apply`)}`;
  }
}

interface JobCardProps {
  matchId: string;
  jobId: string;
  source: JobSource;
  externalId: string;
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
  applyUrl: string | null;
  postedAt: string | Date | null;
  referralContacts?: ReferralContact[];
  onDismiss?: (jobId: string) => void;
  onSave?: (jobId: string) => void;
}

export function JobCard({
  jobId,
  source,
  externalId,
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
  applyUrl,
  postedAt,
  referralContacts = [],
  onDismiss,
  onSave,
}: JobCardProps) {
  const utils = trpc.useUtils();
  const [applied, setApplied] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(false);

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

  const confirmApplyMutation = trpc.tracker.applyToJob.useMutation({
    onSuccess: () => {
      setApplied(true);
      setPendingConfirm(false);
    },
  });

  function handleApplyClick() {
    const url = applyUrl ?? sourceListingUrl(source, externalId);
    window.open(url, '_blank', 'noopener,noreferrer');
    setPendingConfirm(true);
    // Auto-clear after 5 min in case user abandons without answering
    setTimeout(() => setPendingConfirm(false), 5 * 60 * 1000);
  }

  const salaryLabel = salaryMin
    ? `${salaryCurrency ?? 'USD'} ${(salaryMin / 1000).toFixed(0)}k${salaryMax ? `–${(salaryMax / 1000).toFixed(0)}k` : '+'}`
    : null;

  const postedLabel = (() => {
    if (!postedAt) return null;
    const ms = Date.now() - new Date(postedAt).getTime();
    const hours = Math.floor(ms / 3_600_000);
    if (hours < 1) return 'Just posted';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1mo ago' : `${months}mo ago`;
  })();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-200 transition-colors group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
            {applied && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium flex-none flex items-center gap-1">
                <CheckCircle2 size={10} />
                Applied
              </span>
            )}
            {isSaved && !applied && (
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

            {remoteType === 'remote' && (
              <span className="flex items-center gap-1 text-green-600">
                <Wifi size={11} />
                Remote
              </span>
            )}

            {location && (
              <span className="flex items-center gap-1">
                <MapPin size={11} />
                {location}
              </span>
            )}

            {salaryLabel && <span className="text-gray-600 font-medium">{salaryLabel}</span>}
            {postedLabel && (
              <span className="text-gray-400 ml-auto">{postedLabel}</span>
            )}
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

      {/* Referral chips */}
      {referralContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {referralContacts.slice(0, 3).map((c) => (
            <span
              key={c.id}
              title={c.role ?? undefined}
              className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full"
            >
              <Users size={9} />
              {c.fullName}
            </span>
          ))}
          {referralContacts.length > 3 && (
            <span className="text-xs text-purple-400">+{referralContacts.length - 3} more</span>
          )}
        </div>
      )}

      {/* Confirm prompt — shown after Apply click, before user confirms */}
      {pendingConfirm && (
        <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-xs text-amber-800 font-medium flex-1">
            Did you apply?
          </span>
          <button
            onClick={() => confirmApplyMutation.mutate({ jobId })}
            disabled={confirmApplyMutation.isPending}
            className="text-xs px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 font-medium transition-colors"
          >
            {confirmApplyMutation.isPending ? 'Saving…' : 'Yes, I applied'}
          </button>
          <button
            onClick={() => setPendingConfirm(false)}
            className="text-xs px-2.5 py-1 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors"
          >
            No
          </button>
        </div>
      )}

      {/* Actions — visible on hover, hidden while confirm prompt is showing */}
      {!pendingConfirm && (
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

          {applied ? (
            <span className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-green-100 text-green-700 border border-green-200 font-medium">
              <CheckCircle2 size={11} />
              Applied ✓
            </span>
          ) : (
            <button
              onClick={handleApplyClick}
              className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium transition-colors"
            >
              <ExternalLink size={11} />
              Apply
            </button>
          )}
        </div>
      )}
    </div>
  );
}
