import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { DeptIcon } from '@/components/DeptIcon';
import { ChevronRight, BarChart3, TrendingUp, Target, Calendar, Download } from 'lucide-react';
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
import { exportSessionsCsv } from '@/lib/export';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';

const DEPT_COLORS = [
  '#3b82f6', '#f97316', '#14b8a6', '#f59e0b', '#22c55e',
  '#8b5cf6', '#06b6d4', '#6366f1', '#ec4899',
];

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
  const [activeTab, setActiveTab] = useState<'charts' | 'list'>('charts');

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

  // --- Department average scores ---
  const deptAverages = useMemo(() => {
    return departments
      .map((dept, i) => {
        const deptSessions = completedSessions.filter(
          (s) => s.departmentId === dept.id,
        );
        const avg =
          deptSessions.length > 0
            ? Math.round(
                deptSessions.reduce((acc, s) => acc + s.percentage, 0) /
                  deptSessions.length,
              )
            : 0;
        const recent = deptSessions.slice(-3);
        const recentAvg =
          recent.length > 0
            ? Math.round(
                recent.reduce((acc, s) => acc + s.percentage, 0) / recent.length,
              )
            : 0;
        return {
          name: dept.name.length > 12 ? dept.name.slice(0, 12) + '...' : dept.name,
          fullName: dept.name,
          avg,
          recentAvg,
          count: deptSessions.length,
          color: DEPT_COLORS[i % DEPT_COLORS.length],
          icon: dept.icon,
          id: dept.id,
        };
      })
      .filter((d) => d.count > 0)
      .sort((a, b) => b.avg - a.avg);
  }, [departments, completedSessions]);

  // --- Monthly trend data (overall average per month) ---
  const monthlyTrend = useMemo(() => {
    const byMonth = new Map<string, number[]>();
    for (const s of completedSessions) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(s.percentage);
    }
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, scores]) => {
        const [y, m] = key.split('-');
        const date = new Date(Number(y), Number(m) - 1);
        return {
          month: date.toLocaleDateString('en-US', {
            month: 'short',
            year: '2-digit',
          }),
          avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
          audits: scores.length,
        };
      });
  }, [completedSessions]);

  // --- Score distribution buckets ---
  const scoreDistribution = useMemo(() => {
    const buckets = [
      { label: '<70%', min: 0, max: 70, count: 0, color: '#ef4444' },
      { label: '70-79%', min: 70, max: 80, count: 0, color: '#f97316' },
      { label: '80-89%', min: 80, max: 90, count: 0, color: '#f59e0b' },
      { label: '90-94%', min: 90, max: 95, count: 0, color: '#3b82f6' },
      { label: '95-100%', min: 95, max: 101, count: 0, color: '#22c55e' },
    ];
    for (const s of filteredSessions) {
      const b = buckets.find(
        (b) => s.percentage >= b.min && s.percentage < b.max,
      );
      if (b) b.count++;
    }
    return buckets;
  }, [filteredSessions]);

  // --- Radar chart data (latest score per department) ---
  const radarData = useMemo(() => {
    return departments
      .map((dept) => {
        const deptSessions = completedSessions.filter(
          (s) => s.departmentId === dept.id,
        );
        const latest = deptSessions[deptSessions.length - 1];
        return {
          department: dept.name.length > 10 ? dept.name.slice(0, 10) + '..' : dept.name,
          score: latest?.percentage ?? 0,
        };
      })
      .filter((d) => d.score > 0);
  }, [departments, completedSessions]);

  // --- Per-department trend lines ---
  const deptTrends = useMemo(() => {
    const byMonth = new Map<string, Map<string, number[]>>();
    for (const s of completedSessions) {
      const d = new Date(s.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(monthKey)) byMonth.set(monthKey, new Map());
      const deptMap = byMonth.get(monthKey)!;
      if (!deptMap.has(s.departmentId)) deptMap.set(s.departmentId, []);
      deptMap.get(s.departmentId)!.push(s.percentage);
    }

    const monthKeys = Array.from(byMonth.keys()).sort();
    return monthKeys.map((key) => {
      const [y, m] = key.split('-');
      const date = new Date(Number(y), Number(m) - 1);
      const row: Record<string, string | number> = {
        month: date.toLocaleDateString('en-US', {
          month: 'short',
          year: '2-digit',
        }),
      };
      const deptMap = byMonth.get(key)!;
      for (const dept of departments) {
        const scores = deptMap.get(dept.id);
        if (scores) {
          row[dept.id] = Math.round(
            scores.reduce((a, b) => a + b, 0) / scores.length,
          );
        }
      }
      return row;
    });
  }, [completedSessions, departments]);

  // --- Summary stats ---
  const overallAvg =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((acc, s) => acc + s.percentage, 0) /
            completedSessions.length,
        )
      : 0;

  const recentMonth = completedSessions.slice(-20);
  const recentAvg =
    recentMonth.length > 0
      ? Math.round(
          recentMonth.reduce((acc, s) => acc + s.percentage, 0) /
            recentMonth.length,
        )
      : 0;

  const bestDept = deptAverages[0];
  const improvementTrend =
    monthlyTrend.length >= 2
      ? monthlyTrend[monthlyTrend.length - 1].avg - monthlyTrend[0].avg
      : 0;

  if (completedSessions.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Audit History</h1>
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">No audits completed yet.</p>
          <Button variant="link" onClick={() => navigate('/')} className="mt-3">
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
          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setActiveTab('charts')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'charts'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              Charts
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              }`}
            >
              List
            </button>
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

      {activeTab === 'charts' && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <Target size={16} className="text-primary" />
                </div>
                <p className="text-2xl font-bold">{overallAvg}%</p>
                <p className="text-xs text-muted-foreground">Overall Avg</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                  <TrendingUp size={16} className="text-emerald-600" />
                </div>
                <p className="text-2xl font-bold">
                  {improvementTrend >= 0 ? '+' : ''}
                  {improvementTrend}%
                </p>
                <p className="text-xs text-muted-foreground">Trend</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mx-auto mb-2">
                  <Calendar size={16} className="text-amber-600" />
                </div>
                <p className="text-2xl font-bold">{recentAvg}%</p>
                <p className="text-xs text-muted-foreground">Recent Avg</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center mx-auto mb-2">
                  <BarChart3 size={16} className="text-violet-600" />
                </div>
                <p className="text-2xl font-bold">{completedSessions.length}</p>
                <p className="text-xs text-muted-foreground">Total Audits</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Overall Trend */}
          {monthlyTrend.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Monthly Average Score</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[60, 100]}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip
                      formatter={(value, _name, props) => [
                        `${value}% (${props.payload.audits} audits)`,
                        'Average',
                      ]}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="avg"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      fill="url(#scoreGradient)"
                      dot={{ fill: '#3b82f6', r: 4, strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Two-column: Department Trends + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Department Trend Lines */}
            {deptTrends.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Department Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={deptTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[60, 100]}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '11px',
                        }}
                        formatter={(value, name) => {
                          const dept = departments.find((d) => d.id === name);
                          return [`${value}%`, dept?.name ?? name];
                        }}
                      />
                      {departments.map((dept, i) => (
                        <Line
                          key={dept.id}
                          type="monotone"
                          dataKey={dept.id}
                          stroke={DEPT_COLORS[i % DEPT_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
                    {departments.map((dept, i) => {
                      const hasSessions = completedSessions.some(
                        (s) => s.departmentId === dept.id,
                      );
                      if (!hasSessions) return null;
                      return (
                        <div key={dept.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: DEPT_COLORS[i % DEPT_COLORS.length] }}
                          />
                          {dept.name}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Radar Chart */}
            {radarData.length >= 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Latest Score by Department</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={310}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis
                        dataKey="department"
                        tick={{ fontSize: 10, fill: '#64748b' }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fontSize: 9, fill: '#94a3b8' }}
                      />
                      <Radar
                        dataKey="score"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.15}
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#3b82f6' }}
                      />
                      <Tooltip
                        formatter={(value) => [`${value}%`, 'Score']}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Two-column: Department Rankings + Score Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Department Rankings */}
            {deptAverages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Department Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={deptAverages.length * 44 + 20}>
                    <BarChart
                      data={deptAverages}
                      layout="vertical"
                      margin={{ left: 10, right: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        formatter={(value, _name, props) => [
                          `${value}% avg (${props.payload.count} audits)`,
                          props.payload.fullName,
                        ]}
                        contentStyle={{
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          fontSize: '12px',
                        }}
                      />
                      <Bar dataKey="avg" radius={[0, 6, 6, 0]} barSize={24}>
                        {deptAverages.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getScoreColor(entry.avg).hex}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  Score Distribution
                  {filterDept !== 'all' && (
                    <span className="font-normal text-muted-foreground ml-1">(filtered)</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(value) => [`${value} audits`, 'Count']}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48}>
                      {scoreDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Best dept callout */}
          {bestDept && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <DeptIcon name={bestDept.icon} size={20} className="text-emerald-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">
                    Top Performing: {bestDept.fullName}
                  </p>
                  <p className="text-xs text-emerald-700">
                    {bestDept.avg}% average across {bestDept.count} audits
                    {bestDept.recentAvg > bestDept.avg && (
                      <> &middot; trending up to {bestDept.recentAvg}% recently</>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* List tab */}
      {activeTab === 'list' && (
        <>
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
        </>
      )}
    </div>
  );
}
