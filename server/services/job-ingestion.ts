/**
 * Job ingestion service — fetches jobs from all free sources, deduplicates,
 * stores in DB, then triggers Woro scoring for new jobs.
 *
 * Sources: Remotive, Jobicy, RemoteOK, Adzuna, HN Algolia, LinkedIn RSS
 * Rate limits: Adzuna 250 req/day — batch carefully.
 *
 * Dedup rule: (source, external_id) UNIQUE constraint — use onConflictDoNothing.
 * Never re-embed a job that already has an embedding.
 */

import { db, jobs } from '../db';
import { scoreJob } from '../ai/woro-scorer';
import { matchNewJobs } from './job-matching';
import { eq, and, isNull, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

interface RawJob {
  source: 'remotive' | 'jobicy' | 'remoteok' | 'adzuna' | 'hn' | 'linkedin' | 'himalayas';
  externalId: string;
  title: string;
  company: string;
  companyDomain?: string;
  location?: string;
  remoteType?: 'remote' | 'hybrid' | 'onsite';
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  techStack?: string[];
  perks?: string[];
  descriptionRaw: string;
  postedAt?: Date;
  applyUrl?: string;
}

// ── Source fetchers ────────────────────────────────────────────────────────────

async function fetchRemotive(): Promise<RawJob[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=50', {
      signal: AbortSignal.timeout(10000),
    });
    const data = (await res.json()) as { jobs: Array<{
      id: number; title: string; company_name: string; company_website?: string;
      candidate_required_location: string; salary?: string; tags: string[];
      description: string; publication_date: string; url?: string;
    }>};
    return (data.jobs ?? []).map((j) => ({
      source: 'remotive' as const,
      externalId: String(j.id),
      title: j.title,
      company: j.company_name,
      companyDomain: j.company_website,
      location: j.candidate_required_location,
      remoteType: 'remote' as const,
      techStack: j.tags ?? [],
      descriptionRaw: j.description,
      postedAt: new Date(j.publication_date),
      applyUrl: j.url ?? `https://remotive.com/remote-jobs/${j.id}`,
    }));
  } catch (err) {
    console.error('[ingestion] Remotive fetch failed:', err);
    return [];
  }
}

async function fetchJobicy(): Promise<RawJob[]> {
  try {
    const res = await fetch('https://jobicy.com/api/v2/remote-jobs?count=50', {
      signal: AbortSignal.timeout(10000),
    });
    const data = (await res.json()) as { jobs: Array<{
      id: number; jobTitle: string; companyName: string;
      jobIndustry?: string[]; jobType?: string; jobDescription: string;
      pubDate: string; jobSlug?: string;
    }>};
    return (data.jobs ?? []).map((j) => ({
      source: 'jobicy' as const,
      externalId: String(j.id),
      title: j.jobTitle,
      company: j.companyName,
      remoteType: 'remote' as const,
      techStack: j.jobIndustry ?? [],
      descriptionRaw: j.jobDescription,
      postedAt: new Date(j.pubDate),
      applyUrl: j.jobSlug ? `https://jobicy.com/jobs/${j.jobSlug}` : `https://jobicy.com/jobs/${j.id}`,
    }));
  } catch (err) {
    console.error('[ingestion] Jobicy fetch failed:', err);
    return [];
  }
}

async function fetchRemoteOK(): Promise<RawJob[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'Worojuro/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const data = (await res.json()) as Array<{
      id?: string; position?: string; company?: string;
      company_website?: string; tags?: string[]; description?: string;
      date?: string; salary_min?: number; salary_max?: number; url?: string;
    }>;
    return data
      .filter((j) => j.id && j.position)
      .map((j) => ({
        source: 'remoteok' as const,
        externalId: j.id!,
        title: j.position!,
        company: j.company ?? 'Unknown',
        companyDomain: j.company_website,
        remoteType: 'remote' as const,
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        techStack: j.tags ?? [],
        descriptionRaw: j.description ?? '',
        postedAt: j.date ? new Date(j.date) : undefined,
        applyUrl: j.url ?? `https://remoteok.com/remote-jobs/${j.id}`,
      }));
  } catch (err) {
    console.error('[ingestion] RemoteOK fetch failed:', err);
    return [];
  }
}

async function fetchHNJobs(): Promise<RawJob[]> {
  try {
    const res = await fetch(
      'https://hn.algolia.com/api/v1/search?query=who+is+hiring&tags=ask_hn&hitsPerPage=20',
      { signal: AbortSignal.timeout(10000) }
    );
    const data = (await res.json()) as { hits: Array<{
      objectID: string; title: string; author: string; story_text?: string; created_at: string;
    }>};
    return (data.hits ?? []).map((h) => ({
      source: 'hn' as const,
      externalId: h.objectID,
      title: h.title,
      company: h.author,
      remoteType: 'remote' as const,
      descriptionRaw: h.story_text ?? h.title,
      postedAt: new Date(h.created_at),
      applyUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
    }));
  } catch (err) {
    console.error('[ingestion] HN fetch failed:', err);
    return [];
  }
}

// Adzuna country → currency mapping
const ADZUNA_CURRENCY: Record<string, string> = {
  us: 'USD', gb: 'GBP', in: 'INR', au: 'AUD', ca: 'CAD',
  de: 'EUR', fr: 'EUR', nl: 'EUR', sg: 'SGD', nz: 'NZD',
  za: 'ZAR', br: 'BRL', mx: 'MXN', pl: 'PLN', ru: 'RUB',
};

async function fetchAdzunaCountry(
  appId: string,
  apiKey: string,
  country: string
): Promise<RawJob[]> {
  try {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.searchParams.set('app_id', appId);
    url.searchParams.set('app_key', apiKey);
    url.searchParams.set('results_per_page', '30');
    url.searchParams.set('what', 'software engineer');
    url.searchParams.set('content-type', 'application/json');

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[ingestion] Adzuna ${country.toUpperCase()} returned ${res.status}`);
      return [];
    }
    const data = (await res.json()) as {
      results: Array<{
        id: string; title: string; company: { display_name: string };
        location: { display_name: string }; description: string;
        salary_min?: number; salary_max?: number; created: string;
        redirect_url?: string;
      }>;
    };

    const currency = ADZUNA_CURRENCY[country] ?? 'USD';
    return (data.results ?? []).map((j) => ({
      source: 'adzuna' as const,
      externalId: `${country}-${j.id}`,   // prefix country to keep dedup global
      title: j.title,
      company: j.company.display_name,
      location: j.location.display_name,
      salaryMin: j.salary_min ? Math.round(j.salary_min) : undefined,
      salaryMax: j.salary_max ? Math.round(j.salary_max) : undefined,
      salaryCurrency: currency,
      descriptionRaw: j.description,
      postedAt: new Date(j.created),
      applyUrl: j.redirect_url,
    }));
  } catch (err) {
    console.error(`[ingestion] Adzuna ${country.toUpperCase()} fetch failed:`, err);
    return [];
  }
}

async function fetchAdzuna(): Promise<RawJob[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;
  if (!appId || !apiKey) return []; // silently skip if keys not set

  // ADZUNA_COUNTRIES — comma-separated country codes, default: us,in
  // e.g. ADZUNA_COUNTRIES=us,in,gb,sg
  const countries = (process.env.ADZUNA_COUNTRIES ?? 'us,in')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

  console.log(`[ingestion] Adzuna fetching from: ${countries.join(', ').toUpperCase()}`);

  // Fetch all countries in parallel — each is capped at 30 results to stay under 250 req/day
  const results = await Promise.all(
    countries.map((c) => fetchAdzunaCountry(appId, apiKey, c))
  );
  return results.flat();
}

/** Strip HTML tags for plain-text descriptionRaw storage */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchHimalayas(): Promise<RawJob[]> {
  try {
    const url = new URL('https://himalayas.app/jobs/api');
    url.searchParams.set('limit', '50');

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Worojuro/1.0' },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) {
      console.warn(`[ingestion] Himalayas returned ${res.status}`);
      return [];
    }

    const data = (await res.json()) as {
      jobs: Array<{
        guid: string;
        title: string;
        companyName: string;
        description: string;
        minSalary: number | null;
        maxSalary: number | null;
        currency: string | null;
        locationRestrictions: string[];
        categories: string[];
        seniority: string[];
        pubDate: number; // Unix timestamp (seconds)
        applicationLink?: string;
      }>;
    };

    return (data.jobs ?? []).map((j) => ({
      source: 'himalayas' as const,
      externalId: j.guid,
      title: j.title,
      company: j.companyName,
      location: j.locationRestrictions.length > 0
        ? j.locationRestrictions.join(', ')
        : 'Worldwide',
      remoteType: 'remote' as const,  // Himalayas is a remote-first board
      salaryMin: j.minSalary ?? undefined,
      salaryMax: j.maxSalary ?? undefined,
      salaryCurrency: j.currency ?? 'USD',
      // categories like "Backend-Development" → "Backend Development"
      techStack: j.categories.map((c) => c.replace(/-/g, ' ')),
      descriptionRaw: stripHtml(j.description),
      postedAt: new Date(j.pubDate * 1000),
      applyUrl: j.applicationLink ?? `https://himalayas.app/jobs/${j.guid}`,
    }));
  } catch (err) {
    console.error('[ingestion] Himalayas fetch failed:', err);
    return [];
  }
}

// ── Main ingestion function ────────────────────────────────────────────────────

export async function ingestJobs(): Promise<void> {
  console.log('[ingestion] Starting job ingestion...');

  const [remotive, jobicy, remoteok, hn, adzuna, himalayas] = await Promise.all([
    fetchRemotive(),
    fetchJobicy(),
    fetchRemoteOK(),
    fetchHNJobs(),
    fetchAdzuna(),
    fetchHimalayas(),
  ]);

  const allJobs = [...remotive, ...jobicy, ...remoteok, ...hn, ...adzuna, ...himalayas];
  console.log(`[ingestion] Fetched ${allJobs.length} raw jobs`);

  let upserted = 0;
  for (const raw of allJobs) {
    const result = await db
      .insert(jobs)
      .values({
        id: randomUUID(),
        source: raw.source,
        externalId: raw.externalId,
        title: raw.title,
        company: raw.company,
        companyDomain: raw.companyDomain ?? null,
        location: raw.location ?? null,
        remoteType: raw.remoteType ?? 'remote',
        salaryMin: raw.salaryMin ?? null,
        salaryMax: raw.salaryMax ?? null,
        salaryCurrency: raw.salaryCurrency ?? 'USD',
        techStack: raw.techStack ?? [],
        perks: raw.perks ?? [],
        descriptionRaw: raw.descriptionRaw,
        postedAt: raw.postedAt ?? null,
        applyUrl: raw.applyUrl ?? null,
      })
      .onConflictDoUpdate({
        target: [jobs.source, jobs.externalId],
        set: {
          // Backfill apply_url on existing rows only when currently null
          applyUrl: sql`COALESCE(${jobs.applyUrl}, EXCLUDED.apply_url)`,
        },
      })
      .returning({ id: jobs.id });

    if (result.length > 0) upserted++;
  }

  console.log(`[ingestion] Upserted ${upserted} jobs (new + apply_url backfill)`);

  // Score new jobs that don't have a woro_score yet
  await scoreNewJobs();

  // Embed new jobs + create job_matches for all users with active resumes
  await matchNewJobs();
}

async function scoreNewJobs(): Promise<void> {
  const unscored = await db.query.jobs.findMany({
    where: and(isNull(jobs.woroScore), eq(jobs.isActive, true)),
    limit: 30, // batch per cron run
    columns: {
      id: true, title: true, company: true, companyDomain: true,
      descriptionRaw: true, postedAt: true, source: true,
    },
  });

  console.log(`[ingestion] Scoring ${unscored.length} unscored jobs...`);

  for (const job of unscored) {
    const result = await scoreJob({
      jobId: job.id,
      title: job.title,
      company: job.company,
      companyDomain: job.companyDomain,
      descriptionRaw: job.descriptionRaw,
      postedAt: job.postedAt,
      source: job.source,
    });

    if (result) {
      await db
        .update(jobs)
        .set({ woroScore: result.score, woroSignals: result.signals })
        .where(eq(jobs.id, job.id));
    }

    await new Promise((r) => setTimeout(r, 300)); // rate limit guard
  }
}
