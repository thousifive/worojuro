/**
 * resumes — stored in Supabase Storage; parsed + embedded here.
 *
 * RLS policies:
 *   CREATE POLICY "user owns row" ON resumes
 *     USING (user_id = auth.uid())
 *     WITH CHECK (user_id = auth.uid());
 *
 * Rule: never re-embed a resume that already has an embedding stored.
 *   Check: WHERE id = ? AND embedding IS NOT NULL
 *   If row exists with embedding, skip OpenAI call entirely.
 */

import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import { vector } from './embeddings';
import { users } from './users';

export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  storagePath: text('storage_path').notNull(), // Supabase Storage path
  parsedSkills: text('parsed_skills').array().notNull().default([]),
  parsedExperience: jsonb('parsed_experience')
    .$type<
      Array<{
        company: string;
        role: string;
        start_date: string;
        end_date: string | null;
        description: string;
      }>
    >()
    .notNull()
    .default([]),
  parsedEducation: jsonb('parsed_education')
    .$type<
      Array<{
        institution: string;
        degree: string;
        field: string;
        year: number | null;
      }>
    >()
    .notNull()
    .default([]),
  rawText: text('raw_text'),
  embedding: vector('embedding', { dimensions: 768 }), // null=unembedded; 768=Ollama; 1536=OpenAI (needs migration)
  isActive: boolean('is_active').notNull().default(true),
  versionLabel: text('version_label'), // e.g. "ML Engineer v2"
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
