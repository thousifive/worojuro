/**
 * Realtime service — broadcasts notifications via Supabase Realtime.
 *
 * Channel: notifications:user:[userId]
 * Client subscribes in the notification bell component.
 * Server broadcasts on INSERT into notifications table.
 *
 * Note: Supabase Realtime broadcasts on DB changes automatically when
 * the table has realtime enabled. This module is for server-side
 * programmatic broadcasts if needed (e.g., pushing custom events).
 */

import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function broadcastNotification(
  userId: string,
  payload: {
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const supabase = getServiceClient();
    const channel = supabase.channel(`notifications:user:${userId}`);

    await channel.send({
      type: 'broadcast',
      event: 'new_notification',
      payload,
    });

    await supabase.removeChannel(channel);
  } catch (err) {
    console.error('[realtime] Broadcast failed for user', userId, err);
    // Never rethrow — realtime failure should not affect DB writes
  }
}

export function getNotificationChannelName(userId: string): string {
  return `notifications:user:${userId}`;
}
