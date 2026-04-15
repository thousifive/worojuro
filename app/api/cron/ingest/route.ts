/**
 * Cron 1 — runs every 6 hours ("0 *\/6 * * *" in vercel.json).
 *
 * Sequence (sequential, stays within 1 cron slot):
 *   1. Ingest jobs from all free sources
 *   2. Compute Woro scores for newly ingested jobs
 *   3. Ingest pulse items from all 8 sources
 *   4. Generate async AI summaries for new pulse items
 *
 * Security: verifies Authorization: Bearer <CRON_SECRET> header.
 * Without it, returns 401.
 */

import { NextResponse } from 'next/server';
import { ingestJobs } from '@/server/services/job-ingestion';
import { ingestPulse } from '@/server/services/pulse-ingestion';

export const maxDuration = 300; // 5 minutes — Vercel Hobby max

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const results: Record<string, unknown> = {};

  try {
    await ingestJobs();
    results.jobs = 'ok';
  } catch (err) {
    results.jobs = `failed: ${String(err)}`;
    console.error('[cron/ingest] Job ingestion error:', err);
  }

  try {
    await ingestPulse();
    results.pulse = 'ok';
  } catch (err) {
    results.pulse = `failed: ${String(err)}`;
    console.error('[cron/ingest] Pulse ingestion error:', err);
  }

  return NextResponse.json({
    success: true,
    durationMs: Date.now() - startedAt,
    results,
    timestamp: new Date().toISOString(),
  });
}
