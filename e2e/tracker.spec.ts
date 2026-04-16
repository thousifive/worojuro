/**
 * E2E — job tracker: Kanban board.
 *
 * Authenticated tests require TEST_USER_EMAIL + TEST_USER_PASSWORD env vars.
 */

import { test, expect } from '@playwright/test';

async function login(page: import('@playwright/test').Page): Promise<boolean> {
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

test.describe('tracker', () => {
  test('tracker page renders Kanban columns', async ({ page }) => {
    const authed = await login(page);
    if (!authed) test.skip();

    await page.goto('/dashboard/tracker');

    // All 8 Kanban stages should be visible as column headings
    const stages = ['Saved', 'Applied', 'OA', 'Phone', 'Interview', 'Offer', 'Rejected', 'Ghosted'];
    for (const stage of stages) {
      await expect(page.getByText(stage).first()).toBeVisible();
    }
  });

  test('tracker shows add application button', async ({ page }) => {
    const authed = await login(page);
    if (!authed) test.skip();

    await page.goto('/dashboard/tracker');
    await expect(page.getByRole('button', { name: /add|track|new/i }).first()).toBeVisible();
  });
});
