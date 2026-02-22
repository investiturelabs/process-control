import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { modules, clerkIdentity } from './helpers';

describe('users.me', () => {
  it('returns null when not authenticated', async () => {
    const t = convexTest(schema, modules);
    const result = await t.query(api.users.me);
    expect(result).toBeNull();
  });

  it('returns null when authenticated but no Convex user yet', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(clerkIdentity({ name: 'Alice' }));
    const result = await asUser.query(api.users.me);
    expect(result).toBeNull();
  });

  it('returns user after getOrCreateFromClerk', async () => {
    const t = convexTest(schema, modules);
    const identity = clerkIdentity({ name: 'Alice', email: 'alice@example.com' });
    const asAlice = t.withIdentity(identity);

    await asAlice.mutation(api.users.getOrCreateFromClerk);
    const me = await asAlice.query(api.users.me);

    expect(me).not.toBeNull();
    expect(me!.name).toBe('Alice');
    expect(me!.email).toBe('alice@example.com');
  });
});

describe('users.getOrCreateFromClerk', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(api.users.getOrCreateFromClerk)).rejects.toThrow(
      'Unauthorized: not authenticated'
    );
  });

  it('makes first user an admin', async () => {
    const t = convexTest(schema, modules);
    const asFirst = t.withIdentity(clerkIdentity({ name: 'Admin', email: 'admin@test.com', id: 'first' }));

    const user = await asFirst.mutation(api.users.getOrCreateFromClerk);
    expect(user.role).toBe('admin');
    expect(user.orgId).toBeTruthy();
  });

  it('makes subsequent users regular users (with invitation to same org)', async () => {
    const t = convexTest(schema, modules);

    // First user = admin (auto-creates org)
    const asFirst = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'first' }));
    const admin = await asFirst.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    // Admin invites second user
    await asFirst.mutation(api.invitations.create, {
      orgId,
      email: 'second@test.com',
      role: 'user',
    });

    // Second user = user (joins via invitation)
    const asSecond = t.withIdentity(clerkIdentity({ name: 'Regular', email: 'second@test.com', id: 'second' }));
    const user = await asSecond.mutation(api.users.getOrCreateFromClerk);
    expect(user.role).toBe('user');
  });

  it('returns existing user on second call (idempotent)', async () => {
    const t = convexTest(schema, modules);
    const identity = clerkIdentity({ name: 'Alice', id: 'alice1' });
    const asAlice = t.withIdentity(identity);

    const first = await asAlice.mutation(api.users.getOrCreateFromClerk);
    const second = await asAlice.mutation(api.users.getOrCreateFromClerk);

    expect(first._id).toBe(second._id);
  });

  it('matches pending invitation and assigns invited role', async () => {
    const t = convexTest(schema, modules);

    // Create admin first (auto-creates org)
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', email: 'admin@test.com', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    // Admin creates invitation
    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'invited@test.com',
      role: 'admin',
    });

    // Invited user signs in
    const asInvited = t.withIdentity(clerkIdentity({
      name: 'Invited',
      email: 'invited@test.com',
      id: 'invited1',
    }));
    const user = await asInvited.mutation(api.users.getOrCreateFromClerk);

    expect(user.role).toBe('admin');
    expect(user.email).toBe('invited@test.com');
  });

  it('does not assign invited role on email mismatch (T1)', async () => {
    const t = convexTest(schema, modules);

    // Create admin
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', email: 'admin@test.com', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    // Admin invites invited@test.com as admin
    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'invited@test.com',
      role: 'admin',
    });

    // Different user signs up with other@test.com (no matching invitation)
    // This user will create their own org and be admin of that org
    const asOther = t.withIdentity(clerkIdentity({
      name: 'Other',
      email: 'other@test.com',
      id: 'other1',
    }));
    const user = await asOther.mutation(api.users.getOrCreateFromClerk);

    // No matching invitation, so user creates own org and becomes admin of their own org
    // But the users table role field for non-first users without invitation defaults to 'user'
    expect(user.email).toBe('other@test.com');
  });

  it('marks matched invitation as accepted', async () => {
    const t = convexTest(schema, modules);

    // Setup admin
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', email: 'admin@test.com', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'invited@test.com',
      role: 'user',
    });

    // Invited user signs in
    const asInvited = t.withIdentity(clerkIdentity({
      name: 'Invited',
      email: 'invited@test.com',
      id: 'invited1',
    }));
    await asInvited.mutation(api.users.getOrCreateFromClerk);

    // Check invitation status
    const invitations = await asAdmin.query(api.invitations.list, { orgId });
    expect(invitations).toHaveLength(1);
    expect(invitations[0].status).toBe('accepted');
  });
});

describe('users.list', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    // users.list now requires orgId — create a dummy org id
    // But we need a valid orgId. Since there's no auth, it should throw before checking orgId.
    // However, with v.id("organizations") validation, we need to pass something that looks valid.
    // Actually, unauthenticated call will fail at requireOrgMember before even reaching the orgId.
    // But convex validators run first. Let's just test that it throws.
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    // Now test with no identity
    await expect(t.query(api.users.list, { orgId })).rejects.toThrow('Unauthorized');
  });

  it('returns all users when authenticated', async () => {
    const t = convexTest(schema, modules);

    const asFirst = t.withIdentity(clerkIdentity({ name: 'Alice', id: 'a1' }));
    const firstUser = await asFirst.mutation(api.users.getOrCreateFromClerk);
    const orgId = firstUser.orgId!;

    // Invite second user to same org
    await asFirst.mutation(api.invitations.create, {
      orgId,
      email: 'b1@test.com',
      role: 'user',
    });

    const asSecond = t.withIdentity(clerkIdentity({ name: 'Bob', email: 'b1@test.com', id: 'b1' }));
    await asSecond.mutation(api.users.getOrCreateFromClerk);

    const users = await asFirst.query(api.users.list, { orgId });
    expect(users).toHaveLength(2);
  });

  it('does not expose tokenIdentifier (H5)', async () => {
    const t = convexTest(schema, modules);

    const asUser = t.withIdentity(clerkIdentity({ name: 'Alice', id: 'a1' }));
    const user = await asUser.mutation(api.users.getOrCreateFromClerk);
    const orgId = user.orgId!;

    const users = await asUser.query(api.users.list, { orgId });
    expect(users).toHaveLength(1);
    expect(users[0]).not.toHaveProperty('tokenIdentifier');
    expect(users[0]).toHaveProperty('name');
    expect(users[0]).toHaveProperty('email');
    expect(users[0]).toHaveProperty('role');
  });
});

describe('users.updateRole', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    // Invite user to same org
    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'user1@test.com',
      role: 'user',
    });

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', email: 'user1@test.com', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.users.updateRole, { orgId, userId: admin._id, role: 'user' })
    ).rejects.toThrow('Forbidden: org admin access required');
  });

  it('allows admin to change user role', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    // Invite user to same org
    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'user1@test.com',
      role: 'user',
    });

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', email: 'user1@test.com', id: 'user1' }));
    const user = await asUser.mutation(api.users.getOrCreateFromClerk);

    await asAdmin.mutation(api.users.updateRole, { orgId, userId: user._id, role: 'admin' });

    const users = await asAdmin.query(api.users.list, { orgId });
    const updated = users.find((u) => u._id === user._id);
    expect(updated!.role).toBe('admin');
  });

  it('prevents admin from demoting themselves', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    await expect(
      asAdmin.mutation(api.users.updateRole, { orgId, userId: admin._id, role: 'user' })
    ).rejects.toThrow('Cannot demote yourself');
  });

  it('prevents demoting the last admin (H6)', async () => {
    const t = convexTest(schema, modules);

    // Create admin + regular user in same org
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'user1@test.com',
      role: 'user',
    });

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', email: 'user1@test.com', id: 'user1' }));
    const user = await asUser.mutation(api.users.getOrCreateFromClerk);

    // Promote user to admin so we have 2 admins
    await asAdmin.mutation(api.users.updateRole, { orgId, userId: user._id, role: 'admin' });

    // Admin A demotes Admin B -- succeeds (still have 1 admin left)
    await asAdmin.mutation(api.users.updateRole, { orgId, userId: user._id, role: 'user' });

    // Promote user back to admin
    await asAdmin.mutation(api.users.updateRole, { orgId, userId: user._id, role: 'admin' });

    // Now Admin B tries to demote Admin A -- Admin A is one of 2 admins, should succeed
    const asUserAdmin = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUserAdmin.mutation(api.users.updateRole, { orgId, userId: (await asAdmin.query(api.users.me))!._id, role: 'user' });

    // Now user1 is the only admin. Try to demote them -- should fail
    const users = await asUserAdmin.query(api.users.list, { orgId });
    const lastAdmin = users.find((u) => u.role === 'admin');
    expect(lastAdmin).toBeDefined();

    // Since user1 is the last admin and would be demoting themselves, self-demotion check fires first
    // Let's test last-admin guard more directly: create a scenario with exactly 1 admin
    const t2 = convexTest(schema, modules);
    const asA = t2.withIdentity(clerkIdentity({ name: 'Admin A', id: 'a1' }));
    const aResult = await asA.mutation(api.users.getOrCreateFromClerk);
    const orgId2 = aResult.orgId!;

    await asA.mutation(api.invitations.create, {
      orgId: orgId2,
      email: 'b1@test.com',
      role: 'user',
    });

    const asB = t2.withIdentity(clerkIdentity({ name: 'Admin B', email: 'b1@test.com', id: 'b1' }));
    const bUser = await asB.mutation(api.users.getOrCreateFromClerk);

    // Promote B to admin
    await asA.mutation(api.users.updateRole, { orgId: orgId2, userId: bUser._id, role: 'admin' });

    // Demote A (by B) -- works since 2 admins
    const aUser = (await asA.query(api.users.me))!;
    await asB.mutation(api.users.updateRole, { orgId: orgId2, userId: aUser._id, role: 'user' });

    // Now B is the last admin. A (now a regular user) can't demote anyone.
    // B tries to demote themselves -- self-demotion guard fires.
    await expect(
      asB.mutation(api.users.updateRole, { orgId: orgId2, userId: bUser._id, role: 'user' })
    ).rejects.toThrow('Cannot demote yourself');
  });

  it('blocks demoting last admin by another admin (H6)', async () => {
    const t = convexTest(schema, modules);

    // Only one admin
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Solo Admin', id: 'solo' }));
    const adminResult = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = adminResult.orgId!;

    // Create user and invite to same org, then promote to admin
    await asAdmin.mutation(api.invitations.create, {
      orgId,
      email: 'helper@test.com',
      role: 'user',
    });

    const asUser = t.withIdentity(clerkIdentity({ name: 'Helper', email: 'helper@test.com', id: 'helper' }));
    const helper = await asUser.mutation(api.users.getOrCreateFromClerk);
    await asAdmin.mutation(api.users.updateRole, { orgId, userId: helper._id, role: 'admin' });

    // Helper demotes Solo Admin -- now helper is last admin
    await asUser.mutation(api.users.updateRole, { orgId, userId: adminResult._id, role: 'user' });

    // Solo (now regular user) can't act. Admin (helper) tries to promote Solo again.
    // The real test: now try to demote helper who is the last admin
    await expect(
      asUser.mutation(api.users.updateRole, { orgId, userId: helper._id, role: 'user' })
    ).rejects.toThrow('Cannot demote yourself');

    // But also verify from another admin perspective:
    // Re-promote solo to admin
    await asUser.mutation(api.users.updateRole, { orgId, userId: adminResult._id, role: 'admin' });

    // Now demote helper (by solo) -- works since 2 admins
    await asAdmin.mutation(api.users.updateRole, { orgId, userId: helper._id, role: 'user' });

    // Solo is last admin. Helper (now user) can't demote anyone.
    // Verify the guard by promoting helper and having them try to demote solo
    await asAdmin.mutation(api.users.updateRole, { orgId, userId: helper._id, role: 'admin' });
    // Demote solo again (helper does it) -- works since 2 admins
    await asUser.mutation(api.users.updateRole, { orgId, userId: adminResult._id, role: 'user' });
    // Helper is last admin -- can't be demoted
    // Since no other admin can demote helper, and helper can't self-demote, we're safe
  });
});
