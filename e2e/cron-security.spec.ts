/**
 * E2E — cron route security tests.
 * TDD: these tests must pass before cron routes are considered complete.
 *
 * Rule: cron routes return 401 without correct CRON_SECRET.
 */

import { test, expect } from '@playwright/test';

test.describe('cron route security', () => {
  test('GET /api/cron/ingest without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/cron/ingest');
    expect(response.status()).toBe(401);
  });

  test('GET /api/cron/digest without auth returns 401', async ({ request }) => {
    const response = await request.get('/api/cron/digest');
    expect(response.status()).toBe(401);
  });

  test('GET /api/cron/ingest with wrong secret returns 401', async ({ request }) => {
    const response = await request.get('/api/cron/ingest', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /api/cron/digest with wrong secret returns 401', async ({ request }) => {
    const response = await request.get('/api/cron/digest', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    expect(response.status()).toBe(401);
  });
});
