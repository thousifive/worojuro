import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { users } from '../db';
import { eq } from 'drizzle-orm';
import type { UserPreferences } from '@/types';

export const usersRouter = createTRPCRouter({
  /**
   * getPreferences — returns the current user's preference object.
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    const row = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
      columns: { preferences: true },
    });
    return row?.preferences ?? null;
  }),

  /**
   * updatePreferences — partial merge update.
   * Only fields passed are updated; rest are preserved.
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        notify_instant_threshold: z.number().min(0).max(100).optional(),
        notify_digest_frequency: z.enum(['daily', 'weekly', 'never']).optional(),
        hide_woro_below: z.number().min(0).max(100).optional(),
        remote_pref: z.enum(['remote', 'hybrid', 'onsite']).optional(),
        salary_min: z.number().min(0).optional(),
        salary_currency: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const row = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
        columns: { preferences: true },
      });
      const current = row?.preferences ?? {};
      await ctx.db
        .update(users)
        .set({
          preferences: { ...current, ...input } as UserPreferences,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id));
      return { success: true };
    }),
});
