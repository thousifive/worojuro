import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { referralContacts } from '../db';
import { eq, and, ilike } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const referralsRouter = createTRPCRouter({
  /**
   * getAll — all referral contacts for the user.
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.referralContacts.findMany({
      where: eq(referralContacts.userId, ctx.user.id),
      orderBy: (t, { asc }) => [asc(t.fullName)],
    });
  }),

  /**
   * matchByCompany — find contacts at a given company.
   * Used to show referral chips on job cards.
   * Fuzzy match: company name contains query (case-insensitive).
   */
  matchByCompany: protectedProcedure
    .input(z.object({ company: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.referralContacts.findMany({
        where: and(
          eq(referralContacts.userId, ctx.user.id),
          ilike(referralContacts.company, `%${input.company}%`)
        ),
      });
    }),

  /**
   * importCsv — bulk import from LinkedIn connections CSV.
   * CSV row shape: First Name, Last Name, Email Address, Company, Position, Connected On
   */
  importCsv: protectedProcedure
    .input(
      z.array(
        z.object({
          fullName: z.string(),
          company: z.string().optional(),
          role: z.string().optional(),
          linkedinUrl: z.string().url().optional(),
          email: z.string().email().optional(),
        })
      )
    )
    .mutation(async ({ ctx, input }) => {
      const rows = input.map((r) => ({
        id: randomUUID(),
        userId: ctx.user.id,
        fullName: r.fullName,
        company: r.company ?? null,
        role: r.role ?? null,
        linkedinUrl: r.linkedinUrl ?? null,
        email: r.email ?? null,
        source: 'linkedin_csv' as const,
      }));

      await ctx.db.insert(referralContacts).values(rows).onConflictDoNothing();
      return { imported: rows.length };
    }),

  /**
   * add — manually add a single referral contact.
   */
  add: protectedProcedure
    .input(
      z.object({
        fullName: z.string().min(1),
        company: z.string().optional(),
        role: z.string().optional(),
        linkedinUrl: z.string().url().optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      await ctx.db.insert(referralContacts).values({
        id,
        userId: ctx.user.id,
        ...input,
        source: 'manual',
      });
      return { id };
    }),

  /**
   * delete — remove a contact.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(referralContacts)
        .where(
          and(
            eq(referralContacts.id, input.id),
            eq(referralContacts.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});
