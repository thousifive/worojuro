import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { marketSignals, users } from '../db';
import { eq, desc } from 'drizzle-orm';
import { generateMarketSignal } from '../ai/market-analyser';
import { randomUUID } from 'crypto';

const SIGNAL_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export const analysisRouter = createTRPCRouter({
  /**
   * getSignal — switch now / wait recommendation.
   * Regenerates if last signal is older than 24h.
   * Returns stale data immediately while regenerating.
   */
  getSignal: protectedProcedure.query(async ({ ctx }) => {
    const latest = await ctx.db.query.marketSignals.findFirst({
      where: eq(marketSignals.userId, ctx.user.id),
      orderBy: [desc(marketSignals.generatedAt)],
    });

    const isStale =
      !latest ||
      Date.now() - new Date(latest.generatedAt).getTime() > SIGNAL_CACHE_TTL_MS;

    if (isStale) {
      // Return stale data immediately; regenerate in background
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.user.id),
      });
      if (user) {
        // Fire-and-forget — never block UI on AI call
        generateMarketSignal(ctx.db, ctx.user.id, user.preferences).then(
          async (signal) => {
            if (!signal) return;
            await ctx.db.insert(marketSignals).values({
              id: randomUUID(),
              userId: ctx.user.id,
              signalType: signal.signalType,
              analysis: signal.analysis,
              dataSnapshot: signal.dataSnapshot,
            });
          }
        ).catch(console.error);
      }
    }

    return {
      signal: latest ?? null,
      isStale,
    };
  }),

  /**
   * getHistory — past signals for trend display.
   */
  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(30).default(10) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.marketSignals.findMany({
        where: eq(marketSignals.userId, ctx.user.id),
        orderBy: [desc(marketSignals.generatedAt)],
        limit: input.limit,
      });
    }),
});
