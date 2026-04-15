/**
 * jobs — global table, not user-owned.
 *
 * RLS policies:
 *   CREATE POLICY "authenticated read" ON jobs
 *     FOR SELECT USING (auth.role() = 'authenticated');
 *   -- INSERT/UPDATE via service role only (cron routes + ingestion service)
 *   -- No INSERT/UPDATE policy for authenticated role.
 *
 * Indexes (generate in migration after table creation):
 *   CREATE INDEX jobs_tech_stack_gin_idx ON jobs USING GIN (tech_stack);
 *   CREATE INDEX jobs_posted_at_idx ON jobs (posted_at DESC);
 *   CREATE UNIQUE INDEX jobs_source_external_id_uq ON jobs (source, external_id);
 *   CREATE INDEX jobs_woro_score_idx ON jobs (woro_score);
 *   -- ivfflat index (run AFTER bulk insert / when table has data):
 *   CREATE INDEX jobs_embedding_ivfflat_idx ON jobs
 *     USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { vector } from './embeddings';
import type { WoroSignals } from '@/types';

export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: text('source')
      .$type<'remotive' | 'jobicy' | 'remoteok' | 'adzuna' | 'hn' | 'linkedin'>()
      .notNull(),
    externalId: text('external_id').notNull(),
    title: text('title').notNull(),
    company: text('company').notNull(),
    companyDomain: text('company_domain'),
    location: text('location'),
    remoteType: text('remote_type').$type<'remote' | 'hybrid' | 'onsite'>(),
    salaryMin: integer('salary_min'),
    salaryMax: integer('salary_max'),
    salaryCurrency: text('salary_currency'),
    techStack: text('tech_stack').array().notNull().default([]),
    perks: text('perks').array().notNull().default([]),
    descriptionRaw: text('description_raw').notNull(),
    descriptionCleaned: text('description_cleaned'),
    embedding: vector('embedding', { dimensions: 768 }), // 768=Ollama; 1536=OpenAI (needs migration)
    postedAt: timestamp('posted_at', { withTimezone: true }),
    ingestedAt: timestamp('ingested_at', { withTimezone: true }).notNull().defaultNow(),
    isActive: boolean('is_active').notNull().default(true),
    woroScore: integer('woro_score'),       // 0–100, null = unscored
    woroSignals: jsonb('woro_signals').$type<WoroSignals>(),
  },
  (t) => [
    unique('jobs_source_external_id_uq').on(t.source, t.externalId),
    index('jobs_posted_at_idx').on(t.postedAt.desc()),
    index('jobs_woro_score_idx').on(t.woroScore),
  ]
);
