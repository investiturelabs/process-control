import { setupClerkTestingToken, clerk } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

const BASE = '/process-control';

/**
 * These tests require a test user account in Clerk.
 * Set these env vars before running:
 *   E2E_CLERK_USER_USERNAME — email or username of the test user
 *   E2E_CLERK_USER_PASSWORD — password of the test user
 *
 * Skip gracefully if credentials are not set.
 */
const hasCredentials =
  !!process.env.E2E_CLERK_USER_USERNAME && !!process.env.E2E_CLERK_USER_PASSWORD;

test.describe('Authenticated user flows', () => {
  test.skip(!hasCredentials, 'Skipping: E2E_CLERK_USER_USERNAME and E2E_CLERK_USER_PASSWORD not set');

  test.beforeEach(async ({ page }) => {
    await setupClerkTestingToken({ page });

    // Sign in using Clerk's testing helper
    await page.goto(`${BASE}/`);
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'password',
        identifier: process.env.E2E_CLERK_USER_USERNAME!,
        password: process.env.E2E_CLERK_USER_PASSWORD!,
      },
    });
  });

  test('dashboard loads after sign-in', async ({ page }) => {
    await page.goto(`${BASE}/`);
    // Wait for the app to load (loading screen to disappear)
    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 15_000 }).catch(() => {
      // Loading may have already finished
    });

    // Should be on the dashboard, not redirected to sign-in
    await expect(page).not.toHaveURL(/\/sign-in/);

    // Layout header should be visible
    await expect(page.locator('header, nav')).toBeVisible({ timeout: 10_000 });
  });

  test('can navigate to audit page', async ({ page }) => {
    await page.goto(`${BASE}/audit`);

    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 15_000 }).catch(() => {});

    await expect(page).toHaveURL(/\/audit/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('can navigate to history page', async ({ page }) => {
    await page.goto(`${BASE}/history`);

    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 15_000 }).catch(() => {});

    await expect(page).toHaveURL(/\/history/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('can navigate to settings page', async ({ page }) => {
    await page.goto(`${BASE}/settings`);

    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 15_000 }).catch(() => {});

    await expect(page).toHaveURL(/\/settings/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('Clerk UserButton is visible in header', async ({ page }) => {
    await page.goto(`${BASE}/`);

    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 15_000 }).catch(() => {});

    // Clerk renders a UserButton component in the header
    await expect(page.locator('button[aria-label*="user"], .cl-userButtonTrigger')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('unknown routes redirect to dashboard', async ({ page }) => {
    await page.goto(`${BASE}/nonexistent-route`);

    await page.waitForSelector('text=Loading...', { state: 'hidden', timeout: 15_000 }).catch(() => {});

    // Should redirect to /process-control/ (dashboard) due to the catch-all <Navigate to="/" replace />
    await expect(page).toHaveURL(/\/process-control\/?$/);
  });
});
