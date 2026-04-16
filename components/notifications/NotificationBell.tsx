'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc/client';
import Link from 'next/link';

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const { data, refetch } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: false,
    refetchOnWindowFocus: true,
  });

  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:user:${userId}`)
      .on('broadcast', { event: 'new_notification' }, () => {
        void refetch();
        setAnimating(true);
        setTimeout(() => setAnimating(false), 600);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, refetch]);

  const count = data?.count ?? 0;

  return (
    <Link
      href="/dashboard/notifications"
      className="relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
      aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
    >
      <span className={`text-xs transition-transform ${animating ? 'scale-125' : ''}`}>◎</span>
      Notifications
      {count > 0 && (
        <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none px-1">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
