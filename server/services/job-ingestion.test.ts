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
