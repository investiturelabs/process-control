import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

const BASE = process.env.VITE_BASE_PATH || '';

/** Wait for the app to finish loading after navigation */
async function waitForAppReady(page: import('@playwright/test').Page) {
  await Promise.race([
    page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 30_000 }),
    page.waitForSelector('header', { state: 'visible', timeout: 30_000 }),
  ]).catch(() => {});
  // Brief settle time for Convex sync
  await page.waitForTimeout(1_000);
}

test.describe('Authenticated user flows', () => {
  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });
  });

  test('dashboard loads after sign-in', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await waitForAppReady(page);

    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page.locator('header').first()).toBeVisible({ timeout: 15_000 });
  });

  test('can navigate to audit page', async ({ page }) => {
    await page.goto(`${BASE}/audit`);
    await waitForAppReady(page);

    await expect(page).toHaveURL(/\/audit/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('can navigate to history page', async ({ page }) => {
    await page.goto(`${BASE}/history`);
    await waitForAppReady(page);

    await expect(page).toHaveURL(/\/history/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('can navigate to settings page', async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await waitForAppReady(page);

    await expect(page).toHaveURL(/\/settings/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('Clerk UserButton is visible in header', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await waitForAppReady(page);

    await expect(
      page.locator('.cl-userButtonTrigger')
    ).toBeVisible({ timeout: 15_000 });
  });

  test('unknown routes redirect to dashboard', async ({ page }) => {
    await page.goto(`${BASE}/nonexistent-route`);
    await waitForAppReady(page);

    await expect(page).not.toHaveURL(/\/sign-in/);
    await expect(page).not.toHaveURL(/nonexistent/);
  });
});
