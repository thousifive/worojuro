/**
 * TDD — job ingestion dedup and Woro alert trigger tests.
 *
 * Critical rules:
 * 1. Same (source, external_id) never duplicates in jobs table
 * 2. Woro alert created when score < 40 for a job in user's feed
 */

import { describe, it, expect } from 'vitest';

// Dedup logic — extracted for unit testing
interface RawJob {
  source: string;
  externalId: string;
  title: string;
}

function deduplicateJobs(jobs: RawJob[]): RawJob[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.source}:${job.externalId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

describe('job deduplication', () => {
  it('removes duplicate (source, external_id) pairs', () => {
    const jobs: RawJob[] = [
      { source: 'remotive', externalId: 'rem-001', title: 'Engineer A' },
      { source: 'remotive', externalId: 'rem-001', title: 'Engineer A (duplicate)' },
      { source: 'jobicy', externalId: 'rem-001', title: 'Engineer B (different source)' },
    ];
    const result = deduplicateJobs(jobs);
    expect(result).toHaveLength(2);
    expect(result.find((j) => j.title === 'Engineer A (duplicate)')).toBeUndefined();
  });

  it('keeps jobs with same external_id but different source', () => {
    const jobs: RawJob[] = [
      { source: 'remotive', externalId: '123', title: 'Job from Remotive' },
      { source: 'jobicy', externalId: '123', title: 'Job from Jobicy' },
    ];
    const result = deduplicateJobs(jobs);
    expect(result).toHaveLength(2);
  });

  it('handles empty array', () => {
    expect(deduplicateJobs([])).toHaveLength(0);
  });

  it('handles single job', () => {
    const jobs: RawJob[] = [{ source: 'hn', externalId: 'hn-001', title: 'HN Job' }];
    expect(deduplicateJobs(jobs)).toHaveLength(1);
  });
});

// ── Himalayas fetcher mapper tests ────────────────────────────────────────────

interface HimalayasJob {
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
  pubDate: number;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function mapHimalayasJob(j: HimalayasJob) {
  return {
    source: 'himalayas' as const,
    externalId: j.guid,
    title: j.title,
    company: j.companyName,
    location: j.locationRestrictions.length > 0 ? j.locationRestrictions.join(', ') : 'Worldwide',
    remoteType: 'remote' as const,
    salaryMin: j.minSalary ?? undefined,
    salaryMax: j.maxSalary ?? undefined,
    salaryCurrency: j.currency ?? 'USD',
    techStack: j.categories.map((c) => c.replace(/-/g, ' ')),
    descriptionRaw: stripHtml(j.description),
    postedAt: new Date(j.pubDate * 1000),
  };
}

const FIXTURE: HimalayasJob = {
  guid: 'https://himalayas.app/companies/acme/jobs/senior-engineer-123',
  title: 'Senior Engineer',
  companyName: 'Acme Corp',
  description: '<h3>Description</h3><p>Build great things.</p>',
  minSalary: 80000,
  maxSalary: 120000,
  currency: 'USD',
  locationRestrictions: ['India', 'United States'],
  categories: ['Backend-Development', 'Software-Architecture'],
  seniority: ['Senior'],
  pubDate: 1700000000,
};

describe('Himalayas fetcher mapper', () => {
  it('maps guid to externalId', () => {
    expect(mapHimalayasJob(FIXTURE).externalId).toBe(FIXTURE.guid);
  });

  it('strips HTML from description', () => {
    const result = mapHimalayasJob(FIXTURE);
    expect(result.descriptionRaw).not.toContain('<');
    expect(result.descriptionRaw).toContain('Build great things');
  });

  it('joins multiple locationRestrictions', () => {
    expect(mapHimalayasJob(FIXTURE).location).toBe('India, United States');
  });

  it('falls back to Worldwide when locationRestrictions is empty', () => {
    const result = mapHimalayasJob({ ...FIXTURE, locationRestrictions: [] });
    expect(result.location).toBe('Worldwide');
  });

  it('converts category kebab-case to space-separated', () => {
    const result = mapHimalayasJob(FIXTURE);
    expect(result.techStack).toContain('Backend Development');
    expect(result.techStack).toContain('Software Architecture');
  });

  it('maps salary fields', () => {
    const result = mapHimalayasJob(FIXTURE);
    expect(result.salaryMin).toBe(80000);
    expect(result.salaryMax).toBe(120000);
    expect(result.salaryCurrency).toBe('USD');
  });

  it('defaults currency to USD when null', () => {
    const result = mapHimalayasJob({ ...FIXTURE, currency: null });
    expect(result.salaryCurrency).toBe('USD');
  });

  it('converts pubDate unix timestamp to Date', () => {
    const result = mapHimalayasJob(FIXTURE);
    expect(result.postedAt).toBeInstanceOf(Date);
    expect(result.postedAt.getFullYear()).toBe(2023);
  });

  it('sets source as himalayas', () => {
    expect(mapHimalayasJob(FIXTURE).source).toBe('himalayas');
  });

  it('sets remoteType as remote', () => {
    expect(mapHimalayasJob(FIXTURE).remoteType).toBe('remote');
  });
});

describe('woro alert trigger logic', () => {
  it('triggers alert when score < 40', () => {
    const shouldAlert = (score: number | null) => score !== null && score < 40;
    expect(shouldAlert(18)).toBe(true);
    expect(shouldAlert(39)).toBe(true);
  });

  it('does not trigger alert when score >= 40', () => {
    const shouldAlert = (score: number | null) => score !== null && score < 40;
    expect(shouldAlert(40)).toBe(false);
    expect(shouldAlert(75)).toBe(false);
  });

  it('does not trigger alert when score is null (unscored)', () => {
    const shouldAlert = (score: number | null) => score !== null && score < 40;
    // null = async pending, not suspicious — never alert on null
    expect(shouldAlert(null)).toBe(false);
  });
});
