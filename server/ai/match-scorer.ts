/**
 * Match scorer — scores job-to-user-profile fit, 0–100.
 *
 * Blend: vectorSimilarity (40%) + AI dimension average (60%).
 * Returns null on AI failure — job still shown in feed, match_score stays null.
 *
 * AI provider: see server/ai/client.ts
 * Rule: never re-score a (user, job) pair that already has match_score stored.
 */

import { generateText } from './client';
import type { MatchBreakdown, UserPreferences } from '@/types';

export interface MatchScorerInput {
  userId: string;
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobSalaryMin: number | null;
  jobSalaryMax: number | null;
  jobTechStack: string[];
  jobLocation: string | null;
  jobRemoteType: string | null;
  jobPerks: string[];
  jobDescriptionCleaned: string;
  userPreferences: UserPreferences;
  vectorSimilarity: number; // cosine similarity 0–1 from pgvector
}

export interface MatchScorerOutput {
  score: number;
  breakdown: MatchBreakdown;
}

const SYSTEM_PROMPT = `You are a job-match scorer for Worojuro.
Score how well this job matches the user's profile on 5 dimensions (0–100 each):

1. skills_score: overlap between user skills and job requirements
2. tech_score: overlap between user tech_stack and job tech_stack
3. salary_score: does salary meet user's salary_min? 100=exceeds, 50=unknown, 0=far below
4. location_score: does remote type / location match user preferences?
5. perks_score: do the listed perks match what the user values?

Return ONLY valid JSON — no text outside the JSON:
{
  "skills_score": number,
  "tech_score": number,
  "salary_score": number,
  "location_score": number,
  "perks_score": number,
  "explanation": "one sentence"
}`;

export async function scoreMatch(input: MatchScorerInput): Promise<MatchScorerOutput | null> {
  const userMessage = `
Job: ${input.jobTitle} at ${input.jobCompany}
Tech stack: ${input.jobTechStack.join(', ') || 'not listed'}
Salary: ${input.jobSalaryMin ?? '?'} – ${input.jobSalaryMax ?? '?'} USD
Location: ${input.jobLocation ?? 'not specified'}, remote: ${input.jobRemoteType ?? 'unknown'}
Perks: ${input.jobPerks.join(', ') || 'none listed'}
Description: ${input.jobDescriptionCleaned.slice(0, 1500)}

User profile:
Skills: ${input.userPreferences.skills.join(', ')}
Tech stack: ${input.userPreferences.tech_stack.join(', ')}
Salary min: ${input.userPreferences.salary_min} ${input.userPreferences.salary_currency}
Preferred remote: ${input.userPreferences.remote_pref}
Locations: ${input.userPreferences.locations.join(', ')}
`.trim();

  const text = await generateText(userMessage, SYSTEM_PROMPT, 512);
  if (!text) return null;

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const raw = JSON.parse(jsonMatch[0]) as {
      skills_score: number;
      tech_score: number;
      salary_score: number;
      location_score: number;
      perks_score: number;
      explanation: string;
    };

    const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

    const breakdown: MatchBreakdown = {
      skills_score: clamp(raw.skills_score ?? 50),
      tech_score: clamp(raw.tech_score ?? 50),
      salary_score: clamp(raw.salary_score ?? 50),
      location_score: clamp(raw.location_score ?? 50),
      perks_score: clamp(raw.perks_score ?? 50),
      explanation: raw.explanation ?? '',
    };

    const aiAvg =
      (breakdown.skills_score + breakdown.tech_score + breakdown.salary_score +
        breakdown.location_score + breakdown.perks_score) / 5;

    const score = clamp(input.vectorSimilarity * 100 * 0.4 + aiAvg * 0.6);

    return { score, breakdown };
  } catch (err) {
    console.error('[match-scorer] JSON parse failed for job', input.jobId, err);
    return null;
  }
}
