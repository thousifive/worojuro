/**
 * E2E — dashboard routing and authenticated page guards.
 *
 * Unauthenticated tests run without credentials.
 * Authenticated tests require TEST_USER_EMAIL + TEST_USER_PASSWORD env vars.
 * When not set, authenticated tests are skipped.
 */

import { test, expect } from '@playwright/test';

// ── Unauthenticated route guards ──────────────────────────────────────────────

test.describe('unauthenticated routing', () => {
  const protectedRoutes = [
    '/dashboard',
    '/dashboard/feed',
    '/dashboard/tracker',
    '/dashboard/settings',
    '/dashboard/referrals',
    '/dashboard/notifications',
    '/dashboard/pulse',
    '/dashboard/analysis',
    '/dashboard/vault',
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

// ── Authenticated dashboard tests ─────────────────────────────────────────────

async function loginIfCredentialsProvided(page: import('@playwright/test').Page) {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) return false;

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  return true;
}

test.describe('authenticated dashboard', () => {
  test('dashboard overview shows stat cards', async ({ page }) => {
    const authed = await loginIfCredentialsProvided(page);
    if (!authed) test.skip();

    await page.goto('/dashboard');
    await expect(page.getByText('Open applications')).toBeVisible();
    await expect(page.getByText('Feed matches')).toBeVisible();
    await expect(page.getByText('Avg Woro score')).toBeVisible();
    await expect(page.getByText('Unread alerts')).toBeVisible();
  });

  test('quick action links are present', async ({ page }) => {
    const authed = await loginIfCredentialsProvided(page);
    if (!authed) test.skip();

    await page.goto('/dashboard');
    await expect(page.getByRole('link', { name: 'Browse feed' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Track application' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Upload resume' })).toBeVisible();
  });
});
