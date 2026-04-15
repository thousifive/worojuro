/**
 * Email service — sends transactional emails via Resend.
 *
 * Free tier: 3,000 emails/month, 100/day.
 * Fallback: if daily limit hit, log and skip — never crash cron.
 *
 * Templates:
 *   - daily-digest: morning job digest
 *   - match-alert: instant alert for priority companies
 *   - weekly-analysis: market analysis summary
 *   - pulse-digest: tech + funding highlights
 */

import { Resend } from 'resend';
import type { JobMatch, PulseItem, MarketSignal } from '@/types';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? 'digest@worojuro.dev';

export async function sendDailyDigest(
  toEmail: string,
  matches: JobMatch[],
  appUrl: string
): Promise<void> {
  try {
    const { DailyDigestEmail } = await import('@/emails/daily-digest');
    const { createElement } = await import('react');
    const { render } = await import('@react-email/render');

    const html = await render(createElement(DailyDigestEmail, { matches, appUrl }));

    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `${matches.length} new job matches today — Worojuro`,
      html,
    });
  } catch (err) {
    console.error('[email] Daily digest failed:', err);
    // Never rethrow — digest failure should not crash cron
  }
}

export async function sendMatchAlert(
  toEmail: string,
  match: JobMatch,
  appUrl: string
): Promise<void> {
  try {
    const { MatchAlertEmail } = await import('@/emails/match-alert');
    const { createElement } = await import('react');
    const { render } = await import('@react-email/render');

    const html = await render(createElement(MatchAlertEmail, { match, appUrl }));

    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `New match: ${match.title} at ${match.company} — Worojuro`,
      html,
    });
  } catch (err) {
    console.error('[email] Match alert failed:', err);
  }
}

export async function sendWeeklyAnalysis(
  toEmail: string,
  signal: MarketSignal,
  appUrl: string
): Promise<void> {
  try {
    const { WeeklyAnalysisEmail } = await import('@/emails/weekly-analysis');
    const { createElement } = await import('react');
    const { render } = await import('@react-email/render');

    const html = await render(createElement(WeeklyAnalysisEmail, { signal, appUrl }));

    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `Your weekly job market signal — Worojuro`,
      html,
    });
  } catch (err) {
    console.error('[email] Weekly analysis failed:', err);
  }
}

export async function sendPulseDigest(
  toEmail: string,
  items: PulseItem[],
  appUrl: string
): Promise<void> {
  try {
    const { PulseDigestEmail } = await import('@/emails/pulse-digest');
    const { createElement } = await import('react');
    const { render } = await import('@react-email/render');

    const html = await render(createElement(PulseDigestEmail, { items, appUrl }));

    await resend.emails.send({
      from: FROM,
      to: toEmail,
      subject: `Market pulse: tech + funding highlights — Worojuro`,
      html,
    });
  } catch (err) {
    console.error('[email] Pulse digest failed:', err);
  }
}
