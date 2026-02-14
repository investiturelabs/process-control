import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { DeptIcon } from '@/components/DeptIcon';
import { ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getScoreColor } from '@/lib/score-colors';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export function HistoryPage() {
  const { sessions, departments } = useAppStore();
  const navigate = useNavigate();
  const [filterDept, setFilterDept] = useState<string>('all');

  const completedSessions = sessions
    .filter((s) => s.completed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const filteredSessions =
    filterDept === 'all'
      ? completedSessions
      : completedSessions.filter((s) => s.departmentId === filterDept);

  const chartData = useMemo(() => {
    return filteredSessions.map((s) => {
      const dept = departments.find((d) => d.id === s.departmentId);
      return {
        date: new Date(s.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        score: s.percentage,
        dept: dept?.name || '',
      };
    });
  }, [filteredSessions, departments]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Audit History</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {completedSessions.length} completed audits
          </p>
        </div>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[180px]">
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
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Score trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, 'Score']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Session list */}
      {filteredSessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">No audits completed yet.</p>
          <Button variant="link" onClick={() => navigate('/')} className="mt-3">
            Start your first audit
          </Button>
        </div>
      ) : (
        <Card className="divide-y divide-border">
          {[...filteredSessions].reverse().map((session) => {
            const dept = departments.find(
              (d) => d.id === session.departmentId
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
                    <span className={`text-sm font-bold ${getScoreColor(session.percentage).text}`}>
                      {session.percentage}%
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {session.totalPoints}/{session.maxPoints} pts
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-muted-foreground/40" />
                </div>
              </button>
            );
          })}
        </Card>
      )}
    </div>
  );
}
