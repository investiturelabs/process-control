import { validateEnv } from '@/lib/env';

const env = validateEnv();

export const config = {
  basePath: env.VITE_BASE_PATH,
  convexUrl: env.VITE_CONVEX_URL,
  sentryDsn: env.VITE_SENTRY_DSN,
} as const;
