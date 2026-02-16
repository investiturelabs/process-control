import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { modules, clerkIdentity } from './helpers';

const sampleAnswers = [
  { questionId: 'q1', value: 'yes' as const, points: 10 },
  { questionId: 'q2', value: 'no' as const, points: 0 },
];

describe('sessions.save', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.sessions.save, {
        companyId: 'c1',
        departmentId: 'd1',
        date: '2026-01-01',
        answers: sampleAnswers,
        totalPoints: 10,
        maxPoints: 20,
        percentage: 50,
        completed: true,
      })
    ).rejects.toThrow('Unauthorized');
  });

  it('sets auditorId and auditorName from JWT identity', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(clerkIdentity({ name: 'Sarah Chen', id: 'sarah1' }));
    const user = await asUser.mutation(api.users.getOrCreateFromClerk);

    const sessionId = await asUser.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd1',
      date: '2026-01-01',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: true,
    });

    const sessions = await asUser.query(api.sessions.list);
    const session = sessions.find((s) => s._id === sessionId);
    expect(session).toBeDefined();
    expect(session!.auditorId).toBe(user._id);
    expect(session!.auditorName).toBe('Sarah Chen');
  });

  it('rejects percentage > 100 (M2)', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'u1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.sessions.save, {
        companyId: 'c1',
        departmentId: 'd1',
        date: '2026-01-01',
        answers: sampleAnswers,
        totalPoints: 10,
        maxPoints: 20,
        percentage: 150,
        completed: true,
      })
    ).rejects.toThrow('percentage must be between 0 and 100');
  });

  it('rejects negative totalPoints (M2)', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'u1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.sessions.save, {
        companyId: 'c1',
        departmentId: 'd1',
        date: '2026-01-01',
        answers: sampleAnswers,
        totalPoints: -5,
        maxPoints: 20,
        percentage: 50,
        completed: true,
      })
    ).rejects.toThrow('totalPoints must be non-negative');
  });

  it('rejects empty date (M2)', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'u1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.sessions.save, {
        companyId: 'c1',
        departmentId: 'd1',
        date: '  ',
        answers: sampleAnswers,
        totalPoints: 10,
        maxPoints: 20,
        percentage: 50,
        completed: true,
      })
    ).rejects.toThrow('date cannot be empty');
  });
});

describe('sessions.list', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.sessions.list)).rejects.toThrow('Unauthorized');
  });

  it('admin sees all sessions', async () => {
    const t = convexTest(schema, modules);

    // Admin
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    // Regular user
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    // User saves a session
    await asUser.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd1',
      date: '2026-01-01',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: true,
    });

    // Admin sees it
    const adminSessions = await asAdmin.query(api.sessions.list);
    expect(adminSessions).toHaveLength(1);
  });

  it('regular user sees only own sessions', async () => {
    const t = convexTest(schema, modules);

    // Admin creates a session
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);
    await asAdmin.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd1',
      date: '2026-01-01',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: true,
    });

    // Regular user creates a session
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);
    await asUser.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd2',
      date: '2026-01-02',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: true,
    });

    // User only sees their own session
    const userSessions = await asUser.query(api.sessions.list);
    expect(userSessions).toHaveLength(1);
    expect(userSessions[0].departmentId).toBe('d2');
  });
});

describe('sessions.update', () => {
  it('owner can update their session', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    const sessionId = await asUser.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd1',
      date: '2026-01-01',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: false,
    });

    await asUser.mutation(api.sessions.update, {
      sessionId,
      completed: true,
      percentage: 75,
    });

    const sessions = await asUser.query(api.sessions.list);
    expect(sessions[0].completed).toBe(true);
    expect(sessions[0].percentage).toBe(75);
  });

  it('non-owner non-admin cannot update session', async () => {
    const t = convexTest(schema, modules);

    // Admin creates session
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const sessionId = await asAdmin.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd1',
      date: '2026-01-01',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: false,
    });

    // Non-admin user tries to update it
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.sessions.update, { sessionId, completed: true })
    ).rejects.toThrow('Forbidden: you can only update your own sessions');
  });

  it('admin can update any session', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    const sessionId = await asUser.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd1',
      date: '2026-01-01',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: false,
    });

    // Admin can update user's session
    await asAdmin.mutation(api.sessions.update, { sessionId, completed: true });

    const sessions = await asAdmin.query(api.sessions.list);
    const updated = sessions.find((s) => s._id === sessionId);
    expect(updated!.completed).toBe(true);
  });

  it('auditorId/auditorName remain unchanged after update (C1)', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(clerkIdentity({ name: 'Original User', id: 'orig1' }));
    const user = await asUser.mutation(api.users.getOrCreateFromClerk);

    const sessionId = await asUser.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd1',
      date: '2026-01-01',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: false,
    });

    // Update session with legitimate fields
    await asUser.mutation(api.sessions.update, {
      sessionId,
      completed: true,
      percentage: 80,
    });

    const sessions = await asUser.query(api.sessions.list);
    const session = sessions.find((s) => s._id === sessionId);
    expect(session!.auditorId).toBe(user._id);
    expect(session!.auditorName).toBe('Original User');
  });

  it('rejects percentage > 100 in update (M2)', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'u1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    const sessionId = await asUser.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd1',
      date: '2026-01-01',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: false,
    });

    await expect(
      asUser.mutation(api.sessions.update, { sessionId, percentage: 200 })
    ).rejects.toThrow('percentage must be between 0 and 100');
  });
});

describe('sessions.remove', () => {
  it('non-owner non-admin cannot delete session', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const sessionId = await asAdmin.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd1',
      date: '2026-01-01',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: true,
    });

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.sessions.remove, { sessionId })
    ).rejects.toThrow('Forbidden: you can only delete your own sessions');
  });

  it('owner can delete their own session', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    const sessionId = await asUser.mutation(api.sessions.save, {
      companyId: 'c1',
      departmentId: 'd1',
      date: '2026-01-01',
      answers: sampleAnswers,
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: true,
    });

    await asUser.mutation(api.sessions.remove, { sessionId });
    const sessions = await asUser.query(api.sessions.list);
    expect(sessions).toHaveLength(0);
  });
});
