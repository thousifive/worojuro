import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { pulseItems, pulseInteractions } from '../db';
import { eq, and, desc, notInArray, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const PULSE_CATEGORY = z.enum(['tech_update', 'layoff', 'market_change', 'funding', 'ipo']);

export const pulseRouter = createTRPCRouter({
  /**
   * getFeed — paginated pulse items for a category tab.
   * Excludes items the user has dismissed.
   */
  getFeed: protectedProcedure
    .input(
      z.object({
        category: PULSE_CATEGORY,
        limit: z.number().min(1).max(50).default(20),
        cursor: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get dismissed item IDs for this user
      const dismissed = await ctx.db.query.pulseInteractions.findMany({
        where: and(
          eq(pulseInteractions.userId, ctx.user.id),
          eq(pulseInteractions.action, 'dismissed')
        ),
        columns: { pulseItemId: true },
      });
      const dismissedIds = dismissed.map((d) => d.pulseItemId);

      const items = await ctx.db.query.pulseItems.findMany({
        where: and(
          eq(pulseItems.category, input.category),
          dismissedIds.length > 0
            ? notInArray(pulseItems.id, dismissedIds)
            : undefined
        ),
        orderBy: [desc(pulseItems.publishedAt)],
        limit: input.limit + 1,
      });

      const hasMore = items.length > input.limit;
      return {
        items: hasMore ? items.slice(0, -1) : items,
        nextCursor: hasMore ? items[items.length - 2]?.id : undefined,
      };
    }),

  /**
   * interact — dismiss, save, or share a pulse item.
   * UNIQUE constraint on (user_id, pulse_item_id) — one interaction per item.
   */
  interact: protectedProcedure
    .input(
      z.object({
        pulseItemId: z.string().uuid(),
        action: z.enum(['dismissed', 'saved', 'shared']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(pulseInteractions)
        .values({
          id: randomUUID(),
          userId: ctx.user.id,
          pulseItemId: input.pulseItemId,
          action: input.action,
        })
        .onConflictDoUpdate({
          target: [pulseInteractions.userId, pulseInteractions.pulseItemId],
          set: { action: input.action },
        });
      return { success: true };
    }),

  /**
   * getSaved — items the user bookmarked.
   */
  getSaved: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(20) }))
    .query(async ({ ctx, input }) => {
      const saved = await ctx.db.query.pulseInteractions.findMany({
        where: and(
          eq(pulseInteractions.userId, ctx.user.id),
          eq(pulseInteractions.action, 'saved')
        ),
        with: { pulseItem: true },
        orderBy: [desc(pulseInteractions.createdAt)],
        limit: input.limit,
      });
      return saved.map((s) => s.pulseItem);
    }),

  /**
   * getStats — counts per category for the tab badges.
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const dismissed = await ctx.db.query.pulseInteractions.findMany({
      where: and(
        eq(pulseInteractions.userId, ctx.user.id),
        eq(pulseInteractions.action, 'dismissed')
      ),
      columns: { pulseItemId: true },
    });
    const dismissedIds = dismissed.map((d) => d.pulseItemId);

    const result = await ctx.db
      .select({
        category: pulseItems.category,
        count: sql<number>`count(*)`,
      })
      .from(pulseItems)
      .where(
        dismissedIds.length > 0
          ? notInArray(pulseItems.id, dismissedIds)
          : undefined
      )
      .groupBy(pulseItems.category);

    return result;
  }),
});
