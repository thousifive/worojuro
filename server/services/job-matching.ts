/**
 * Job matching service — embeds new jobs then creates job_matches via pgvector.
 *
 * Called from ingestJobs() after woro scoring.
 *
 * Pipeline per cron run:
 *   1. Embed up to 50 new jobs that have no embedding yet
 *   2. For each user with an active embedded resume:
 *      a. pgvector cosine similarity → top 100 jobs not yet matched
 *      b. Compute MatchBreakdown from skill overlap + remote type
 *      c. Insert into job_matches (onConflictDoNothing for dedup)
 *
 * Dedup rule: job_matches has a UNIQUE constraint on (user_id, job_id).
 * Never re-match a (user, job) pair that already exists.
 */

import { db, jobs, jobMatches, resumes } from '../db';
import { generateEmbedding } from '../ai/client';
import { scoreMatch } from '../ai/match-scorer';
import { eq, and, isNull, isNotNull, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { MatchBreakdown, UserPreferences } from '@/types';

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Clamp cosine similarity (0–1) to a 0–100 integer match score */
export function toMatchScore(similarity: number): number {
  return Math.round(Math.max(0, Math.min(1, similarity)) * 100);
}

/**
 * Compute skill overlap score 0–100.
 * Fuzzy: job tag is counted as matched if it contains or is contained by any resume skill.
 */
export function skillOverlapScore(jobTags: string[], resumeSkills: string[]): number {
  if (jobTags.length === 0) return 50;
  const jLower = jobTags.map((s) => s.toLowerCase());
  const rLower = resumeSkills.map((s) => s.toLowerCase());
  const matched = jLower.filter((j) => rLower.some((r) => r.includes(j) || j.includes(r)));
  return Math.round((matched.length / jLower.length) * 100);
}

// ── Step 1: embed new jobs ─────────────────────────────────────────────────────

export async function embedNewJobs(limit = 50): Promise<number> {
  const unembedded = await db.query.jobs.findMany({
    where: and(isNull(jobs.embedding), eq(jobs.isActive, true)),
    columns: { id: true, title: true, company: true, descriptionRaw: true, techStack: true },
    limit,
  });

  let count = 0;
  for (const job of unembedded) {
    const text = `${job.title} at ${job.company}\n${job.techStack.join(', ')}\n${job.descriptionRaw}`;
    const embedding = await generateEmbedding(text.slice(0, 8000));
    if (embedding) {
      await db.update(jobs).set({ embedding }).where(eq(jobs.id, job.id));
      count++;
    }
  }

  console.log(`[job-matching] Embedded ${count}/${unembedded.length} new jobs`);
  return count;
}

// ── Step 2: match jobs for a single user ──────────────────────────────────────

// AI scorer called for top matches only — caps at AI_SCORE_LIMIT per user per run
const AI_SCORE_LIMIT = 10;
const AI_SCORE_THRESHOLD = 0.65; // only call AI for similarity >= this

export async function matchJobsForUser(
  userId: string,
  resumeEmbedding: number[],
  resumeSkills: string[],
  userPreferences: UserPreferences,
  limit = 100
): Promise<number> {
  // Guard: embedding must be all finite numbers (defensive, values come from Ollama)
  if (!resumeEmbedding.every((v) => Number.isFinite(v))) {
    console.error('[job-matching] Invalid embedding — contains non-finite values');
    return 0;
  }
  const embeddingLiteral = `[${resumeEmbedding.join(',')}]`;

  type SimilarityRow = {
    id: string;
    title: string;
    company: string;
    tech_stack: string[] | null;
    perks: string[] | null;
    remote_type: string | null;
    location: string | null;
    salary_min: number | null;
    salary_max: number | null;
    description_raw: string;
    similarity: string; // Postgres returns numeric as string
  };

  const topJobs = (await db.execute(sql`
    SELECT j.id,
           j.title,
           j.company,
           j.tech_stack,
           j.perks,
           j.remote_type,
           j.location,
           j.salary_min,
           j.salary_max,
           j.description_raw,
           1 - (j.embedding <=> ${sql.raw(`'${embeddingLiteral}'::vector`)}) AS similarity
    FROM   jobs j
    WHERE  j.embedding IS NOT NULL
      AND  j.is_active = true
      AND  NOT EXISTS (
             SELECT 1
             FROM   job_matches jm
             WHERE  jm.job_id  = j.id
               AND  jm.user_id = ${userId}
           )
    ORDER  BY j.embedding <=> ${sql.raw(`'${embeddingLiteral}'::vector`)}
    LIMIT  ${limit}
  `)) as SimilarityRow[];

  let inserted = 0;
  let aiCallsUsed = 0;

  for (const row of topJobs) {
    const similarity = parseFloat(row.similarity);

    // AI breakdown for high-similarity matches — cap calls to avoid slow cron
    let breakdown: MatchBreakdown | null = null;
    if (similarity >= AI_SCORE_THRESHOLD && aiCallsUsed < AI_SCORE_LIMIT) {
      const aiResult = await scoreMatch({
        userId,
        jobId: row.id,
        jobTitle: row.title,
        jobCompany: row.company,
        jobSalaryMin: row.salary_min,
        jobSalaryMax: row.salary_max,
        jobTechStack: row.tech_stack ?? [],
        jobLocation: row.location,
        jobRemoteType: row.remote_type,
        jobPerks: row.perks ?? [],
        jobDescriptionCleaned: row.description_raw,
        userPreferences,
        vectorSimilarity: similarity,
      });
      if (aiResult) {
        breakdown = aiResult.breakdown;
        aiCallsUsed++;
      }
    }

    // Algorithmic fallback if AI unavailable or below threshold
    if (!breakdown) {
      const techScore = skillOverlapScore(row.tech_stack ?? [], resumeSkills);
      breakdown = {
        skills_score: techScore,
        tech_score: techScore,
        salary_score: 50,
        location_score: row.remote_type === 'remote' ? 100 : 60,
        perks_score: 50,
        explanation: `${toMatchScore(similarity)}% semantic similarity between your resume and this job.`,
      };
    }

    // For AI-scored matches, scoreMatch blends vector + AI → use its score
    // For algorithmic, derive from cosine similarity
    const matchScore = breakdown.explanation.startsWith(String(toMatchScore(similarity)))
      ? toMatchScore(similarity)
      : (() => {
          const aiAvg =
            (breakdown!.skills_score + breakdown!.tech_score + breakdown!.salary_score +
              breakdown!.location_score + breakdown!.perks_score) / 5;
          return Math.round(similarity * 100 * 0.4 + aiAvg * 0.6);
        })();

    const result = await db
      .insert(jobMatches)
      .values({
        id: randomUUID(),
        userId,
        jobId: row.id,
        matchScore: Math.min(100, Math.max(0, matchScore)),
        matchBreakdown: breakdown,
      })
      .onConflictDoNothing()
      .returning({ id: jobMatches.id });

    if (result.length > 0) inserted++;
  }

  console.log(`[job-matching] User ${userId}: inserted ${inserted} matches (${aiCallsUsed} AI-scored)`);
  return inserted;
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function matchNewJobs(): Promise<void> {
  console.log('[job-matching] Starting matching pipeline...');

  await embedNewJobs(50);

  // All users with an active embedded resume — fetch user preferences via relation
  const activeResumes = await db.query.resumes.findMany({
    where: and(eq(resumes.isActive, true), isNotNull(resumes.embedding)),
    columns: { userId: true, embedding: true, parsedSkills: true },
    with: { user: { columns: { preferences: true } } },
  });

  console.log(`[job-matching] Found ${activeResumes.length} users with active embedded resumes`);

  for (const resume of activeResumes) {
    if (!resume.embedding) continue;
    await matchJobsForUser(
      resume.userId,
      resume.embedding,
      resume.parsedSkills,
      resume.user.preferences,
    );
  }

  console.log('[job-matching] Matching pipeline complete');
}
