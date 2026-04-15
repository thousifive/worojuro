/**
 * Cron 2 — runs daily at 7am UTC (0 7 * * * in vercel.json).
 *
 * Sends:
 *   - Daily job digest to users with notify_digest_frequency = 'daily'
 *   - Woro alerts for jobs scored < 40 not yet notified
 *
 * Security: verifies Authorization: Bearer <CRON_SECRET> header.
 */

import { NextResponse } from 'next/server';
import { db, users, jobMatches, jobs, notifications, applications } from '@/server/db';
import { eq, and, lt, isNotNull, sql } from 'drizzle-orm';
import { sendDailyDigest } from '@/server/services/email';
import { randomUUID } from 'crypto';

export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://worojuro.app';
  const startedAt = Date.now();
  let digestsSent = 0;
  let remindersCreated = 0;

  try {
    // ── Next action date reminders ────────────────────────────────────────────
    // Find all applications where next_action_date = today (UTC date)
    const dueApps = await db.query.applications.findMany({
      where: sql`${applications.nextActionDate} = CURRENT_DATE`,
      columns: {
        id: true,
        userId: true,
        company: true,
        role: true,
        nextAction: true,
        nextActionDate: true,
        status: true,
      },
    });

    for (const app of dueApps) {
      // Skip completed/inactive statuses
      if (app.status === 'offer' || app.status === 'rejected' || app.status === 'ghosted') continue;

      await db.insert(notifications).values({
        id: randomUUID(),
        userId: app.userId,
        type: 'next_action',
        title: `Action due: ${app.company}`,
        body: app.nextAction ?? `Follow up on ${app.role} at ${app.company}`,
        metadata: { applicationId: app.id, company: app.company, role: app.role },
      });
      remindersCreated++;
    }

    // Fetch all users with daily digest enabled
    const allUsers = await db.query.users.findMany({
      columns: {
        id: true,
        email: true,
        preferences: true,
      },
    });

    for (const user of allUsers) {
      if (user.preferences.notify_digest_frequency !== 'daily') continue;

      // Get top matches for this user (not dismissed)
      const matches = await db.query.jobMatches.findMany({
        where: and(
          eq(jobMatches.userId, user.id),
          eq(jobMatches.isDismissed, false)
        ),
        with: { job: true },
        orderBy: (t, { desc }) => [desc(t.matchScore)],
        limit: 10,
      });

      if (matches.length === 0) continue;

      await sendDailyDigest(
        user.email,
        matches.map((m) => ({
          ...m.job,
          match_score: m.matchScore,
          match_breakdown: m.matchBreakdown,
          is_dismissed: m.isDismissed,
          is_saved: m.isSaved,
        })) as Parameters<typeof sendDailyDigest>[1],
        appUrl
      );

      digestsSent++;
    }
  } catch (err) {
    console.error('[cron/digest] Error:', err);
  }

  return NextResponse.json({
    success: true,
    digestsSent,
    remindersCreated,
    durationMs: Date.now() - startedAt,
    timestamp: new Date().toISOString(),
  });
}
