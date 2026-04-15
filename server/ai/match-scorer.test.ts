/**
 * TDD — match scorer tests.
 *
 * Rules:
 * 1. Score always 0–100 when AI succeeds
 * 2. Returns null on failure (graceful degradation)
 * 3. Final score blends vectorSimilarity (40%) + AI average (60%)
 */

import { describe, it, expect } from 'vitest';

// Score blending formula — extracted for unit testing
function blendScore(vectorSimilarity: number, aiBreakdown: {
  skills_score: number;
  tech_score: number;
  salary_score: number;
  location_score: number;
  perks_score: number;
}): number {
  const aiAvg = (
    aiBreakdown.skills_score +
    aiBreakdown.tech_score +
    aiBreakdown.salary_score +
    aiBreakdown.location_score +
    aiBreakdown.perks_score
  ) / 5;
  const raw = vectorSimilarity * 100 * 0.4 + aiAvg * 0.6;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

describe('match score blending', () => {
  it('perfect vector + perfect AI = 100', () => {
    const score = blendScore(1.0, {
      skills_score: 100,
      tech_score: 100,
      salary_score: 100,
      location_score: 100,
      perks_score: 100,
    });
    expect(score).toBe(100);
  });

  it('zero vector + zero AI = 0', () => {
    const score = blendScore(0, {
      skills_score: 0,
      tech_score: 0,
      salary_score: 0,
      location_score: 0,
      perks_score: 0,
    });
    expect(score).toBe(0);
  });

  it('high vector similarity boosts overall score even with avg AI', () => {
    const highVector = blendScore(0.95, {
      skills_score: 60,
      tech_score: 60,
      salary_score: 60,
      location_score: 60,
      perks_score: 60,
    });
    const lowVector = blendScore(0.3, {
      skills_score: 60,
      tech_score: 60,
      salary_score: 60,
      location_score: 60,
      perks_score: 60,
    });
    expect(highVector).toBeGreaterThan(lowVector);
  });

  it('clamps to 0 if inputs produce negative (should not happen, but safeguard)', () => {
    // Negative vectorSimilarity is invalid but guard against it
    const score = blendScore(-1, {
      skills_score: 0, tech_score: 0, salary_score: 0, location_score: 0, perks_score: 0,
    });
    expect(score).toBe(0);
  });

  it('result is always an integer (rounded)', () => {
    const score = blendScore(0.7, {
      skills_score: 73, tech_score: 68, salary_score: 80, location_score: 90, perks_score: 55,
    });
    expect(Number.isInteger(score)).toBe(true);
  });
});
