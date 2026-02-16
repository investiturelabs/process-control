export interface EnvConfig {
  VITE_CONVEX_URL: string;
  VITE_CLERK_PUBLISHABLE_KEY: string;
  VITE_BASE_PATH: string;
  VITE_SENTRY_DSN: string | undefined;
}

export function validateEnv(): EnvConfig {
  const convexUrl = import.meta.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error(
      'Missing required environment variable: VITE_CONVEX_URL. ' +
      'Copy .env.example to .env.local and fill in the values.'
    );
  }

  try {
    new URL(convexUrl);
  } catch {
    throw new Error(
      `Invalid VITE_CONVEX_URL: "${convexUrl}" is not a valid URL.`
    );
  }

  const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!clerkKey) {
    throw new Error(
      'Missing required environment variable: VITE_CLERK_PUBLISHABLE_KEY. ' +
      'Copy .env.example to .env.local and fill in the values.'
    );
  }

  const basePath = import.meta.env.VITE_BASE_PATH || '/';
  if (!basePath.startsWith('/')) {
    throw new Error(
      `Invalid VITE_BASE_PATH: "${basePath}" must start with "/".`
    );
  }

  const sentryDsn = import.meta.env.VITE_SENTRY_DSN || undefined;

  return {
    VITE_CONVEX_URL: convexUrl,
    VITE_CLERK_PUBLISHABLE_KEY: clerkKey,
    VITE_BASE_PATH: basePath,
    VITE_SENTRY_DSN: sentryDsn,
  };
}
