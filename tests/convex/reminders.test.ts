import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { modules, clerkIdentity } from './helpers';

async function setupUser(t: ReturnType<typeof convexTest>, id = 'user1') {
  const asUser = t.withIdentity(clerkIdentity({ name: 'Test User', id }));
  await asUser.mutation(api.users.getOrCreateFromClerk);
  return asUser;
}

describe('reminders.create', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.reminders.create, {
        title: 'Clean drains',
        frequency: 'weekly',
        startDate: new Date().toISOString(),
      })
    ).rejects.toThrow('Unauthorized');
  });

  it('creates a reminder with correct fields', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    const startDate = '2025-03-01T00:00:00.000Z';
    const id = await asUser.mutation(api.reminders.create, {
      title: 'Clean drains',
      description: 'All floor drains in bakery',
      frequency: 'weekly',
      startDate,
    });

    expect(id).toBeTruthy();

    const reminders = await asUser.query(api.reminders.list);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].title).toBe('Clean drains');
    expect(reminders[0].description).toBe('All floor drains in bakery');
    expect(reminders[0].frequency).toBe('weekly');
    expect(reminders[0].nextDueAt).toBe(startDate);
    expect(reminders[0].active).toBe(true);
  });

  it('validates empty title', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    await expect(
      asUser.mutation(api.reminders.create, {
        title: '   ',
        frequency: 'daily',
        startDate: new Date().toISOString(),
      })
    ).rejects.toThrow('title cannot be empty');
  });

  it('validates custom frequency requires customDays', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    await expect(
      asUser.mutation(api.reminders.create, {
        title: 'Custom task',
        frequency: 'custom',
        startDate: new Date().toISOString(),
      })
    ).rejects.toThrow('customDays must be a positive number');
  });

  it('creates reminder with custom frequency', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    await asUser.mutation(api.reminders.create, {
      title: 'Every 10 days',
      frequency: 'custom',
      customDays: 10,
      startDate: '2025-06-01T00:00:00.000Z',
    });

    const reminders = await asUser.query(api.reminders.list);
    expect(reminders).toHaveLength(1);
    expect(reminders[0].frequency).toBe('custom');
    expect(reminders[0].customDays).toBe(10);
  });
});

describe('reminders.update', () => {
  it('updates reminder fields', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    const id = await asUser.mutation(api.reminders.create, {
      title: 'Original',
      frequency: 'weekly',
      startDate: new Date().toISOString(),
    });

    await asUser.mutation(api.reminders.update, {
      reminderId: id,
      title: 'Updated title',
      description: 'New desc',
    });

    const reminders = await asUser.query(api.reminders.list);
    expect(reminders[0].title).toBe('Updated title');
    expect(reminders[0].description).toBe('New desc');
  });

  it('recomputes nextDueAt when frequency changes', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    const startDate = '2025-03-01T00:00:00.000Z';
    const id = await asUser.mutation(api.reminders.create, {
      title: 'Task',
      frequency: 'weekly',
      startDate,
    });

    const before = await asUser.query(api.reminders.list);
    const oldNextDue = before[0].nextDueAt;

    await asUser.mutation(api.reminders.update, {
      reminderId: id,
      frequency: 'monthly',
    });

    const after = await asUser.query(api.reminders.list);
    expect(after[0].nextDueAt).not.toBe(oldNextDue);
  });

  it('can deactivate a reminder', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    const id = await asUser.mutation(api.reminders.create, {
      title: 'Task',
      frequency: 'daily',
      startDate: new Date().toISOString(),
    });

    await asUser.mutation(api.reminders.update, {
      reminderId: id,
      active: false,
    });

    // list only returns active reminders
    const active = await asUser.query(api.reminders.list);
    expect(active).toHaveLength(0);

    const all = await asUser.query(api.reminders.listAll);
    expect(all).toHaveLength(1);
    expect(all[0].active).toBe(false);
  });
});

describe('reminders.complete', () => {
  it('records completion and advances nextDueAt', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    const startDate = '2025-01-01T00:00:00.000Z';
    const id = await asUser.mutation(api.reminders.create, {
      title: 'Weekly task',
      frequency: 'weekly',
      startDate,
    });

    await asUser.mutation(api.reminders.complete, {
      reminderId: id,
      note: 'Done for this week',
    });

    const reminders = await asUser.query(api.reminders.list);
    expect(reminders[0].lastCompletedAt).toBeTruthy();
    expect(reminders[0].lastCompletedByName).toBe('Test User');
    // nextDueAt should have advanced from the completion time
    expect(reminders[0].nextDueAt).not.toBe(startDate);

    const completions = await asUser.query(api.reminders.getCompletions, {
      reminderId: id,
    });
    expect(completions).toHaveLength(1);
    expect(completions[0].note).toBe('Done for this week');
    expect(completions[0].completedByName).toBe('Test User');
  });

  it('records multiple completions', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    const id = await asUser.mutation(api.reminders.create, {
      title: 'Daily task',
      frequency: 'daily',
      startDate: '2025-01-01T00:00:00.000Z',
    });

    await asUser.mutation(api.reminders.complete, { reminderId: id });
    await asUser.mutation(api.reminders.complete, { reminderId: id, note: 'Second time' });

    const completions = await asUser.query(api.reminders.getCompletions, {
      reminderId: id,
    });
    expect(completions).toHaveLength(2);
  });
});

describe('reminders.remove', () => {
  it('deletes reminder and its completions', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    const id = await asUser.mutation(api.reminders.create, {
      title: 'To delete',
      frequency: 'monthly',
      startDate: new Date().toISOString(),
    });

    await asUser.mutation(api.reminders.complete, { reminderId: id });

    await asUser.mutation(api.reminders.remove, { reminderId: id });

    const reminders = await asUser.query(api.reminders.listAll);
    expect(reminders).toHaveLength(0);

    const completions = await asUser.query(api.reminders.getCompletions, {
      reminderId: id,
    });
    expect(completions).toHaveLength(0);
  });
});

describe('reminders.listByQuestion', () => {
  it('returns reminders linked to a question', async () => {
    const t = convexTest(schema, modules);
    const asUser = await setupUser(t);

    await asUser.mutation(api.reminders.create, {
      title: 'Linked',
      frequency: 'weekly',
      startDate: new Date().toISOString(),
      questionId: 'q_123',
    });

    await asUser.mutation(api.reminders.create, {
      title: 'Unlinked',
      frequency: 'daily',
      startDate: new Date().toISOString(),
    });

    const linked = await asUser.query(api.reminders.listByQuestion, {
      questionId: 'q_123',
    });
    expect(linked).toHaveLength(1);
    expect(linked[0].title).toBe('Linked');
  });
});
