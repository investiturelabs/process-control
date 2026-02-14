import { describe, it, expect } from 'vitest';
import { getCompletedSessions, averagePercentage, buildDepartmentMap } from '@/lib/session-utils';
import type { AuditSession, Department } from '@/types';

function mockSession(overrides: Partial<AuditSession> = {}): AuditSession {
  return {
    id: '1',
    companyId: 'c1',
    departmentId: 'd1',
    auditorId: 'a1',
    auditorName: 'Test',
    date: '2025-01-15T00:00:00.000Z',
    answers: [],
    totalPoints: 80,
    maxPoints: 100,
    percentage: 80,
    completed: true,
    ...overrides,
  };
}

describe('getCompletedSessions', () => {
  it('filters out incomplete sessions', () => {
    const sessions = [
      mockSession({ id: '1', completed: true }),
      mockSession({ id: '2', completed: false }),
    ];
    const result = getCompletedSessions(sessions, 'all');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by date range', () => {
    const old = mockSession({ id: '1', date: '2020-01-01T00:00:00.000Z' });
    const recent = mockSession({ id: '2', date: new Date().toISOString() });
    const result = getCompletedSessions([old, recent], '30d');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('returns all completed sessions for "all" range', () => {
    const sessions = [
      mockSession({ id: '1', date: '2020-01-01T00:00:00.000Z' }),
      mockSession({ id: '2', date: '2024-06-01T00:00:00.000Z' }),
    ];
    const result = getCompletedSessions(sessions, 'all');
    expect(result).toHaveLength(2);
  });

  it('always returns sorted ascending by date', () => {
    const sessions = [
      mockSession({ id: '1', date: '2025-03-01T00:00:00.000Z' }),
      mockSession({ id: '2', date: '2025-01-01T00:00:00.000Z' }),
      mockSession({ id: '3', date: '2025-02-01T00:00:00.000Z' }),
    ];
    const result = getCompletedSessions(sessions, 'all');
    expect(result.map(s => s.id)).toEqual(['2', '3', '1']);
  });
});

describe('averagePercentage', () => {
  it('returns 0 for empty array', () => {
    expect(averagePercentage([])).toBe(0);
  });

  it('computes correct average and rounds', () => {
    const sessions = [{ percentage: 80 }, { percentage: 90 }, { percentage: 85 }];
    expect(averagePercentage(sessions)).toBe(85);
  });

  it('rounds to nearest integer', () => {
    const sessions = [{ percentage: 33 }, { percentage: 34 }];
    expect(averagePercentage(sessions)).toBe(34); // 33.5 rounds to 34
  });
});

describe('buildDepartmentMap', () => {
  it('returns Map with O(1) lookup', () => {
    const departments: Department[] = [
      { id: 'd1', name: 'Deli', icon: 'UtensilsCrossed', questions: [] },
      { id: 'd2', name: 'Meat', icon: 'Fish', questions: [] },
    ];
    const map = buildDepartmentMap(departments);
    expect(map.get('d1')?.name).toBe('Deli');
    expect(map.get('d2')?.name).toBe('Meat');
    expect(map.get('nonexistent')).toBeUndefined();
  });
});
