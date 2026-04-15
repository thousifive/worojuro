/**
 * pgvector custom type + job_matches table.
 *
 * The `vector` export is used by jobs.ts and resumes.ts for embedding columns.
 * First migration must run: CREATE EXTENSION IF NOT EXISTS vector;
 */

import { customType, pgTable, uuid, integer, boolean, jsonb, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { jobs } from './jobs';
import { users } from './users';
import type { MatchBreakdown } from '@/types';

// ── pgvector custom type ───────────────────────────────────────────────────────

// Dimensions: 768 = Ollama nomic-embed-text (current)
//             1536 = OpenAI text-embedding-3-small (future — needs migration)
// To migrate: ALTER TABLE jobs ALTER COLUMN embedding TYPE vector(1536);
//             ALTER TABLE resumes ALTER COLUMN embedding TYPE vector(1536);
export const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    return `vector(${config?.dimensions ?? 768})`;
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(',').map(Number);
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
});

// ── job_matches ────────────────────────────────────────────────────────────────
// RLS policies:
//   CREATE POLICY "user owns row" ON job_matches
//     USING (user_id = auth.uid())
//     WITH CHECK (user_id = auth.uid());

export const jobMatches = pgTable(
  'job_matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    matchScore: integer('match_score').notNull(), // 0–100
    matchBreakdown: jsonb('match_breakdown').$type<MatchBreakdown>().notNull(),
    isDismissed: boolean('is_dismissed').notNull().default(false),
    isSaved: boolean('is_saved').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('job_matches_user_score_idx').on(t.userId, t.matchScore.desc()),
    unique('job_matches_user_job_uq').on(t.userId, t.jobId),
  ]
);
