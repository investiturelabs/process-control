import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

const BASE = process.env.VITE_BASE_PATH || '';

test.describe('Authentication flows', () => {
  test('unauthenticated user sees sign-in form', async ({ page }) => {
    await setupClerkTestingToken({ page });

    await page.goto(`${BASE}/`);
    // Current app renders <SignIn> inline (not a redirect to /sign-in)
    await expect(page.locator('[data-clerk-component="SignIn"], .cl-signIn-root')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('sign-in page loads without errors', async ({ page }) => {
    await setupClerkTestingToken({ page });

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto(`${BASE}/sign-in`);
    // Give Clerk time to initialize
    await page.waitForTimeout(3_000);

    // No critical JS errors
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

  test('sign-in form renders content', async ({ page }) => {
    await setupClerkTestingToken({ page });

    await page.goto(`${BASE}/`);
    // Clerk loads asynchronously — wait for the sign-in component
    await expect(page.locator('[data-clerk-component="SignIn"], .cl-signIn-root')).toBeVisible({
      timeout: 10_000,
    });

    // Page should have some visible content (not completely blank)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toBeDefined();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
