/**
 * pulse_items — global market intelligence feed items. Not user-owned.
 * pulse_interactions — per-user dismiss/save/share actions.
 *
 * RLS policies — pulse_items:
 *   CREATE POLICY "authenticated read" ON pulse_items
 *     FOR SELECT USING (auth.role() = 'authenticated');
 *   -- INSERT/UPDATE via service role only (cron ingestion)
 *
 * RLS policies — pulse_interactions:
 *   CREATE POLICY "user owns row" ON pulse_interactions
 *     USING (user_id = auth.uid())
 *     WITH CHECK (user_id = auth.uid());
 *
 * Indexes:
 *   CREATE INDEX pulse_items_category_published_idx
 *     ON pulse_items (category, published_at DESC);
 *   CREATE INDEX pulse_items_tags_gin_idx
 *     ON pulse_items USING GIN (tags);
 *   CREATE UNIQUE INDEX pulse_items_source_external_id_uq
 *     ON pulse_items (source, external_id);
 *   CREATE INDEX pulse_interactions_user_action_idx
 *     ON pulse_interactions (user_id, action);
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const pulseItems = pgTable(
  'pulse_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: text('source')
      .$type<
        | 'hn'
        | 'devto'
        | 'github_trending'
        | 'layoffs_fyi'
        | 'techcrunch_rss'
        | 'reddit'
        | 'crunchbase_rss'
        | 'sec_edgar'
      >()
      .notNull(),
    externalId: text('external_id').notNull(),
    category: text('category')
      .$type<'tech_update' | 'layoff' | 'market_change' | 'funding' | 'ipo'>()
      .notNull(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    summaryRaw: text('summary_raw').notNull(),
    summaryAi: text('summary_ai'), // null = async AI summary pending
    company: text('company'),
    tags: text('tags').array().notNull().default([]),
    relevanceScore: integer('relevance_score').notNull().default(50),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('pulse_items_source_external_id_uq').on(t.source, t.externalId),
    index('pulse_items_category_published_idx').on(t.category, t.publishedAt.desc()),
  ]
);

export const pulseInteractions = pgTable(
  'pulse_interactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    pulseItemId: uuid('pulse_item_id')
      .notNull()
      .references(() => pulseItems.id, { onDelete: 'cascade' }),
    action: text('action')
      .$type<'dismissed' | 'saved' | 'shared'>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('pulse_interactions_user_item_uq').on(t.userId, t.pulseItemId),
    index('pulse_interactions_user_action_idx').on(t.userId, t.action),
  ]
);
