/** Shared test utilities for Convex backend tests */

export const modules = import.meta.glob('../**/*.ts');

/** Creates a Clerk-like identity for convex-test */
export function clerkIdentity(opts: { name?: string; email?: string; id?: string }) {
  const id = opts.id ?? 'user_123';
  return {
    name: opts.name ?? 'Test User',
    email: opts.email ?? `${id}@test.com`,
    tokenIdentifier: `https://test.clerk.accounts.dev|${id}`,
  };
}
