import { clerk, clerkSetup, setupClerkTestingToken } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

setup.describe.configure({ mode: 'serial' });

setup('global setup', async () => {
  await clerkSetup();
});

const hasCredentials =
  !!process.env.E2E_CLERK_USER_USERNAME && !!process.env.CLERK_SECRET_KEY;

export const authFile = path.join(__dirname, '../playwright/.clerk/user.json');

setup('authenticate', async ({ page }) => {
  setup.skip(!hasCredentials, 'E2E_CLERK_USER_USERNAME or CLERK_SECRET_KEY not set');

  await page.goto('/');

  // Use the emailAddress path which creates a server-side sign-in token
  // via the Backend SDK. This bypasses ALL client-side verification
  // (including device verification) because the token is server-signed.
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_CLERK_USER_USERNAME!,
  });

  // Navigate to verify auth state propagated
  await page.goto('/');

  await page.waitForSelector('header', { state: 'visible', timeout: 15_000 });
  await page.context().storageState({ path: authFile });
});
