import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { modules, clerkIdentity } from './helpers';

describe('invitations.list', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    // Need a valid orgId
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    await expect(t.query(api.invitations.list, { orgId })).rejects.toThrow('Unauthorized');
  });

  it('throws when user is not admin', async () => {
    const t = convexTest(schema, modules);

    // Create admin first
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

    await expect(asUser.query(api.invitations.list, { orgId })).rejects.toThrow(
      'Forbidden: org admin access required'
    );
  });

  it('admin can list invitations', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    const invitations = await asAdmin.query(api.invitations.list, { orgId });
    expect(invitations).toEqual([]);
  });
});

describe('invitations.create', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    // Invite regular user
    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'user1@test.com',
      role: 'user',
    });

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', email: 'user1@test.com', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.invitations.create, { orgId, email: 'new@test.com', role: 'user' })
    ).rejects.toThrow('Forbidden: org admin access required');
  });

  it('admin can create invitation', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'new@test.com',
      role: 'admin',
    });

    const invitations = await asAdmin.query(api.invitations.list, { orgId });
    expect(invitations).toHaveLength(1);
    expect(invitations[0].email).toBe('new@test.com');
    expect(invitations[0].role).toBe('admin');
    expect(invitations[0].status).toBe('pending');
  });

  it('validates email format', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    await expect(
      asAdmin.mutation(api.invitations.create, { orgId, email: 'invalid', role: 'user' })
    ).rejects.toThrow('email is not a valid email address');
  });

  it('rejects duplicate pending invitation (H4)', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'dup@test.com',
      role: 'user',
    });

    await expect(
      asAdmin.mutation(api.invitations.create, { orgId, email: 'dup@test.com', role: 'admin' })
    ).rejects.toThrow('An invitation is already pending for this email.');
  });

  it('rejects invitation for existing team member (H4)', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'reuse@test.com',
      role: 'user',
    });

    // User signs in with that email -- becomes a team member
    const asInvited = t.withIdentity(clerkIdentity({
      name: 'Invited',
      email: 'reuse@test.com',
      id: 'invited1',
    }));
    await asInvited.mutation(api.users.getOrCreateFromClerk);

    // Verify invitation was accepted
    const invitations = await asAdmin.query(api.invitations.list, { orgId });
    const accepted = invitations.find((i) => i.status === 'accepted');
    expect(accepted).toBeDefined();

    // Trying to re-invite an existing user should fail
    await expect(
      asAdmin.mutation(api.invitations.create, { orgId, email: 'reuse@test.com', role: 'admin' })
    ).rejects.toThrow('This email is already a team member.');
  });
});

describe('invitations.remove', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    const invId = await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'new@test.com',
      role: 'user',
    });

    // Invite a different user to same org to test non-admin access
    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'user1@test.com',
      role: 'user',
    });

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', email: 'user1@test.com', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.invitations.remove, { orgId, invitationId: invId })
    ).rejects.toThrow('Forbidden: org admin access required');
  });

  it('admin can remove invitation', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    const invId = await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'new@test.com',
      role: 'user',
    });

    await asAdmin.mutation(api.invitations.remove, { orgId, invitationId: invId });

    const invitations = await asAdmin.query(api.invitations.list, { orgId });
    expect(invitations).toHaveLength(0);
  });
});
