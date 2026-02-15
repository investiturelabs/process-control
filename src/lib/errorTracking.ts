type ErrorTrackingUser = { id: string; email: string; name: string } | null;

type ErrorTrackingProvider = {
  captureException: (error: unknown, context?: Record<string, unknown>) => void;
  captureMessage: (message: string) => void;
  setUser: (user: ErrorTrackingUser) => void;
};

let _provider: ErrorTrackingProvider | null = null;

export function initErrorTracking(provider: ErrorTrackingProvider) {
  _provider = provider;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  try {
    if (_provider) {
      _provider.captureException(error, context);
      return;
    }
    console.error('[errorTracking]', error, context);
  } catch {
    /* error tracking must never break the app */
  }
}

export function captureMessage(message: string) {
  try {
    if (_provider) {
      _provider.captureMessage(message);
      return;
    }
    console.error('[errorTracking]', message);
  } catch {
    /* silent */
  }
}

export function setErrorTrackingUser(user: ErrorTrackingUser) {
  try {
    _provider?.setUser(user);
  } catch {
    /* silent */
  }
}
