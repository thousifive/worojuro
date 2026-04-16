import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { jobs, jobMatches } from '../db';
import { eq, and, desc, gte, lt, sql } from 'drizzle-orm';

export const jobsRouter = createTRPCRouter({
  /**
   * getFeed — personalised job feed with filters.
   * Cursor-based pagination. Post-filters applied after DB fetch (Phase 1 approach).
   */
  getFeed: protectedProcedure
    .input(
      z.object({
        cursor: z.string().uuid().optional(),
        limit: z.number().min(1).max(50).default(20),
        minMatchScore: z.number().min(0).max(100).default(0),
        minWoroScore: z.number().min(0).max(100).default(30),
        remoteOnly: z.boolean().default(false),
        // ── New filters ────────────────────────────────────
        techStack: z.array(z.string()).default([]),      // job must include ≥1 of these
        salaryMin: z.number().optional(),                // job salary_min >= this
        salaryMax: z.number().optional(),                // job salary_max <= this
        currency: z.string().optional(),                 // match salary_currency exactly
        location: z.string().optional(),                 // ILIKE on job.location
        matchedOnly: z.boolean().default(false),         // matchScore >= 70
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        cursor, limit, minMatchScore, minWoroScore,
        remoteOnly, techStack, salaryMin, salaryMax,
        currency, location, matchedOnly,
      } = input;

      // Fetch a larger batch when post-filters are active to ensure full pages
      const hasActiveFilters =
        remoteOnly || techStack.length > 0 || salaryMin !== undefined ||
        salaryMax !== undefined || !!currency || !!location || matchedOnly;
      const fetchLimit = hasActiveFilters ? limit * 4 : limit + 1;

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
        with: { job: true },
        orderBy: [desc(jobMatches.matchScore)],
        limit: fetchLimit,
      });

      const filtered = matches.filter((m) => {
        if (!m.job || !m.job.isActive) return false;
        if (m.job.woroScore !== null && m.job.woroScore < minWoroScore) return false;
        if (remoteOnly && m.job.remoteType !== 'remote') return false;
        if (matchedOnly && m.matchScore < 70) return false;

        // Tech stack — job must contain at least one selected tag (case-insensitive)
        if (techStack.length > 0) {
          const jobTags = (m.job.techStack ?? []).map((t) => t.toLowerCase());
          const filterTags = techStack.map((t) => t.toLowerCase());
          if (!filterTags.some((f) => jobTags.includes(f))) return false;
        }

        // Salary filters — skip jobs with no salary data when filter is active
        if (salaryMin !== undefined) {
          if (m.job.salaryMin === null) return false;
          if (m.job.salaryMin < salaryMin) return false;
        }
        if (salaryMax !== undefined) {
          if (m.job.salaryMax === null) return false;
          if (m.job.salaryMax > salaryMax) return false;
        }

        // Currency — only filter when job has a stated currency
        if (currency && m.job.salaryCurrency) {
          if (m.job.salaryCurrency.toUpperCase() !== currency.toUpperCase()) return false;
        }

        // Location — case-insensitive substring match
        if (location && location.trim()) {
          if (!m.job.location) return false;
          if (!m.job.location.toLowerCase().includes(location.toLowerCase())) return false;
        }

        return true;
      });

      const hasMore = filtered.length > limit;
      const items = hasMore ? filtered.slice(0, limit) : filtered;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return { items, nextCursor };
    }),

  /**
   * getTopLocations — distinct locations from active jobs, ordered by frequency.
   * Used to populate the location filter dropdown.
   */
  getTopLocations: protectedProcedure
    .input(z.object({ limit: z.number().min(5).max(100).default(40) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute(sql`
        SELECT location, count(*)::int AS count
        FROM   jobs
        WHERE  is_active = true
          AND  location IS NOT NULL
          AND  location != ''
        GROUP  BY location
        ORDER  BY count DESC
        LIMIT  ${input.limit}
      `) as { location: string; count: number }[];
      return rows.map((r) => r.location);
    }),

  /**
   * getTopTechTags — most common tech stack tags across all active jobs.
   * Used to populate the tech filter chip list.
   */
  getTopTechTags: protectedProcedure
    .input(z.object({ limit: z.number().min(5).max(50).default(24) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute(sql`
        SELECT unnest(tech_stack) AS tag, count(*)::int AS count
        FROM   jobs
        WHERE  is_active = true
        GROUP  BY tag
        ORDER  BY count DESC
        LIMIT  ${input.limit}
      `) as { tag: string; count: number }[];
      return rows.map((r) => r.tag);
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
