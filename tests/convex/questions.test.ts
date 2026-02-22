import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { modules, clerkIdentity } from './helpers';

/** Helper: create admin + department, return { asAdmin, orgId, stableId } */
async function setupAdminWithDept(t: ReturnType<typeof convexTest>) {
  const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
  const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
  const orgId = admin.orgId!;
  const stableId = await asAdmin.mutation(api.departments.add, { orgId, name: 'Deli', icon: 'utensils' });
  return { asAdmin, orgId, stableId };
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

const validQuestion = {
  riskCategory: 'Food Safety',
  text: 'Is the temperature correct?',
  criteria: 'Check thermometer reads below 40°F',
  answerType: 'yes_no' as const,
  pointsYes: 10,
  pointsPartial: 5,
  pointsNo: 0,
};

describe('questions.add', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    const { orgId } = await setupAdminWithDept(t);
    await expect(
      t.mutation(api.questions.add, { orgId, departmentId: 'd1', ...validQuestion })
    ).rejects.toThrow('Unauthorized');
  });

  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId } = await setupAdminWithDept(t);
    const asUser = await setupUser(t, asAdmin, orgId);

    await expect(
      asUser.mutation(api.questions.add, { orgId, departmentId: 'd1', ...validQuestion })
    ).rejects.toThrow('Forbidden: org admin access required');
  });

  it('admin can add question', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion });

    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    const dept = depts.find((d) => d.id === stableId);
    expect(dept!.questions).toHaveLength(1);
    expect(dept!.questions[0].text).toBe('Is the temperature correct?');
  });

  it('validates empty question text', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await expect(
      asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion, text: '' })
    ).rejects.toThrow('question text cannot be empty');
  });

  it('validates empty criteria', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await expect(
      asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion, criteria: '  ' })
    ).rejects.toThrow('criteria cannot be empty');
  });

  it('validates empty risk category', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await expect(
      asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion, riskCategory: '' })
    ).rejects.toThrow('risk category cannot be empty');
  });

  it('validates question text max length', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    const longText = 'a'.repeat(2001);
    await expect(
      asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion, text: longText })
    ).rejects.toThrow('question text exceeds maximum length');
  });

  it('assigns incrementing sortOrder', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion });
    await asAdmin.mutation(api.questions.add, {
      orgId,
      departmentId: stableId,
      ...validQuestion,
      text: 'Second question',
    });

    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    const dept = depts.find((d) => d.id === stableId);
    expect(dept!.questions).toHaveLength(2);
    expect(dept!.questions[0].text).toBe('Is the temperature correct?');
    expect(dept!.questions[1].text).toBe('Second question');
  });

  it('rejects negative points (C4)', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await expect(
      asAdmin.mutation(api.questions.add, {
        orgId,
        departmentId: stableId,
        ...validQuestion,
        pointsYes: -5,
      })
    ).rejects.toThrow('Point values must be non-negative');
  });

  it('rejects non-integer points (C4)', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await expect(
      asAdmin.mutation(api.questions.add, {
        orgId,
        departmentId: stableId,
        ...validQuestion,
        pointsYes: 10.5,
      })
    ).rejects.toThrow('Point values must be integers');
  });

  it('rejects pointsYes < pointsPartial (C4)', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await expect(
      asAdmin.mutation(api.questions.add, {
        orgId,
        departmentId: stableId,
        ...validQuestion,
        pointsYes: 3,
        pointsPartial: 5,
      })
    ).rejects.toThrow('pointsYes must be >= pointsPartial');
  });

  it('rejects non-existent departmentId (M1)', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    const admin = await asAdmin.mutation(api.users.getOrCreateFromClerk);
    const orgId = admin.orgId!;

    await expect(
      asAdmin.mutation(api.questions.add, {
        orgId,
        departmentId: 'nonexistent-dept',
        ...validQuestion,
      })
    ).rejects.toThrow('Department not found');
  });
});

describe('questions.update', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion });
    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    const questionId = depts[0].questions[0].id;

    await expect(
      t.mutation(api.questions.update, { orgId, questionId: questionId as any, ...validQuestion, text: 'Updated' })
    ).rejects.toThrow('Unauthorized');
  });

  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion });
    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    const questionId = depts[0].questions[0].id;

    const asUser = await setupUser(t, asAdmin, orgId);

    await expect(
      asUser.mutation(api.questions.update, { orgId, questionId: questionId as any, ...validQuestion, text: 'Hacked' })
    ).rejects.toThrow('Forbidden: org admin access required');
  });

  it('admin can update question', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion });
    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    const questionId = depts[0].questions[0].id;

    await asAdmin.mutation(api.questions.update, {
      orgId,
      questionId: questionId as any,
      ...validQuestion,
      text: 'Updated question text',
      pointsYes: 20,
    });

    const deptsAfter = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    expect(deptsAfter[0].questions[0].text).toBe('Updated question text');
    expect(deptsAfter[0].questions[0].pointsYes).toBe(20);
  });

  it('validates empty text on update', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion });
    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    const questionId = depts[0].questions[0].id;

    await expect(
      asAdmin.mutation(api.questions.update, { orgId, questionId: questionId as any, ...validQuestion, text: '' })
    ).rejects.toThrow('question text cannot be empty');
  });

  it('validates points on update (C4)', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion });
    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    const questionId = depts[0].questions[0].id;

    await expect(
      asAdmin.mutation(api.questions.update, {
        orgId,
        questionId: questionId as any,
        ...validQuestion,
        pointsNo: -1,
      })
    ).rejects.toThrow('Point values must be non-negative');
  });
});

describe('questions.remove', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion });
    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    const questionId = depts[0].questions[0].id;

    await expect(
      t.mutation(api.questions.remove, { orgId, questionId: questionId as any })
    ).rejects.toThrow('Unauthorized');
  });

  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion });
    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    const questionId = depts[0].questions[0].id;

    const asUser = await setupUser(t, asAdmin, orgId);

    await expect(
      asUser.mutation(api.questions.remove, { orgId, questionId: questionId as any })
    ).rejects.toThrow('Forbidden: org admin access required');
  });

  it('admin can remove question', async () => {
    const t = convexTest(schema, modules);
    const { asAdmin, orgId, stableId } = await setupAdminWithDept(t);

    await asAdmin.mutation(api.questions.add, { orgId, departmentId: stableId, ...validQuestion });
    const depts = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    const questionId = depts[0].questions[0].id;

    await asAdmin.mutation(api.questions.remove, { orgId, questionId: questionId as any });

    const deptsAfter = await asAdmin.query(api.departments.listWithQuestions, { orgId });
    expect(deptsAfter[0].questions).toHaveLength(0);
  });
});
