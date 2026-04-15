import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { jobs, jobMatches } from '../db';
import { eq, and, desc, gte, lt, sql } from 'drizzle-orm';

export const jobsRouter = createTRPCRouter({
  /**
   * getFeed — personalised job feed.
   * Vector similarity search against user's active resume embedding.
   * Default: hides jobs with woro_score < 30.
   * Cursor-based pagination for infinite scroll.
   */
  getFeed: protectedProcedure
    .input(
      z.object({
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
        minMatchScore: z.number().min(0).max(100).default(0),
        minWoroScore: z.number().min(0).max(100).default(30),
        remoteOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cursor, limit, minMatchScore, minWoroScore } = input;

      // Cursor: match score of the last item — fetch items with score <= cursor score
      // Simple offset cursor: use match_score DESC, id DESC ordering with score < cursor
      const cursorMatch = cursor
        ? await ctx.db.query.jobMatches.findFirst({
            where: eq(jobMatches.id, cursor),
            columns: { matchScore: true },
          })
        : null;

      const matches = await ctx.db.query.jobMatches.findMany({
        where: and(
          eq(jobMatches.userId, ctx.user.id),
          eq(jobMatches.isDismissed, false),
          gte(jobMatches.matchScore, minMatchScore),
          cursorMatch ? lt(jobMatches.matchScore, cursorMatch.matchScore) : undefined
        ),
        with: {
          job: true,
        },
        orderBy: [desc(jobMatches.matchScore)],
        limit: limit + 1,
      });

      // Post-filter: exclude inactive/low-score jobs (keep unscored jobs visible while scoring)
      const filtered = matches.filter((m) => {
        if (!m.job || !m.job.isActive) return false;
        if (m.job.woroScore !== null && m.job.woroScore < minWoroScore) return false;
        return true;
      });

      const hasMore = filtered.length > limit;
      const items = hasMore ? filtered.slice(0, -1) : filtered;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return { items, nextCursor };
    }),

  /**
   * getWoroDetail — full woro_signals breakdown for a job tooltip.
   */
  getWoroDetail: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const job = await ctx.db.query.jobs.findFirst({
        where: eq(jobs.id, input.jobId),
        columns: {
          id: true,
          woroScore: true,
          woroSignals: true,
          company: true,
          title: true,
        },
      });
      if (!job) return null;
      return job;
    }),

  /**
   * saveJob — mark a feed match as saved (also saves to tracker).
   */
  saveJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(jobMatches)
        .set({ isSaved: true })
        .where(
          and(
            eq(jobMatches.userId, ctx.user.id),
            eq(jobMatches.jobId, input.jobId)
          )
        );
      return { success: true };
    }),

  /**
   * dismissJob — hide a job from the feed.
   */
  dismissJob: protectedProcedure
    .input(z.object({ jobId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(jobMatches)
        .set({ isDismissed: true })
        .where(
          and(
            eq(jobMatches.userId, ctx.user.id),
            eq(jobMatches.jobId, input.jobId)
          )
        );
      return { success: true };
    }),

  /**
   * getFeedStats — counts for the overview dashboard card.
   */
  getFeedStats: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(jobMatches)
      .where(
        and(
          eq(jobMatches.userId, ctx.user.id),
          eq(jobMatches.isDismissed, false)
        )
      );
    return { total: result[0]?.count ?? 0 };
  }),
});
