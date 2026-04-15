import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { applications } from '../db';
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
