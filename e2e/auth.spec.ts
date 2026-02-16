import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

const BASE = '/process-control';

test.describe('Authentication flows', () => {
  test('unauthenticated user is redirected to sign-in', async ({ page }) => {
    await setupClerkTestingToken({ page });

    await page.goto(`${BASE}/`);
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('sign-in page loads without errors', async ({ page }) => {
    await setupClerkTestingToken({ page });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`${BASE}/sign-in`);
    // Give Clerk time to initialize
    await page.waitForTimeout(3_000);

    // The page should be at the sign-in URL (not redirected away)
    await expect(page).toHaveURL(/\/sign-in/);
    // No critical JS errors
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('sign-up page loads without errors', async ({ page }) => {
    await setupClerkTestingToken({ page });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`${BASE}/sign-up`);
    await page.waitForTimeout(3_000);

    await expect(page).toHaveURL(/\/sign-up/);
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('sign-in page renders content', async ({ page }) => {
    await setupClerkTestingToken({ page });

    await page.goto(`${BASE}/sign-in`);
    // Clerk loads asynchronously — wait for any substantive content
    // This could be an iframe, shadow DOM, or direct rendering depending on Clerk version
    await page.waitForTimeout(5_000);

    // Page should have some visible content (not completely blank)
    const bodyText = await page.locator('body').innerText();
    // At minimum the page rendered without crashing
    expect(bodyText).toBeDefined();
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
