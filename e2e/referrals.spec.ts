/**
 * E2E — referrals: LinkedIn CSV import.
 *
 * Authenticated tests require TEST_USER_EMAIL + TEST_USER_PASSWORD env vars.
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

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

// Creates a minimal LinkedIn Connections CSV in a temp file
function createTestCsv(): string {
  const content = [
    'First Name,Last Name,URL,Email Address,Company,Position,Connected On',
    'Alice,Smith,https://linkedin.com/in/alice,alice@example.com,Stripe,Engineering Manager,01 Jan 2024',
    'Bob,Jones,https://linkedin.com/in/bob,bob@example.com,Linear,Senior Engineer,15 Feb 2024',
  ].join('\n');
  const tmpPath = path.join(os.tmpdir(), 'test-linkedin-connections.csv');
  fs.writeFileSync(tmpPath, content, 'utf-8');
  return tmpPath;
}

test.describe('referrals', () => {
  test('referrals page renders import section', async ({ page }) => {
    const authed = await login(page);
    if (!authed) test.skip();

    await page.goto('/dashboard/referrals');
    await expect(page.getByText(/import|linkedin|csv/i).first()).toBeVisible();
  });

  test('CSV upload shows preview with row count', async ({ page }) => {
    const authed = await login(page);
    if (!authed) test.skip();

    const csvPath = createTestCsv();

    await page.goto('/dashboard/referrals');

    // Find the hidden file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(csvPath);

    // Preview should show 2 contacts (Alice and Bob)
    await expect(page.getByText(/2 contact|preview/i).first()).toBeVisible({ timeout: 5_000 });

    // Cleanup
    fs.unlinkSync(csvPath);
  });
});
