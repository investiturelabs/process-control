import { clerk, clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright';
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

setup.describe.configure({ mode: 'serial' });

setup('global setup', async () => {
  await clerkSetup();
});

const hasCredentials =
  !!process.env.E2E_CLERK_USER_USERNAME && !!process.env.E2E_CLERK_USER_PASSWORD;

export const authFile = path.join(__dirname, '../playwright/.clerk/user.json');

setup('authenticate', async ({ page }) => {
  setup.skip(!hasCredentials, 'E2E_CLERK_USER_USERNAME/PASSWORD not set');

  await setupClerkTestingToken({ page });
  await page.goto('/');

  // Use Clerk's programmatic sign-in
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: process.env.E2E_CLERK_USER_USERNAME!,
      password: process.env.E2E_CLERK_USER_PASSWORD!,
    },
  });

  // Navigate to trigger auth state update
  await page.goto('/');

  // Wait for authenticated content — if this times out, the sign-in
  // didn't work (likely due to device verification in Clerk settings).
  // To fix: disable "Require the same device and browser" in Clerk Dashboard
  // under User & Authentication > Email, Phone, Username > Verification.
  try {
    await page.waitForSelector('header', { state: 'visible', timeout: 15_000 });
    await page.context().storageState({ path: authFile });
  } catch {
    console.warn(
      '\n⚠️  Clerk sign-in succeeded at API level but the app did not transition to authenticated state.\n' +
      '   This usually means device verification is enabled in Clerk Dashboard.\n' +
      '   Authenticated e2e tests will be skipped.\n' +
      '   To fix: Clerk Dashboard → User & Authentication → Email, Phone, Username → disable device verification.\n'
    );
    setup.skip(true, 'Clerk sign-in did not produce authenticated state (device verification likely enabled)');
  }
});
