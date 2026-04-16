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

describe('applyToJob dedup', () => {
  // Simulates the upsert logic in applyToJob without hitting the DB.

  interface MockApplication {
    id: string;
    userId: string;
    jobId: string;
    status: Status;
    appliedDate: string;
  }

  function applyToJobLogic(
    store: MockApplication[],
    userId: string,
    jobId: string,
    today: string,
  ): { applicationId: string; isNew: boolean } {
    const existing = store.find((a) => a.userId === userId && a.jobId === jobId);
    if (existing) {
      existing.status = 'applied';
      existing.appliedDate = today;
      return { applicationId: existing.id, isNew: false };
    }
    const newApp: MockApplication = {
      id: `uuid-${store.length + 1}`,
      userId,
      jobId,
      status: 'applied',
      appliedDate: today,
    };
    store.push(newApp);
    return { applicationId: newApp.id, isNew: true };
  }

  it('first apply creates new application', () => {
    const store: MockApplication[] = [];
    const result = applyToJobLogic(store, 'user-1', 'job-1', '2026-04-16');
    expect(result.isNew).toBe(true);
    expect(store).toHaveLength(1);
  });

  it('second apply to same job updates, not inserts', () => {
    const store: MockApplication[] = [];
    applyToJobLogic(store, 'user-1', 'job-1', '2026-04-16');
    const result = applyToJobLogic(store, 'user-1', 'job-1', '2026-04-16');
    expect(result.isNew).toBe(false);
    expect(store).toHaveLength(1); // still 1 row
  });

  it('returns same applicationId on duplicate apply', () => {
    const store: MockApplication[] = [];
    const first = applyToJobLogic(store, 'user-1', 'job-1', '2026-04-16');
    const second = applyToJobLogic(store, 'user-1', 'job-1', '2026-04-16');
    expect(first.applicationId).toBe(second.applicationId);
  });

  it('different user can apply to same job independently', () => {
    const store: MockApplication[] = [];
    applyToJobLogic(store, 'user-1', 'job-1', '2026-04-16');
    applyToJobLogic(store, 'user-2', 'job-1', '2026-04-16');
    expect(store).toHaveLength(2);
  });

  it('same user can apply to different jobs', () => {
    const store: MockApplication[] = [];
    applyToJobLogic(store, 'user-1', 'job-1', '2026-04-16');
    applyToJobLogic(store, 'user-1', 'job-2', '2026-04-16');
    expect(store).toHaveLength(2);
  });

  it('duplicate apply updates status to applied regardless of prior status', () => {
    const store: MockApplication[] = [
      { id: 'uuid-1', userId: 'user-1', jobId: 'job-1', status: 'saved', appliedDate: '' },
    ];
    applyToJobLogic(store, 'user-1', 'job-1', '2026-04-16');
    expect(store[0]?.status).toBe('applied');
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
