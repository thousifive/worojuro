/**
 * referral_contacts — imported from LinkedIn CSV or added manually.
 *
 * RLS policies:
 *   CREATE POLICY "user owns row" ON referral_contacts
 *     USING (user_id = auth.uid())
 *     WITH CHECK (user_id = auth.uid());
 */

import {
  pgTable,
  uuid,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const referralContacts = pgTable('referral_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  company: text('company'),
  role: text('role'),
  linkedinUrl: text('linkedin_url'),
  email: text('email'),
  source: text('source')
    .$type<'linkedin_csv' | 'manual'>()
    .notNull()
    .default('manual'),
  importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
});
