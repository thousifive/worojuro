/**
 * users — extends Supabase auth.users (same UUID).
 * market_signals — per-user AI market analysis outputs.
 *
 * RLS policies:
 *   CREATE POLICY "user reads own row" ON users
 *     FOR SELECT USING (id = auth.uid());
 *   CREATE POLICY "user updates own row" ON users
 *     FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
 *
 *   CREATE POLICY "user owns market_signals" ON market_signals
 *     USING (user_id = auth.uid())
 *     WITH CHECK (user_id = auth.uid());
 */

import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import type { UserPreferences } from '@/types';

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // FK to auth.users — same UUID
  email: text('email').notNull(),
  fullName: text('full_name'),
  resumeParsedAt: timestamp('resume_parsed_at', { withTimezone: true }),
  preferences: jsonb('preferences')
    .$type<UserPreferences>()
    .notNull()
    .default({
      skills: [],
      tech_stack: [],
      locations: [],
      remote_pref: 'remote',
      salary_min: 0,
      salary_currency: 'USD',
      notify_instant_threshold: 80,
      notify_digest_frequency: 'daily',
      favorite_companies: [],
      hide_woro_below: 30,
    }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const marketSignals = pgTable('market_signals', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  signalType: text('signal_type')
    .$type<'switch_now' | 'wait' | 'market_hot' | 'market_cold'>()
    .notNull(),
  analysis: text('analysis').notNull(),
  dataSnapshot: jsonb('data_snapshot').$type<Record<string, unknown>>().notNull(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
});
