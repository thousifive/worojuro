/**
 * E2E — job feed: apply confirm flow.
 *
 * Authenticated tests require TEST_USER_EMAIL + TEST_USER_PASSWORD env vars.
 * Without them, tests are skipped.
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

test.describe('job feed', () => {
  test('feed page loads with job cards or empty state', async ({ page }) => {
    const authed = await login(page);
    if (!authed) test.skip();

    await page.goto('/dashboard/feed');
    // Either job cards or empty state text appears
    const hasCards = await page.locator('article').count() > 0;
    const hasEmpty = await page.getByText(/no jobs|empty|start/i).isVisible().catch(() => false);
    expect(hasCards || hasEmpty).toBeTruthy();
  });

  test('apply button opens confirm prompt', async ({ page }) => {
    const authed = await login(page);
    if (!authed) test.skip();

    await page.goto('/dashboard/feed');

    // Wait for at least one Apply button
    const applyBtn = page.getByRole('button', { name: 'Apply' }).first();
    const count = await applyBtn.count();
    if (count === 0) {
      test.skip(); // No feed items — skip
      return;
    }

    // Intercept window.open so it doesn't actually navigate
    await page.addInitScript(() => {
      window.open = () => null;
    });

    await applyBtn.click();

    // Confirm prompt should appear
    await expect(page.getByText('Did you apply?')).toBeVisible({ timeout: 3_000 });
    await expect(page.getByRole('button', { name: 'Yes, I applied' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No' })).toBeVisible();
  });

  test('"No" on confirm prompt dismisses it', async ({ page }) => {
    const authed = await login(page);
    if (!authed) test.skip();

    await page.goto('/dashboard/feed');

    const applyBtn = page.getByRole('button', { name: 'Apply' }).first();
    if (await applyBtn.count() === 0) {
      test.skip();
      return;
    }

    await page.addInitScript(() => { window.open = () => null; });
    await applyBtn.click();
    await expect(page.getByText('Did you apply?')).toBeVisible({ timeout: 3_000 });

    await page.getByRole('button', { name: 'No' }).click();
    await expect(page.getByText('Did you apply?')).not.toBeVisible({ timeout: 2_000 });
  });
});
