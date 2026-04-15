/**
 * PulseCard — generic pulse item card for tech_update and market_change categories.
 * LayoffCard and FundingCard extend this with category-specific UI.
 */

import type { PulseItem } from '@/types';
import { relativeTime, truncate } from '@/lib/utils';

interface PulseCardProps {
  item: PulseItem;
  onDismiss?: (id: string) => void;
  onSave?: (id: string) => void;
}

export function PulseCard({ item, onDismiss, onSave }: PulseCardProps) {
  const summary = item.summary_ai ?? item.summary_raw;
  const isAiSummary = Boolean(item.summary_ai);

  return (
    <article className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
          >
            {item.title}
          </a>

          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400 capitalize">
              {item.source.replace('_', ' ')}
            </span>
            {item.published_at && (
              <>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-gray-400">
                  {relativeTime(item.published_at)}
                </span>
              </>
            )}
            {isAiSummary && (
              <>
                <span className="text-gray-200">·</span>
                <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded font-medium">
                  AI
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-none">
          {onSave && (
            <button
              onClick={() => onSave(item.id)}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
              title="Save"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}
          {onDismiss && (
            <button
              onClick={() => onDismiss(item.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 rounded"
              title="Dismiss"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {summary && (
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">
          {truncate(summary, 200)}
        </p>
      )}

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
