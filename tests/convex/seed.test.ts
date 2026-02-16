import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { modules, clerkIdentity } from './helpers';

const validDepartments = [
  {
    id: 'dept-test',
    name: 'Test Dept',
    icon: 'clipboard',
    questions: [
      {
        id: 'q1',
        departmentId: 'dept-test',
        riskCategory: 'Safety',
        text: 'Is the area clean?',
        criteria: 'Check floor and surfaces',
        answerType: 'yes_no' as const,
        pointsYes: 10,
        pointsPartial: 5,
        pointsNo: 0,
      },
    ],
  },
];

describe('seed.seedAll', () => {
  it('throws when not authenticated (C2)', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.seed.seedAll, { departments: validDepartments })
    ).rejects.toThrow('Unauthorized');
  });

  it('throws when not admin (C2)', async () => {
    const t = convexTest(schema, modules);

    // Create admin first
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    // Create regular user
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.seed.seedAll, { departments: validDepartments })
    ).rejects.toThrow('Forbidden: admin access required');
  });

  it('admin can seed departments', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await asAdmin.mutation(api.seed.seedAll, { departments: validDepartments });

    const depts = await asAdmin.query(api.departments.listWithQuestions);
    expect(depts).toHaveLength(1);
    expect(depts[0].name).toBe('Test Dept');
    expect(depts[0].questions).toHaveLength(1);
  });

  it('is idempotent (does not duplicate on second call)', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await asAdmin.mutation(api.seed.seedAll, { departments: validDepartments });
    await asAdmin.mutation(api.seed.seedAll, { departments: validDepartments });

    const depts = await asAdmin.query(api.departments.listWithQuestions);
    expect(depts).toHaveLength(1);
  });

  it('validates text fields (M3)', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.seed.seedAll, {
        departments: [
          {
            id: 'dept-bad',
            name: '',
            icon: 'x',
            questions: [],
          },
        ],
      })
    ).rejects.toThrow('department name cannot be empty');
  });

  it('validates point values (M3)', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.seed.seedAll, {
        departments: [
          {
            id: 'dept-bad',
            name: 'Bad Dept',
            icon: 'x',
            questions: [
              {
                id: 'q1',
                departmentId: 'dept-bad',
                riskCategory: 'Safety',
                text: 'Test',
                criteria: 'Test',
                answerType: 'yes_no' as const,
                pointsYes: -1,
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
