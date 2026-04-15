import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { resumes, users } from '../db';
import { eq, and } from 'drizzle-orm';
import { parseResume } from '../ai/resume-parser';
import { randomUUID } from 'crypto';

export const resumeRouter = createTRPCRouter({
  /**
   * getAll — all resume versions for the user.
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.resumes.findMany({
      where: eq(resumes.userId, ctx.user.id),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      columns: {
        id: true,
        fileName: true,
        storagePath: true,
        parsedSkills: true,
        isActive: true,
        versionLabel: true,
        createdAt: true,
        // exclude embedding (large, not needed in list)
      },
    });
  }),

  /**
   * getActive — the resume currently used for match scoring.
   */
  getActive: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.resumes.findFirst({
      where: and(eq(resumes.userId, ctx.user.id), eq(resumes.isActive, true)),
    });
  }),

  /**
   * confirmUpload — called after client uploads file to Supabase Storage.
   * Triggers async parse + embed pipeline.
   * File validation (type, size) happens client-side before Storage upload.
   */
  confirmUpload: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1),
        storagePath: z.string().min(1),
        versionLabel: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = randomUUID();

      // Deactivate previous active resume
      await ctx.db
        .update(resumes)
        .set({ isActive: false })
        .where(and(eq(resumes.userId, ctx.user.id), eq(resumes.isActive, true)));

      // Create new resume record
      await ctx.db.insert(resumes).values({
        id,
        userId: ctx.user.id,
        fileName: input.fileName,
        storagePath: input.storagePath,
        versionLabel: input.versionLabel ?? null,
        isActive: true,
      });

      // Fire-and-forget parse + embed — never block UI
      parseResume(ctx.db, id, input.storagePath, ctx.user.id).catch(console.error);

      return { id };
    }),

  /**
   * setActive — switch active resume version.
   */
  setActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(resumes)
        .set({ isActive: false })
        .where(and(eq(resumes.userId, ctx.user.id), eq(resumes.isActive, true)));

      await ctx.db
        .update(resumes)
        .set({ isActive: true })
        .where(
          and(eq(resumes.id, input.id), eq(resumes.userId, ctx.user.id))
        );

      return { success: true };
    }),

  /**
   * delete — remove a resume version (not the active one).
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(resumes)
        .where(
          and(
            eq(resumes.id, input.id),
            eq(resumes.userId, ctx.user.id),
            eq(resumes.isActive, false) // prevent deleting active
          )
        );
      return { success: true };
    }),

  /**
   * updateLabel — rename a version.
   */
  updateLabel: protectedProcedure
    .input(z.object({ id: z.string().uuid(), label: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(resumes)
        .set({ versionLabel: input.label })
        .where(
          and(eq(resumes.id, input.id), eq(resumes.userId, ctx.user.id))
        );
      return { success: true };
    }),
});
