import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { notifications } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const notificationsRouter = createTRPCRouter({
  /**
   * getUnread — latest unread notifications for the bell icon.
   */
  getUnread: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        ),
        orderBy: [desc(notifications.createdAt)],
        limit: input.limit,
      });
    }),

  /**
   * getAll — paginated notification history.
   */
  getAll: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.notifications.findMany({
        where: eq(notifications.userId, ctx.user.id),
        orderBy: [desc(notifications.createdAt)],
        limit: input.limit + 1,
      });
      const hasMore = items.length > input.limit;
      return {
        items: hasMore ? items.slice(0, -1) : items,
        nextCursor: hasMore ? items[items.length - 2]?.id : undefined,
      };
    }),

  /**
   * getUnreadCount — for badge on bell icon.
   */
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, ctx.user.id),
          eq(notifications.isRead, false)
        )
      );
    return { count: result[0]?.count ?? 0 };
  }),

  /**
   * markRead — mark one or all notifications as read.
   */
  markRead: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(), // omit to mark all
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id) {
        await ctx.db
          .update(notifications)
          .set({ isRead: true })
          .where(
            and(
              eq(notifications.id, input.id),
              eq(notifications.userId, ctx.user.id)
            )
          );
      } else {
        await ctx.db
          .update(notifications)
          .set({ isRead: true })
          .where(eq(notifications.userId, ctx.user.id));
      }
      return { success: true };
    }),

  /**
   * create — internal helper called by services/cron.
   * Protected by userId — always reads from session.
   */
  create: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          'new_match', 'status_reminder', 'market_signal',
          'fake_job_alert', 'digest', 'pulse_alert', 'woro_alert',
        ]),
        title: z.string(),
        body: z.string(),
        metadata: z.record(z.unknown()).default({}),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();
      await ctx.db.insert(notifications).values({
        id,
        userId: ctx.user.id,
        ...input,
      });
      return { id };
    }),
});
