/**
 * TDD — getWoroBadgeTier utility tests.
 * These run in Vitest (fast, no browser needed).
 */

import { describe, it, expect } from 'vitest';
import { getWoroBadgeTier } from './index';

describe('getWoroBadgeTier', () => {
  it('returns null for null score (unscored)', () => {
    expect(getWoroBadgeTier(null)).toBeNull();
  });

  it('returns red for score 0', () => {
    expect(getWoroBadgeTier(0)).toBe('red');
  });

  it('returns red for score 18', () => {
    expect(getWoroBadgeTier(18)).toBe('red');
  });

  it('returns red for score 39 (upper boundary)', () => {
    expect(getWoroBadgeTier(39)).toBe('red');
  });

  it('returns amber for score 40 (lower boundary)', () => {
    expect(getWoroBadgeTier(40)).toBe('amber');
  });

  it('returns amber for score 55', () => {
    expect(getWoroBadgeTier(55)).toBe('amber');
  });

  it('returns amber for score 70 (upper boundary)', () => {
    expect(getWoroBadgeTier(70)).toBe('amber');
  });

  it('returns green for score 71 (lower boundary)', () => {
    expect(getWoroBadgeTier(71)).toBe('green');
  });

  it('returns green for score 85', () => {
    expect(getWoroBadgeTier(85)).toBe('green');
  });

  it('returns green for score 100', () => {
    expect(getWoroBadgeTier(100)).toBe('green');
  });
});
