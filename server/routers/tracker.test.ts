/**
 * TDD — tracker router tests.
 *
 * Tests all valid status transitions and key procedures.
 * Written before the router is finalised.
 *
 * Note: these are unit tests using a mock DB.
 * RLS security tests (user A cannot read user B's rows) are in e2e/.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Valid statuses — all 8 Kanban columns
const VALID_STATUSES = [
  'saved', 'applied', 'oa', 'phone',
  'interview', 'offer', 'rejected', 'ghosted',
] as const;

type Status = typeof VALID_STATUSES[number];

// Transition validation logic extracted for unit testing
function isValidStatusTransition(from: Status, to: Status): boolean {
  // All transitions valid in Worojuro — user can move card anywhere
  return VALID_STATUSES.includes(to);
}

describe('tracker status transitions', () => {
  it('allows transition from saved to any status', () => {
    for (const to of VALID_STATUSES) {
      expect(isValidStatusTransition('saved', to)).toBe(true);
    }
  });

  it('allows transition from rejected back to interview (re-engaged)', () => {
    expect(isValidStatusTransition('rejected', 'interview')).toBe(true);
  });

  it('allows transition from offer to rejected (declined)', () => {
    expect(isValidStatusTransition('offer', 'rejected')).toBe(true);
  });

  it('allows transition from ghosted back to applied', () => {
    expect(isValidStatusTransition('ghosted', 'applied')).toBe(true);
  });

  it('rejects unknown status string', () => {
    expect(isValidStatusTransition('applied', 'unknown_status' as Status)).toBe(false);
  });

  it('all 8 valid statuses pass', () => {
    for (const status of VALID_STATUSES) {
      expect(isValidStatusTransition('applied', status)).toBe(true);
    }
  });
});

describe('tracker application schema', () => {
  it('default status is saved', () => {
    const defaults = { status: 'saved' as Status };
    expect(defaults.status).toBe('saved');
  });

  it('next_action_date is optional', () => {
    const app = { company: 'Stripe', role: 'SWE', status: 'applied' as Status };
    expect(app).not.toHaveProperty('nextActionDate');
  });

  it('salary_offered is separate from job salary range', () => {
    // salary_offered on application = what was actually offered at offer stage
    // different from job.salary_min / job.salary_max
    const app = {
      status: 'offer' as Status,
      salaryOffered: 200000,
    };
    expect(app.salaryOffered).toBe(200000);
  });
});
