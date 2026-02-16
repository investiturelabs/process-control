import { setupClerkTestingToken } from '@clerk/testing/playwright';
import { test, expect } from '@playwright/test';

const BASE = '/process-control';

test.describe('Protected routes redirect when unauthenticated', () => {
  const protectedPaths = [
    '/',
    '/audit',
    '/history',
    '/settings',
    '/team',
  ];

  for (const path of protectedPaths) {
    test(`${path} redirects to sign-in`, async ({ page }) => {
      await setupClerkTestingToken({ page });

      await page.goto(`${BASE}${path}`);
      await expect(page).toHaveURL(/\/sign-in/);
    });
  }
});
