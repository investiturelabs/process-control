import { validateEnv } from '@/lib/env';

const env = validateEnv();

export const config = {
  basePath: env.VITE_BASE_PATH,
  convexUrl: env.VITE_CONVEX_URL,
  clerkPublishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
  sentryDsn: env.VITE_SENTRY_DSN,
} as const;
