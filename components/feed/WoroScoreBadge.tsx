/**
 * WoroScoreBadge — shared component used on:
 *   - Feed job cards
 *   - Tracker application cards
 *   - Analysis page
 *
 * Score null = unscored (async pending) → shows loading skeleton.
 * Score < 40 = red (suspicious)
 * Score 40–70 = amber (verify)
 * Score > 70 = green (looks legit)
 *
 * withTooltip=true renders a hover tooltip with the woro_signals breakdown.
 */

import { getWoroBadgeTier, WORO_BADGE_LABELS, WORO_BADGE_COLORS } from '@/types';
import type { WoroSignals } from '@/types';
import { cn } from '@/lib/utils';

interface WoroScoreBadgeProps {
  score: number | null;
  signals?: WoroSignals | null;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function WoroScoreBadge({
  score,
  signals,
  size = 'sm',
  showLabel = false,
  className,
}: WoroScoreBadgeProps) {
  // Unscored — async pending
  if (score === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium',
          'bg-gray-100 text-gray-400 border-gray-200 animate-pulse',
          size === 'md' ? 'text-sm' : 'text-xs',
          className
        )}
        title="Woro score calculating…"
      >
        <span className="w-3 h-3 rounded-full bg-gray-300" />
        {showLabel && <span>Scoring…</span>}
        {!showLabel && <span>—</span>}
      </span>
    );
  }

  const tier = getWoroBadgeTier(score);
  if (!tier) return null;

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium cursor-default',
        WORO_BADGE_COLORS[tier],
        size === 'md' ? 'text-sm' : 'text-xs',
        className
      )}
      title={signals?.explanation ?? WORO_BADGE_LABELS[tier]}
    >
      <WoroDot tier={tier} />
      <span className="font-bold">{score}</span>
      {showLabel && <span>{WORO_BADGE_LABELS[tier]}</span>}
    </span>
  );

  if (!signals) return badge;

  return (
    <div className="relative group inline-flex">
      {badge}
      {/* Tooltip */}
      <div className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover:block w-56">
        <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">Woro score: {score}</p>
          <div className="space-y-1">
            <ScoreRow label="Fake job" value={signals.fake_job_score} />
            <ScoreRow label="JD quality" value={signals.jd_quality_score} />
            <ScoreRow label="Company" value={signals.company_legitimacy_score} />
          </div>
          {signals.explanation && (
            <p className="mt-2 text-gray-300 leading-tight">{signals.explanation}</p>
          )}
          {signals.has_vague_language && (
            <p className="mt-1 text-amber-400 text-xs">⚠ Vague language detected</p>
          )}
          {signals.has_copy_paste_patterns && (
            <p className="mt-1 text-amber-400 text-xs">⚠ Copy-paste JD detected</p>
          )}
          {/* Arrow */}
          <div className="absolute top-full left-3 border-4 border-transparent border-t-gray-900" />
        </div>
      </div>
    </div>
  );
}

function WoroDot({ tier }: { tier: 'red' | 'amber' | 'green' }) {
  const colors = {
    red: 'bg-red-500',
    amber: 'bg-amber-500',
    green: 'bg-green-500',
  };
  return <span className={cn('w-2 h-2 rounded-full inline-block', colors[tier])} />;
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? 'text-green-400' : value >= 40 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={cn('font-medium', color)}>{value}</span>
    </div>
  );
}
