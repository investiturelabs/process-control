import { Component, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePaginatedQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAppStore } from '@/context';
import { DeptIcon } from '@/components/DeptIcon';
import { DateRangePills } from '@/components/DateRangePills';
import { DepartmentFilter } from '@/components/DepartmentFilter';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ChevronRight, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getScoreColor } from '@/lib/score-colors';
import { exportSessionsCsv } from '@/lib/export';
import { buildDepartmentMap } from '@/lib/session-utils';
import { track } from '@/lib/analytics';
import { getDateCutoff, DATE_RANGE_LABELS, type DateRange } from '@/lib/date-utils';
import type { AuditSession } from '@/types';

class HistoryErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="text-center py-16">
          <p className="text-destructive text-sm">Failed to load audit history.</p>
          <Button
            variant="link"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function HistoryPage() {
  const { departments } = useAppStore();
  const navigate = useNavigate();
  const [filterDept, setFilterDept] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const paginatedArgs = useMemo(
    () => (filterDept !== 'all' ? { departmentId: filterDept } : {}),
    [filterDept],
  );

  const { results: rawSessions, status, loadMore } = usePaginatedQuery(
    api.sessions.listPaginated,
    paginatedArgs,
    { initialNumItems: 25 },
  );

  const displaySessions = useMemo<AuditSession[]>(
    () =>
      rawSessions.map((s) => ({
        id: s._id as string,
        companyId: s.companyId,
        departmentId: s.departmentId,
        auditorId: s.auditorId,
        auditorName: s.auditorName,
        date: s.date,
        answers: s.answers,
        totalPoints: s.totalPoints,
        maxPoints: s.maxPoints,
        percentage: s.percentage,
        completed: s.completed,
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [rawSessions],
  );

  const filteredSessions = useMemo(() => {
    if (dateRange === 'all') return displaySessions;
    const cutoff = getDateCutoff(dateRange);
    if (!cutoff) return displaySessions;
    return displaySessions.filter((s) => new Date(s.date) >= cutoff);
  }, [displaySessions, dateRange]);

  const deptMap = useMemo(() => buildDepartmentMap(departments), [departments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Audit History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filteredSessions.length} audit{filteredSessions.length !== 1 ? 's' : ''}
            {status !== 'Exhausted' && ' loaded'}
            {dateRange !== 'all' && <> in last {DATE_RANGE_LABELS[dateRange]}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePills value={dateRange} onChange={setDateRange} />
          <DepartmentFilter departments={departments} value={filterDept} onChange={setFilterDept} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (status !== 'Exhausted') {
                exportSessionsCsv(
                  filteredSessions,
                  departments,
                  `audit-history-partial-${filteredSessions.length}.csv`,
                );
              } else {
                exportSessionsCsv(filteredSessions, departments);
              }
              track({ name: 'csv_exported', properties: { type: 'sessions' } });
            }}
          >
            <Download size={14} className="mr-1.5" />
            Export CSV{status !== 'Exhausted' ? ` (${filteredSessions.length} loaded)` : ''}
          </Button>
        </div>
      </div>

      {/* Content */}
      <HistoryErrorBoundary>
        {status === 'LoadingFirstPage' ? (
          <LoadingSpinner />
        ) : displaySessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">No audits completed yet.</p>
            <Button variant="link" onClick={() => navigate('/audit')} className="mt-3">
              Start your first audit
            </Button>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              No audits for this filter.
            </p>
          </div>
        ) : (
          <>
            <Card className="divide-y divide-border">
              {filteredSessions.map((session) => {
                const dept = deptMap.get(session.departmentId);
                return (
                  <button
                    key={session.id}
                    onClick={() => navigate(`/results/${session.id}`)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
                        <DeptIcon
                          name={dept?.icon || 'HelpCircle'}
                          size={16}
                          className="text-muted-foreground"
                        />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{dept?.name ?? 'Unknown department'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          &middot; {session.auditorName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span
                          className={`text-sm font-bold ${getScoreColor(session.percentage).text}`}
                        >
                          {session.percentage}%
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {session.totalPoints}/{session.maxPoints} pts
                        </p>
                      </div>
                      <ChevronRight
                        size={14}
                        className="text-muted-foreground/40"
                      />
                    </div>
                  </button>
                );
              })}
            </Card>

            {status === 'CanLoadMore' && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" size="sm" onClick={() => loadMore(25)}>
                  Load more
                </Button>
              </div>
            )}
            {status === 'LoadingMore' && (
              <div className="flex justify-center pt-4">
                <LoadingSpinner />
              </div>
            )}
            {status === 'Exhausted' && filteredSessions.length > 25 && (
              <p className="text-center text-xs text-muted-foreground pt-4">
                All audits loaded
              </p>
            )}
          </>
        )}
      </HistoryErrorBoundary>
    </div>
  );
}
