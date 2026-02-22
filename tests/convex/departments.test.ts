import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { modules, clerkIdentity } from './helpers';

/** Helper: create admin and return { asAdmin, orgId } */
async function setupAdmin(t: ReturnType<typeof convexTest>) {
  const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
  const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
  const orgId = admin.orgId!;
  return { asAdmin, orgId };
}

/** Helper: create a non-admin user in the same org */
async function setupUser(t: ReturnType<typeof convexTest>, asAdmin: any, orgId: any) {
  await asAdmin.mutation(api.invitations.create, {
    orgId,
    email: 'user1@test.com',
    role: 'user',
  });
  const asUser = t.withIdentity(clerkIdentity({ name: 'User', email: 'user1@test.com', id: 'user1' }));
  await asUser.mutation(api.users.getOrCreateFromClerk);
  return asUser;
}

describe('departments.listWithQuestions', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    const { orgId } = await setupAdmin(t);
    await expect(t.query(api.departments.listWithQuestions, { orgId })).rejects.toThrow('Unauthorized');
  });

  it('returns empty array when no departments exist', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    expect(depts).toEqual([]);
  });
});

describe('departments.add', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);
    const asUser = await setupUser(t, asAdmin, orgId);

    await expect(
      asUser.mutation(api.departments.add, { orgId, name: 'Deli', icon: 'utensils' })
    ).rejects.toThrow('Forbidden: org admin access required');
  });

  it('admin can add department', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    const stableId = await asAdmin.mutation(api.departments.add, { orgId, name: 'Deli', icon: 'utensils' });
    expect(stableId).toMatch(/^dept-deli-/);

    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    expect(depts).toHaveLength(1);
    expect(depts[0].name).toBe('Deli');
    expect(depts[0].icon).toBe('utensils');
  });
});

describe('departments.add — validation', () => {
  it('validates empty name', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    await expect(
      asAdmin.mutation(api.departments.add, { orgId, name: '', icon: 'utensils' })
    ).rejects.toThrow('department name cannot be empty');
  });

  it('validates empty icon', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    await expect(
      asAdmin.mutation(api.departments.add, { orgId, name: 'Deli', icon: '' })
    ).rejects.toThrow('icon cannot be empty');
  });

  it('validates name max length', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    await expect(
      asAdmin.mutation(api.departments.add, { orgId, name: 'a'.repeat(201), icon: 'utensils' })
    ).rejects.toThrow('department name exceeds maximum length');
  });

  it('validates icon max length', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    await expect(
      asAdmin.mutation(api.departments.add, { orgId, name: 'Deli', icon: 'a'.repeat(51) })
    ).rejects.toThrow('icon exceeds maximum length');
  });
});

describe('departments.update', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);
    const stableId = await asAdmin.mutation(api.departments.add, { orgId, name: 'Deli', icon: 'utensils' });
    const asUser = await setupUser(t, asAdmin, orgId);

    await expect(
      asUser.mutation(api.departments.update, { orgId, stableId, name: 'Hacked', icon: 'x' })
    ).rejects.toThrow('Forbidden: org admin access required');
  });

  it('throws for non-existent department', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    await expect(
      asAdmin.mutation(api.departments.update, { orgId, stableId: 'nonexistent', name: 'X', icon: 'x' })
    ).rejects.toThrow('Department not found');
  });

  it('admin can update department', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    const stableId = await asAdmin.mutation(api.departments.add, { orgId, name: 'Deli', icon: 'utensils' });
    await asAdmin.mutation(api.departments.update, { orgId, stableId, name: 'Delicatessen', icon: 'chef-hat' });

    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    expect(depts[0].name).toBe('Delicatessen');
    expect(depts[0].icon).toBe('chef-hat');
  });
});

describe('departments.remove', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);
    const stableId = await asAdmin.mutation(api.departments.add, { orgId, name: 'Deli', icon: 'utensils' });
    const asUser = await setupUser(t, asAdmin, orgId);

    await expect(
      asUser.mutation(api.departments.remove, { orgId, stableId })
    ).rejects.toThrow('Forbidden: org admin access required');
  });

  it('throws for non-existent department', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    await expect(
      asAdmin.mutation(api.departments.remove, { orgId, stableId: 'nonexistent' })
    ).rejects.toThrow('Department not found');
  });

  it('admin can remove department and its questions', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    const stableId = await asAdmin.mutation(api.departments.add, { orgId, name: 'Deli', icon: 'utensils' });

    // Add a question
    await asAdmin.mutation(api.questions.add, {
      orgId,
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
    await asAdmin.mutation(api.departments.remove, { orgId, stableId });

    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    expect(depts).toHaveLength(0);
  });
});

describe('departments.resetToDefaults', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);
    const asUser = await setupUser(t, asAdmin, orgId);

    await expect(
      asUser.mutation(api.departments.resetToDefaults, { orgId, departments: [] })
    ).rejects.toThrow('Forbidden: org admin access required');
  });

  it('admin can reset departments', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    // Add initial department
    await asAdmin.mutation(api.departments.add, { orgId, name: 'Old Dept', icon: 'x' });

    // Reset with new data
    await asAdmin.mutation(api.departments.resetToDefaults, {
      orgId,
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

    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    expect(depts).toHaveLength(1);
    expect(depts[0].name).toBe('New Dept');
    expect(depts[0].questions).toHaveLength(1);
    expect(depts[0].questions[0].text).toBe('Test Q');
  });

  it('rejects empty department name in reset data (C3)', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdmin(t);

    await expect(
      asAdmin.mutation(api.departments.resetToDefaults, {
        orgId,
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
    const { asAdmin, orgId } = await setupAdmin(t);

    await expect(
      asAdmin.mutation(api.departments.resetToDefaults, {
        orgId,
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
