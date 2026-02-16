import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../_generated/api';
import schema from '../schema';
import { modules, clerkIdentity } from './helpers';

describe('departments.listWithQuestions', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.departments.listWithQuestions)).rejects.toThrow('Unauthorized');
  });

  it('returns empty array when no departments exist', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'u1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    const depts = await asUser.query(api.departments.listWithQuestions);
    expect(depts).toEqual([]);
  });
});

describe('departments.add', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.departments.add, { name: 'Deli', icon: 'utensils' })
    ).rejects.toThrow('Forbidden: admin access required');
  });

  it('admin can add department', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    const stableId = await asAdmin.mutation(api.departments.add, { name: 'Deli', icon: 'utensils' });
    expect(stableId).toMatch(/^dept-deli-/);

    const depts = await asAdmin.query(api.departments.listWithQuestions);
    expect(depts).toHaveLength(1);
    expect(depts[0].name).toBe('Deli');
    expect(depts[0].icon).toBe('utensils');
  });
});

describe('departments.add — validation', () => {
  it('validates empty name', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.departments.add, { name: '', icon: 'utensils' })
    ).rejects.toThrow('department name cannot be empty');
  });

  it('validates empty icon', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.departments.add, { name: 'Deli', icon: '' })
    ).rejects.toThrow('icon cannot be empty');
  });

  it('validates name max length', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.departments.add, { name: 'a'.repeat(201), icon: 'utensils' })
    ).rejects.toThrow('department name exceeds maximum length');
  });

  it('validates icon max length', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.departments.add, { name: 'Deli', icon: 'a'.repeat(51) })
    ).rejects.toThrow('icon exceeds maximum length');
  });
});

describe('departments.update', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const stableId = await asAdmin.mutation(api.departments.add, { name: 'Deli', icon: 'utensils' });

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.departments.update, { stableId, name: 'Hacked', icon: 'x' })
    ).rejects.toThrow('Forbidden: admin access required');
  });

  it('throws for non-existent department', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.departments.update, { stableId: 'nonexistent', name: 'X', icon: 'x' })
    ).rejects.toThrow('Department not found');
  });

  it('admin can update department', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    const stableId = await asAdmin.mutation(api.departments.add, { name: 'Deli', icon: 'utensils' });
    await asAdmin.mutation(api.departments.update, { stableId, name: 'Delicatessen', icon: 'chef-hat' });

    const depts = await asAdmin.query(api.departments.listWithQuestions);
    expect(depts[0].name).toBe('Delicatessen');
    expect(depts[0].icon).toBe('chef-hat');
  });
});

describe('departments.remove', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const stableId = await asAdmin.mutation(api.departments.add, { name: 'Deli', icon: 'utensils' });

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.departments.remove, { stableId })
    ).rejects.toThrow('Forbidden: admin access required');
  });

  it('throws for non-existent department', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.departments.remove, { stableId: 'nonexistent' })
    ).rejects.toThrow('Department not found');
  });

  it('admin can remove department and its questions', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    const stableId = await asAdmin.mutation(api.departments.add, { name: 'Deli', icon: 'utensils' });

    // Add a question
    await asAdmin.mutation(api.questions.add, {
      departmentId: stableId,
      riskCategory: 'Food Safety',
      text: 'Test question',
      criteria: 'Test criteria',
      answerType: 'yes_no',
      pointsYes: 10,
      pointsPartial: 5,
      pointsNo: 0,
    });

    // Remove department (should cascade-delete questions)
    await asAdmin.mutation(api.departments.remove, { stableId });

    const depts = await asAdmin.query(api.departments.listWithQuestions);
    expect(depts).toHaveLength(0);
  });
});

describe('departments.resetToDefaults', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.departments.resetToDefaults, { departments: [] })
    ).rejects.toThrow('Forbidden: admin access required');
  });

  it('admin can reset departments', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    // Add initial department
    await asAdmin.mutation(api.departments.add, { name: 'Old Dept', icon: 'x' });

    // Reset with new data
    await asAdmin.mutation(api.departments.resetToDefaults, {
      departments: [
        {
          id: 'dept-new',
          name: 'New Dept',
          icon: 'star',
          questions: [
            {
              id: 'q1',
              departmentId: 'dept-new',
              riskCategory: 'Safety',
              text: 'Test Q',
              criteria: 'Test C',
              answerType: 'yes_no',
              pointsYes: 10,
              pointsPartial: 5,
              pointsNo: 0,
            },
          ],
        },
      ],
    });

    const depts = await asAdmin.query(api.departments.listWithQuestions);
    expect(depts).toHaveLength(1);
    expect(depts[0].name).toBe('New Dept');
    expect(depts[0].questions).toHaveLength(1);
    expect(depts[0].questions[0].text).toBe('Test Q');
  });

  it('rejects empty department name in reset data (C3)', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.departments.resetToDefaults, {
        departments: [
          {
            id: 'dept-bad',
            name: '',
            icon: 'star',
            questions: [],
          },
        ],
      })
    ).rejects.toThrow('department name cannot be empty');
  });

  it('rejects negative point values in reset data (C3)', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.departments.resetToDefaults, {
        departments: [
          {
            id: 'dept-bad',
            name: 'Bad Dept',
            icon: 'star',
            questions: [
              {
                id: 'q1',
                departmentId: 'dept-bad',
                riskCategory: 'Safety',
                text: 'Test Q',
                criteria: 'Test C',
                answerType: 'yes_no',
                pointsYes: -5,
                pointsPartial: 0,
                pointsNo: 0,
              },
            ],
          },
        ],
      })
    ).rejects.toThrow('Point values must be non-negative');
  });
});
