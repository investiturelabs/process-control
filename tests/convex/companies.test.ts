import { convexTest } from 'convex-test';
import { describe, it, expect } from 'vitest';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';
import { modules, clerkIdentity } from './helpers';

describe('companies.get', () => {
  it('throws when not authenticated', async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.companies.get)).rejects.toThrow('Unauthorized');
  });

  it('returns null when no company exists', async () => {
    const t = convexTest(schema, modules);
    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'u1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    const company = await asUser.query(api.companies.get);
    expect(company).toBeNull();
  });
});

describe('companies.set', () => {
  it('throws when not admin', async () => {
    const t = convexTest(schema, modules);

    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    const asUser = t.withIdentity(clerkIdentity({ name: 'User', id: 'user1' }));
    await asUser.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asUser.mutation(api.companies.set, { name: 'Test Corp' })
    ).rejects.toThrow('Forbidden: admin access required');
  });

  it('admin can create company', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await asAdmin.mutation(api.companies.set, { name: 'Test Corp' });

    const company = await asAdmin.query(api.companies.get);
    expect(company).not.toBeNull();
    expect(company!.name).toBe('Test Corp');
  });

  it('admin can update existing company', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await asAdmin.mutation(api.companies.set, { name: 'Corp v1' });
    await asAdmin.mutation(api.companies.set, { name: 'Corp v2', logoUrl: 'https://example.com/logo.png' });

    const company = await asAdmin.query(api.companies.get);
    expect(company!.name).toBe('Corp v2');
    expect(company!.logoUrl).toBe('https://example.com/logo.png');
  });

  it('validates company name', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.companies.set, { name: '' })
    ).rejects.toThrow('company name cannot be empty');
  });

  it('validates whitespace-only name', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.companies.set, { name: '   ' })
    ).rejects.toThrow('company name cannot be empty');
  });

  it('validates name max length', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.companies.set, { name: 'a'.repeat(201) })
    ).rejects.toThrow('company name exceeds maximum length');
  });

  it('validates logoUrl max length', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.companies.set, { name: 'Corp', logoUrl: 'https://' + 'a'.repeat(2050) })
    ).rejects.toThrow('logo URL exceeds maximum length');
  });

  it('rejects http:// URL (H2)', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.companies.set, { name: 'Corp', logoUrl: 'http://example.com/logo.png' })
    ).rejects.toThrow('logo URL must start with https://');
  });

  it('rejects non-URL string (H2)', async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity(clerkIdentity({ name: 'Admin', id: 'admin1' }));
    await asAdmin.mutation(api.users.getOrCreateFromClerk);

    await expect(
      asAdmin.mutation(api.companies.set, { name: 'Corp', logoUrl: 'not-a-url' })
    ).rejects.toThrow('logo URL must start with https://');
  });
});
