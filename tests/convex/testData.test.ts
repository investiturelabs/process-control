import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { modules, clerkIdentity } from './helpers';

describe('testData.generate', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    // Need a valid orgId
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    await expect(t.mutation(api.testData.generate, { orgId })).rejects.toThrow('Unauthorized');
  });

  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    // Invite regular user to same org
    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'user1@test.com',
      role: 'user',
    });

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', email: 'user1@test.com', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(asUser.mutation(api.testData.generate, { orgId })).rejects.toThrow(
      'Forbidden: org admin access required'
    );
  });

  it('returns { created: 0 } when no departments exist', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    const result = await asAdmin.mutation(api.testData.generate, { orgId });
    expect(result).toEqual({ created: 0 });
  });
});
