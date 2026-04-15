/**
 * LayoffCard — pulse item card for category=layoff.
 * Shows company, estimated headcount, date.
 * Cross-references job feed: "companies now hiring from this layoff."
 */

import type { PulseItem } from '@/types';
import { relativeTime } from '@/lib/utils';

interface LayoffCardProps {
  item: PulseItem;
  hiringFromLayoff?: boolean; // cross-ref with job feed
  onDismiss?: (id: string) => void;
  onSave?: (id: string) => void;
}

export function LayoffCard({ item, hiringFromLayoff, onDismiss, onSave }: LayoffCardProps) {
  const summary = item.summary_ai ?? item.summary_raw;

  return (
    <article className="bg-white rounded-xl border border-red-100 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              Layoff
            </span>
            {hiringFromLayoff && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                Companies hiring from this layoff
              </span>
            )}
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 line-clamp-2"
          >
            {item.title}
          </a>

          {item.company && (
            <p className="text-xs text-gray-500 mt-0.5">
              {item.company}
              {item.published_at && (
                <> · {relativeTime(item.published_at)}</>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-none">
          {onSave && (
            <button onClick={() => onSave(item.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="Save">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}
          {onDismiss && (
            <button onClick={() => onDismiss(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded" title="Dismiss">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {summary && (
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">
          {item.summary_ai ? (
            <>
              {summary}
              <span className="ml-1 text-xs bg-violet-100 text-violet-600 px-1 py-0.5 rounded align-middle">AI</span>
            </>
          ) : summary}
        </p>
      )}

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
