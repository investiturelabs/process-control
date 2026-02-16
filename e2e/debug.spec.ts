import { test, expect } from '@playwright/test';

const BASE = '/process-control';

test('debug sign-in page', async ({ page }) => {
  const logs: string[] = [];
  const errors: string[] = [];

  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto(`${BASE}/sign-in`);
  await page.waitForTimeout(5_000);

  console.log('=== CONSOLE LOGS ===');
  logs.forEach((l) => console.log(l));
  console.log('=== PAGE ERRORS ===');
  errors.forEach((e) => console.log(e));
  console.log('=== PAGE CONTENT ===');
  const html = await page.locator('#root').innerHTML();
  console.log(html.substring(0, 2000));
});
