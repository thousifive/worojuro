/**
 * Woro scorer — Worojuro's trust/legitimacy engine.
 *
 * Returns 0–100 Woro score + breakdown signals.
 * null = unscored (AI unavailable — graceful degradation).
 * null ≠ 0. Never treat null as suspicious.
 *
 * AI provider: see server/ai/client.ts
 * To switch to Anthropic: update client.ts only — this file stays the same.
 *
 * Rule: cache all outputs in DB. Never re-score a job where woro_score IS NOT NULL.
 */

import { generateText } from './client';
import type { WoroSignals } from '@/types';

export interface WoroScorerInput {
  jobId: string;
  title: string;
  company: string;
  companyDomain: string | null;
  descriptionRaw: string;
  postedAt: Date | null;
  source: string;
}

export interface WoroScorerOutput {
  score: number;
  signals: WoroSignals;
}

const SYSTEM_PROMPT = `You are the Woro scorer for Worojuro, a job search intelligence tool.
Evaluate whether a job listing is real or a ghost/fake posting.

Score on 3 dimensions (0–100 each, higher = more legitimate):
1. fake_job_score: Are there ghost signals? Reposted for months, vague buzzwords, no salary, generic company?
2. jd_quality_score: Is the JD specific? Named team, concrete tech stack, real responsibilities vs copy-pasted filler?
3. company_legitimacy_score: Is the company recognisable? Real domain? Signs of an actual business?

woro_score = (fake_job_score * 0.5) + (jd_quality_score * 0.3) + (company_legitimacy_score * 0.2)

Return ONLY valid JSON — no explanation outside the JSON:
{
  "woro_score": number,
  "fake_job_score": number,
  "jd_quality_score": number,
  "company_legitimacy_score": number,
  "has_vague_language": boolean,
  "has_copy_paste_patterns": boolean,
  "has_glassdoor_presence": boolean,
  "explanation": "one sentence"
}`;

export async function scoreJob(input: WoroScorerInput): Promise<WoroScorerOutput | null> {
  try {
    const userMessage = `
Job title: ${input.title}
Company: ${input.company}
Domain: ${input.companyDomain ?? 'unknown'}
Source: ${input.source}
Posted: ${input.postedAt?.toISOString() ?? 'unknown'}

Job description (first 2000 chars):
${input.descriptionRaw.slice(0, 2000)}
`.trim();

    const text = await generateText(userMessage, SYSTEM_PROMPT, 512);
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[woro-scorer] No JSON in response for job', input.jobId);
      return null;
    }

    const raw = JSON.parse(jsonMatch[0]) as {
      woro_score: number;
      fake_job_score: number;
      jd_quality_score: number;
      company_legitimacy_score: number;
      has_vague_language: boolean;
      has_copy_paste_patterns: boolean;
      has_glassdoor_presence: boolean;
      explanation: string;
    };

    const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));

    const signals: WoroSignals = {
      fake_job_score: clamp(raw.fake_job_score ?? 50),
      jd_quality_score: clamp(raw.jd_quality_score ?? 50),
      company_legitimacy_score: clamp(raw.company_legitimacy_score ?? 50),
      has_vague_language: Boolean(raw.has_vague_language),
      has_copy_paste_patterns: Boolean(raw.has_copy_paste_patterns),
      has_glassdoor_presence: Boolean(raw.has_glassdoor_presence),
      explanation: raw.explanation ?? '',
    };

    return { score: clamp(raw.woro_score ?? 50), signals };
  } catch (err) {
    console.error('[woro-scorer] Failed for job', input.jobId, err);
    return null;
  }
}
