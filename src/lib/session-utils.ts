import type { AuditSession, Department } from '@/types';
import type { DateRange } from '@/lib/date-utils';
import { getDateCutoff } from '@/lib/date-utils';

/** Filter completed sessions by date range, always sorted ascending by date */
export function getCompletedSessions(sessions: AuditSession[], dateRange: DateRange): AuditSession[] {
  const cutoff = getDateCutoff(dateRange);
  return sessions
    .filter(s => {
      if (!s.completed) return false;
      if (cutoff && new Date(s.date) < cutoff) return false;
      return true;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/** Compute average percentage, returns 0 if empty */
export function averagePercentage(sessions: Pick<AuditSession, 'percentage'>[]): number {
  if (sessions.length === 0) return 0;
  return Math.round(sessions.reduce((acc, s) => acc + s.percentage, 0) / sessions.length);
}

/** Build a Map for O(1) department lookup by ID */
export function buildDepartmentMap(departments: Department[]): Map<string, Department> {
  return new Map(departments.map(d => [d.id, d]));
}
