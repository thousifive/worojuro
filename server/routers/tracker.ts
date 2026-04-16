import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { applications, jobs } from '../db';
import { eq, and, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const APPLICATION_STATUS = z.enum([
  'saved', 'applied', 'oa', 'phone', 'interview', 'offer', 'rejected', 'ghosted',
]);

const applicationInput = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  jdUrl: z.string().url().optional(),
  status: APPLICATION_STATUS.default('saved'),
  appliedDate: z.string().optional(),
  salaryOffered: z.number().optional(),
  location: z.string().optional(),
  remoteType: z.enum(['remote', 'hybrid', 'onsite']).optional(),
  referralContactId: z.string().uuid().optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
  offerDetails: z.record(z.unknown()).optional(),
  jobId: z.string().uuid().optional(),
});

export const trackerRouter = createTRPCRouter({
  /**
   * getAll — all applications grouped for Kanban.
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.applications.findMany({
      where: eq(applications.userId, ctx.user.id),
      orderBy: [asc(applications.nextActionDate), asc(applications.createdAt)],
    });
  }),

  /**
   * getByStatus — single Kanban column.
   */
  getByStatus: protectedProcedure
    .input(z.object({ status: APPLICATION_STATUS }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.applications.findMany({
        where: and(
          eq(applications.userId, ctx.user.id),
          eq(applications.status, input.status)
        ),
        orderBy: [asc(applications.nextActionDate)],
      });
    }),

  /**
   * upsert — create or update an application.
   */
  upsert: protectedProcedure
    .input(applicationInput.extend({ id: z.string().uuid().optional() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const now = new Date();

      if (id) {
        await ctx.db
          .update(applications)
          .set({ ...data, updatedAt: now })
          .where(
            and(eq(applications.id, id), eq(applications.userId, ctx.user.id))
          );
        return { id };
      }

      const newId = randomUUID();
      await ctx.db.insert(applications).values({
        id: newId,
        userId: ctx.user.id,
        ...data,
      });
      return { id: newId };
    }),

  /**
   * updateStatus — Kanban drag-and-drop status change.
   */
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: APPLICATION_STATUS,
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(applications)
        .set({ status: input.status, updatedAt: new Date() })
        .where(
          and(
            eq(applications.id, input.id),
            eq(applications.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  /**
   * applyToJob — one-click apply from feed card.
   * Upserts an application (dedup on user_id + job_id).
   * If already tracked: sets status=applied + appliedDate=today.
   * If new: inserts with pre-filled job data.
   * Returns { applicationId, applyUrl } so frontend can window.open.
   */
  applyToJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: eq(jobs.id, input.jobId),
        columns: {
          id: true, title: true, company: true, location: true,
          remoteType: true, applyUrl: true,
        },
      });

      if (!job) throw new Error('Job not found');

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      // Check for existing application for this user+job
      const existing = await ctx.db.query.applications.findFirst({
        where: and(
          eq(applications.userId, ctx.user.id),
          eq(applications.jobId, input.jobId)
        ),
        columns: { id: true },
      });

      if (existing) {
        await ctx.db
          .update(applications)
          .set({ status: 'applied', appliedDate: today, updatedAt: new Date() })
          .where(eq(applications.id, existing.id));
        return { applicationId: existing.id, applyUrl: job.applyUrl ?? null };
      }

      const newId = randomUUID();
      await ctx.db.insert(applications).values({
        id: newId,
        userId: ctx.user.id,
        jobId: job.id,
        company: job.company,
        role: job.title,
        location: job.location ?? undefined,
        remoteType: job.remoteType ?? undefined,
        status: 'applied',
        appliedDate: today,
      });
      return { applicationId: newId, applyUrl: job.applyUrl ?? null };
    }),

  /**
   * delete — remove an application.
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(applications)
        .where(
          and(
            eq(applications.id, input.id),
            eq(applications.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),
});
