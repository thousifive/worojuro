/**
 * Market analyser — switch/wait signal for the analysis page.
 *
 * AI provider: see server/ai/client.ts
 * Cached in market_signals — 24h TTL enforced by analysis.ts router.
 */

import { generateText } from './client';
import { type DB } from '../db';
import type { UserPreferences, MarketSignalType } from '@/types';
import { applications, jobMatches, jobs } from '../db';
import { eq, and, count, gte, sql } from 'drizzle-orm';

const SYSTEM_PROMPT = `You are a job market analyst for Worojuro.
Based on the user's job search data, produce a market timing signal.

Return ONLY valid JSON:
{
  "signal_type": "switch_now" | "wait" | "market_hot" | "market_cold",
  "analysis": "2-3 sentences explaining the signal and what the user should do",
  "confidence": number
}`;

export async function generateMarketSignal(
  db: DB,
  userId: string,
  preferences: UserPreferences
): Promise<{
  signalType: MarketSignalType;
  analysis: string;
  dataSnapshot: Record<string, unknown>;
} | null> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000);

    const [appCounts, recentMatches, recentJobs] = await Promise.all([
      db
        .select({ status: applications.status, count: count() })
        .from(applications)
        .where(eq(applications.userId, userId))
        .groupBy(applications.status),

      db
        .select({ count: sql<number>`count(*)` })
        .from(jobMatches)
        .where(
          and(
            eq(jobMatches.userId, userId),
            gte(jobMatches.matchScore, 70),
            gte(jobMatches.createdAt, sevenDaysAgo)
          )
        ),

      db
        .select({ count: sql<number>`count(*)` })
        .from(jobs)
        .where(and(gte(jobs.ingestedAt, sevenDaysAgo), eq(jobs.isActive, true))),
    ]);

    const dataSnapshot = {
      application_funnel: appCounts,
      high_match_last_7d: recentMatches[0]?.count ?? 0,
      new_jobs_last_7d: recentJobs[0]?.count ?? 0,
      user_tech_stack: preferences.tech_stack,
      generated_at: new Date().toISOString(),
    };

    const userMessage = `
Tech stack: ${preferences.tech_stack.join(', ')}
Salary target: ${preferences.salary_min}+ ${preferences.salary_currency}
Preferred location: ${preferences.locations.join(', ')}

Application funnel: ${JSON.stringify(appCounts)}
High-match new jobs (last 7 days): ${dataSnapshot.high_match_last_7d}
New jobs ingested (last 7 days): ${dataSnapshot.new_jobs_last_7d}
`.trim();

    const text = await generateText(userMessage, SYSTEM_PROMPT, 512);
    if (!text) return null;

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const raw = JSON.parse(jsonMatch[0]) as {
      signal_type: MarketSignalType;
      analysis: string;
    };

    return {
      signalType: raw.signal_type,
      analysis: raw.analysis,
      dataSnapshot,
    };
  } catch (err) {
    console.error('[market-analyser] Failed for user', userId, err);
    return null;
  }
}
