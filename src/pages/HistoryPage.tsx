import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { DeptIcon } from '@/components/DeptIcon';
import { ChevronRight, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getScoreColor } from '@/lib/score-colors';
import { exportSessionsCsv } from '@/lib/export';

type DateRange = '30d' | '90d' | '6m' | '1y' | 'all';

function getDateCutoff(range: DateRange): Date | null {
  if (range === 'all') return null;
  const now = new Date();
  switch (range) {
    case '30d': return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    case '90d': return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    case '6m': return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case '1y': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  }
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '30d': '30 days',
  '90d': '90 days',
  '6m': '6 months',
  '1y': '1 year',
  'all': 'All time',
};

export function HistoryPage() {
  const { sessions, departments } = useAppStore();
  const navigate = useNavigate();
  const [filterDept, setFilterDept] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('all');

  const completedSessions = useMemo(() => {
    const cutoff = getDateCutoff(dateRange);
    return sessions
      .filter((s) => {
        if (!s.completed) return false;
        if (cutoff && new Date(s.date) < cutoff) return false;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions, dateRange]);

  const filteredSessions =
    filterDept === 'all'
      ? completedSessions
      : completedSessions.filter((s) => s.departmentId === filterDept);

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
          {/* Date range pills */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['30d', '90d', '6m', '1y', 'all'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  dateRange === range
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                {range === 'all' ? 'All' : range}
              </button>
            ))}
          </div>
          <Select value={filterDept} onValueChange={setFilterDept}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      {filteredSessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">
            No audits for this filter.
          </p>
        </div>
      ) : (
        <Card className="divide-y divide-border">
          {[...filteredSessions].reverse().map((session) => {
            const dept = departments.find(
              (d) => d.id === session.departmentId,
            );
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
                    <p className="text-sm font-medium">{dept?.name}</p>
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
