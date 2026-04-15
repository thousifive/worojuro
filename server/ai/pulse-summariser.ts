/**
 * Pulse summariser — 2-sentence AI digest per pulse item.
 *
 * AI provider: see server/ai/client.ts
 * Runs async after ingestion — items visible immediately with null summary_ai.
 * Rule: skip if summary_ai IS NOT NULL already.
 */

import { generateText } from './client';
import { type DB, pulseItems } from '../db';
import { eq, isNull } from 'drizzle-orm';

const SYSTEM_PROMPT = `You are a job-seeker-focused news summariser for Worojuro.
Write exactly 2 sentences: what happened, and why it matters for a software engineer's job search.
Be direct. No fluff. No "In conclusion". Maximum 60 words total.
Return only the 2 sentences — no JSON, no formatting.`;

export async function summarisePulseItem(
  db: DB,
  itemId: string,
  title: string,
  summaryRaw: string,
  category: string
): Promise<void> {
  try {
    const userMessage = `Category: ${category}\nTitle: ${title}\n\n${summaryRaw.slice(0, 1500)}`;

    const summaryAi = await generateText(userMessage, SYSTEM_PROMPT, 150);

    if (summaryAi) {
      await db
        .update(pulseItems)
        .set({ summaryAi: summaryAi.trim() })
        .where(eq(pulseItems.id, itemId));
    }
  } catch (err) {
    console.error('[pulse-summariser] Failed for item', itemId, err);
    // Leave summary_ai as null — UI shows summaryRaw as fallback
  }
}

/**
 * Batch: summarise up to 50 pulse items missing AI summaries per cron run.
 */
export async function summarisePendingItems(db: DB): Promise<void> {
  const pending = await db.query.pulseItems.findMany({
    where: isNull(pulseItems.summaryAi),
    limit: 50,
    columns: { id: true, title: true, summaryRaw: true, category: true },
  });

  for (const item of pending) {
    await summarisePulseItem(db, item.id, item.title, item.summaryRaw, item.category);
    await new Promise((r) => setTimeout(r, 200)); // polite pacing for local Ollama
  }
}
