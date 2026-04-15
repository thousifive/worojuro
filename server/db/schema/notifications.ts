/**
 * notifications — in-app + email notification records.
 *
 * Realtime channel: notifications:user:[userId]
 * Supabase Realtime broadcasts INSERT events on this table filtered by user_id.
 *
 * RLS policies:
 *   CREATE POLICY "user owns row" ON notifications
 *     USING (user_id = auth.uid())
 *     WITH CHECK (user_id = auth.uid());
 *
 * Indexes:
 *   CREATE INDEX notifications_user_read_created_idx
 *     ON notifications (user_id, is_read, created_at DESC);
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type')
      .$type<
        | 'new_match'
        | 'status_reminder'
        | 'market_signal'
        | 'fake_job_alert'
        | 'digest'
        | 'pulse_alert'
        | 'woro_alert'
        | 'next_action'
      >()
      .notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('notifications_user_read_created_idx').on(
      t.userId,
      t.isRead,
      t.createdAt.desc()
    ),
  ]
);
