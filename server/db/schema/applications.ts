/**
 * applications — Kanban tracker. One row per job the user is tracking.
 *
 * RLS policies:
 *   CREATE POLICY "user owns row" ON applications
 *     USING (user_id = auth.uid())
 *     WITH CHECK (user_id = auth.uid());
 *
 * Indexes:
 *   CREATE INDEX applications_user_status_date_idx
 *     ON applications (user_id, status, next_action_date);
 */

import {
  pgTable,
  uuid,
  text,
  integer,
  date,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { jobs } from './jobs';
import { referralContacts } from './referrals';

export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
    company: text('company').notNull(),
    role: text('role').notNull(),
    jdUrl: text('jd_url'),
    status: text('status')
      .$type<
        | 'saved'
        | 'applied'
        | 'oa'
        | 'phone'
        | 'interview'
        | 'offer'
        | 'rejected'
        | 'ghosted'
      >()
      .notNull()
      .default('saved'),
    appliedDate: date('applied_date'),
    salaryOffered: integer('salary_offered'),
    location: text('location'),
    remoteType: text('remote_type').$type<'remote' | 'hybrid' | 'onsite'>(),
    referralContactId: uuid('referral_contact_id').references(
      () => referralContacts.id,
      { onDelete: 'set null' }
    ),
    notes: text('notes'),
    nextAction: text('next_action'),
    nextActionDate: date('next_action_date'),
    offerDetails: jsonb('offer_details').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('applications_user_status_date_idx').on(
      t.userId,
      t.status,
      t.nextActionDate
    ),
  ]
);
