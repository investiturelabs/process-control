import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test validateEnv which reads import.meta.env.
// We mock import.meta.env properties directly.
describe('validateEnv', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    // Reset env to original state
    Object.keys(import.meta.env).forEach((key) => {
      if (key.startsWith('VITE_') && !originalEnv[key]) {
        delete (import.meta.env as Record<string, string>)[key];
      }
    });
    // Restore original values
    Object.assign(import.meta.env, originalEnv);
    vi.resetModules();
  });

  async function loadValidateEnv() {
    const mod = await import('@/lib/env');
    return mod.validateEnv;
  }

  it('throws when VITE_CONVEX_URL is missing', async () => {
    delete (import.meta.env as Record<string, string>).VITE_CONVEX_URL;
    const validateEnv = await loadValidateEnv();
    expect(() => validateEnv()).toThrow('Missing required environment variable: VITE_CONVEX_URL');
  });

  it('throws when VITE_CONVEX_URL is not a valid URL', async () => {
    (import.meta.env as Record<string, string>).VITE_CONVEX_URL = 'not-a-url';
    const validateEnv = await loadValidateEnv();
    expect(() => validateEnv()).toThrow('Invalid VITE_CONVEX_URL');
  });

  it('throws when VITE_BASE_PATH does not start with /', async () => {
    (import.meta.env as Record<string, string>).VITE_CONVEX_URL = 'https://example.convex.cloud';
    (import.meta.env as Record<string, string>).VITE_BASE_PATH = 'no-slash';
    const validateEnv = await loadValidateEnv();
    expect(() => validateEnv()).toThrow('must start with "/"');
  });

  it('succeeds with valid VITE_CONVEX_URL and defaults', async () => {
    (import.meta.env as Record<string, string>).VITE_CONVEX_URL = 'https://example.convex.cloud';
    const validateEnv = await loadValidateEnv();
    const result = validateEnv();
    expect(result.VITE_CONVEX_URL).toBe('https://example.convex.cloud');
    expect(result.VITE_BASE_PATH).toBe('/process-control/');
    expect(result.VITE_SENTRY_DSN).toBeUndefined();
  });

  it('uses VITE_BASE_PATH when provided', async () => {
    (import.meta.env as Record<string, string>).VITE_CONVEX_URL = 'https://example.convex.cloud';
    (import.meta.env as Record<string, string>).VITE_BASE_PATH = '/custom/';
    const validateEnv = await loadValidateEnv();
    const result = validateEnv();
    expect(result.VITE_BASE_PATH).toBe('/custom/');
  });

  it('passes through VITE_SENTRY_DSN when set', async () => {
    (import.meta.env as Record<string, string>).VITE_CONVEX_URL = 'https://example.convex.cloud';
    (import.meta.env as Record<string, string>).VITE_SENTRY_DSN = 'https://key@sentry.io/123';
    const validateEnv = await loadValidateEnv();
    const result = validateEnv();
    expect(result.VITE_SENTRY_DSN).toBe('https://key@sentry.io/123');
  });
});
