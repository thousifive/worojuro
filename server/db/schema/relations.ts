/**
 * Drizzle ORM relations — required for `db.query.X.findMany({ with: { Y } })`.
 * Every FK that is used in a `with` clause needs a relation defined here.
 */

import { relations } from 'drizzle-orm';
import { users, marketSignals } from './users';
import { jobs } from './jobs';
import { resumes } from './resumes';
import { jobMatches } from './embeddings';
import { applications } from './applications';
import { referralContacts } from './referrals';
import { notifications } from './notifications';
import { pulseItems, pulseInteractions } from './pulse';

// ── users ──────────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  resumes: many(resumes),
  jobMatches: many(jobMatches),
  applications: many(applications),
  referralContacts: many(referralContacts),
  notifications: many(notifications),
  marketSignals: many(marketSignals),
  pulseInteractions: many(pulseInteractions),
}));

// ── jobs ───────────────────────────────────────────────────────────────────────

export const jobsRelations = relations(jobs, ({ many }) => ({
  matches: many(jobMatches),
}));

// ── jobMatches ─────────────────────────────────────────────────────────────────

export const jobMatchesRelations = relations(jobMatches, ({ one }) => ({
  user: one(users, { fields: [jobMatches.userId], references: [users.id] }),
  job: one(jobs, { fields: [jobMatches.jobId], references: [jobs.id] }),
}));

// ── resumes ────────────────────────────────────────────────────────────────────

export const resumesRelations = relations(resumes, ({ one }) => ({
  user: one(users, { fields: [resumes.userId], references: [users.id] }),
}));

// ── applications ───────────────────────────────────────────────────────────────

export const applicationsRelations = relations(applications, ({ one }) => ({
  user: one(users, { fields: [applications.userId], references: [users.id] }),
}));

// ── referralContacts ───────────────────────────────────────────────────────────

export const referralContactsRelations = relations(referralContacts, ({ one }) => ({
  user: one(users, { fields: [referralContacts.userId], references: [users.id] }),
}));

// ── notifications ──────────────────────────────────────────────────────────────

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// ── marketSignals ──────────────────────────────────────────────────────────────

export const marketSignalsRelations = relations(marketSignals, ({ one }) => ({
  user: one(users, { fields: [marketSignals.userId], references: [users.id] }),
}));

// ── pulseItems ─────────────────────────────────────────────────────────────────

export const pulseItemsRelations = relations(pulseItems, ({ many }) => ({
  interactions: many(pulseInteractions),
}));

// ── pulseInteractions ──────────────────────────────────────────────────────────

export const pulseInteractionsRelations = relations(pulseInteractions, ({ one }) => ({
  user: one(users, { fields: [pulseInteractions.userId], references: [users.id] }),
  pulseItem: one(pulseItems, {
    fields: [pulseInteractions.pulseItemId],
    references: [pulseItems.id],
  }),
}));
