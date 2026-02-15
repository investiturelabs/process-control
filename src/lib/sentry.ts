import * as Sentry from '@sentry/react';
import { initErrorTracking } from '@/lib/errorTracking';

export function initSentry(dsn: string | undefined) {
  if (!dsn || import.meta.env.DEV) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Only send 100% of errors in production; adjust as needed
    sampleRate: 1.0,
  });

  initErrorTracking({
    captureException: (error, context) => {
      Sentry.captureException(error, { extra: context });
    },
    captureMessage: (message) => {
      Sentry.captureMessage(message);
    },
    setUser: (user) => {
      Sentry.setUser(user);
    },
  });
}
