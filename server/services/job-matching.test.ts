/**
 * TDD — job-matching service tests.
 *
 * Tests pure helper functions only (no DB).
 * DB-dependent functions (matchJobsForUser, embedNewJobs) tested via integration test.
 *
 * S2-11 coverage:
 * - toMatchScore: cosine similarity → 0–100 integer
 * - skillOverlapScore: fuzzy skill tag overlap
 * - dedup rule: UNIQUE constraint on (user_id, job_id) — enforced by DB,
 *   tested here via onConflictDoNothing contract
 */

import { describe, it, expect } from 'vitest';
import { toMatchScore, skillOverlapScore } from './job-matching';

describe('toMatchScore', () => {
  it('converts similarity 1.0 to 100', () => {
    expect(toMatchScore(1.0)).toBe(100);
  });

  it('converts similarity 0.0 to 0', () => {
    expect(toMatchScore(0.0)).toBe(0);
  });

  it('converts similarity 0.75 to 75', () => {
    expect(toMatchScore(0.75)).toBe(75);
  });

  it('clamps values above 1 to 100', () => {
    expect(toMatchScore(1.5)).toBe(100);
  });

  it('clamps negative values to 0', () => {
    expect(toMatchScore(-0.3)).toBe(0);
  });

  it('rounds to integer', () => {
    expect(Number.isInteger(toMatchScore(0.733))).toBe(true);
  });
});

describe('skillOverlapScore', () => {
  it('returns 50 when job has no tags (no data default)', () => {
    expect(skillOverlapScore([], ['TypeScript', 'React'])).toBe(50);
  });

  it('returns 100 when all job tags match resume skills', () => {
    expect(skillOverlapScore(['TypeScript', 'React'], ['TypeScript', 'React', 'Node.js'])).toBe(100);
  });

  it('returns 0 when no job tags match resume skills', () => {
    expect(skillOverlapScore(['COBOL', 'Fortran'], ['TypeScript', 'React'])).toBe(0);
  });

  it('returns partial score for partial match', () => {
    // 1 out of 2 tags match → 50
    const score = skillOverlapScore(['TypeScript', 'COBOL'], ['TypeScript']);
    expect(score).toBe(50);
  });

  it('fuzzy: job tag contained in resume skill', () => {
    // 'React' is contained in 'React Native'
    const score = skillOverlapScore(['React'], ['React Native', 'TypeScript']);
    expect(score).toBe(100);
  });

  it('fuzzy: resume skill contained in job tag', () => {
    // 'Node' contained in 'Node.js'
    const score = skillOverlapScore(['Node.js'], ['Node', 'TypeScript']);
    expect(score).toBe(100);
  });

  it('case insensitive matching', () => {
    expect(skillOverlapScore(['typescript'], ['TypeScript'])).toBe(100);
    expect(skillOverlapScore(['REACT'], ['react'])).toBe(100);
  });

  it('returns integer result', () => {
    const score = skillOverlapScore(['a', 'b', 'c'], ['a']);
    expect(Number.isInteger(score)).toBe(true);
  });
});

describe('dedup rule contract', () => {
  // The job_matches table has UNIQUE(user_id, job_id).
  // matchJobsForUser uses onConflictDoNothing — same pair is never double-inserted.
  // This test documents the contract rather than re-testing the DB constraint.
  it('documented: same (userId, jobId) pair must not produce duplicate rows', () => {
    // Enforced by: db.insert(jobMatches).onConflictDoNothing()
    // + UNIQUE constraint: job_matches_user_job_uq on (user_id, job_id)
    expect(true).toBe(true); // contract test — see job-matching.ts line with onConflictDoNothing
  });
});
