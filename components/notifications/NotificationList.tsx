'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';

const TYPE_ICONS: Record<string, string> = {
  new_match: '◉',
  woro_alert: '⚠',
  status_reminder: '◎',
  market_signal: '◆',
  next_action: '⊞',
  fake_job_alert: '⊗',
  digest: '◇',
  pulse_alert: '◇',
};

const TYPE_COLORS: Record<string, string> = {
  woro_alert: 'text-red-500',
  new_match: 'text-blue-500',
  market_signal: 'text-purple-500',
  next_action: 'text-amber-500',
};

function timeAgo(date: Date | string): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationList() {
  const utils = trpc.useUtils();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.notifications.getAll.useInfiniteQuery(
      { limit: 20 },
      { getNextPageParam: (page) => page.nextCursor }
    );

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      void utils.notifications.getAll.invalidate();
      void utils.notifications.getUnreadCount.invalidate();
    },
  });

  const [markingAll, setMarkingAll] = useState(false);

  const allItems = data?.pages.flatMap((p) => p.items) ?? [];
  const hasUnread = allItems.some((n) => !n.isRead);

  async function handleMarkAll() {
    setMarkingAll(true);
    await markRead.mutateAsync({});
    setMarkingAll(false);
  }

  return (
    <div>
      {hasUnread && (
        <div className="flex justify-end mb-3">
          <button
            onClick={handleMarkAll}
            disabled={markingAll}
            className="text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            {markingAll ? 'Marking…' : 'Mark all as read'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {allItems.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400">
            No notifications yet
          </div>
        )}

        {allItems.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              if (!n.isRead) markRead.mutate({ id: n.id });
            }}
            className={`w-full flex gap-3 p-4 text-left transition-colors hover:bg-gray-50 ${
              !n.isRead ? 'bg-blue-50' : ''
            }`}
          >
            <div className="flex-none flex items-start gap-2 pt-0.5">
              <div
                className={`w-2 h-2 rounded-full mt-1.5 flex-none ${
                  !n.isRead ? 'bg-blue-500' : 'bg-transparent'
                }`}
              />
              <span className={`text-sm ${TYPE_COLORS[n.type] ?? 'text-gray-400'}`}>
                {TYPE_ICONS[n.type] ?? '◎'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 leading-snug">{n.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
              <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
            </div>
          </button>
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-4 text-center">
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
