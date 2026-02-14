import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { DeptIcon } from '@/components/DeptIcon';
import { DateRangePills } from '@/components/DateRangePills';
import { DepartmentFilter } from '@/components/DepartmentFilter';
import { ChevronRight, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getScoreColor } from '@/lib/score-colors';
import { exportSessionsCsv } from '@/lib/export';
import { getCompletedSessions, buildDepartmentMap } from '@/lib/session-utils';
import { DATE_RANGE_LABELS, type DateRange } from '@/lib/date-utils';

export function HistoryPage() {
  const { sessions, departments } = useAppStore();
  const navigate = useNavigate();
  const [filterDept, setFilterDept] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const completedSessions = useMemo(
    () => getCompletedSessions(sessions, dateRange),
    [sessions, dateRange]
  );

  const filteredSessions = useMemo(
    () => filterDept === 'all'
      ? completedSessions
      : completedSessions.filter((s) => s.departmentId === filterDept),
    [completedSessions, filterDept]
  );

  // Fix #38: Memoize reversed list
  const displaySessions = useMemo(
    () => [...filteredSessions].reverse(),
    [filteredSessions]
  );

  // Fix #58: Use department map for O(1) lookup
  const deptMap = useMemo(() => buildDepartmentMap(departments), [departments]);

  if (completedSessions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Audit History</h1>
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">No audits completed yet.</p>
          <Button variant="link" onClick={() => navigate('/audit')} className="mt-3">
            Start your first audit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold">Audit History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {completedSessions.length} audits
            {dateRange !== 'all' && <> in last {DATE_RANGE_LABELS[dateRange]}</>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePills value={dateRange} onChange={setDateRange} />
          <DepartmentFilter departments={departments} value={filterDept} onChange={setFilterDept} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportSessionsCsv(filteredSessions, departments)}
          >
            <Download size={14} className="mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Audit list */}
      {displaySessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">
            No audits for this filter.
          </p>
        </div>
      ) : (
        <Card className="divide-y divide-border">
          {displaySessions.map((session) => {
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
      )}
    </div>
  );
}
