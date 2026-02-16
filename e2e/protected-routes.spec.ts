import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

const BASE = process.env.VITE_BASE_PATH || '';

test.describe('Protected routes show sign-in when unauthenticated', () => {
  const protectedPaths = [
    '/',
    '/audit',
    '/history',
    '/settings',
    '/team',
  ];

  for (const path of protectedPaths) {
    test(`${path} shows sign-in form`, async ({ page }) => {
      await setupClerkTestingToken({ page });

      await page.goto(`${BASE}${path}`);
      // Current app renders <SignIn> inline for unauthenticated users
      await expect(page.locator('[data-clerk-component="SignIn"], .cl-signIn-root')).toBeVisible({
        timeout: 10_000,
      });
    });
  }
});
