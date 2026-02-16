import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import { modules, clerkIdentity } from './helpers';

describe('testData.generate', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.testData.generate)).rejects.toThrow('Unauthorized');
  });

  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(asUser.mutation(api.testData.generate)).rejects.toThrow(
      'Forbidden: admin access required'
    );
  });

  it('returns { created: 0 } when no departments exist', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    const result = await asAdmin.mutation(api.testData.generate);
    expect(result).toEqual({ created: 0 });
  });
});
