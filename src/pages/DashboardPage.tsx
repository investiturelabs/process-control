import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { DeptIcon } from '@/components/DeptIcon';
import { ChevronRight, TrendingUp, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getScoreColor } from '@/lib/score-colors';

export function DashboardPage() {
  const { departments, sessions, currentUser } = useAppStore();
  const navigate = useNavigate();

  const completedSessions = sessions.filter((s) => s.completed);
  const recentSessions = completedSessions.slice(-5).reverse();

  const totalQuestions = departments.reduce(
    (acc, d) => acc + d.questions.length,
    0
  );

  const avgScore =
    completedSessions.length > 0
      ? Math.round(
          completedSessions.reduce((acc, s) => acc + s.percentage, 0) /
            completedSessions.length
        )
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">
          Welcome back, {currentUser?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Start a new audit or review past scores
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <ClipboardList size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{departments.length}</p>
                <p className="text-xs text-muted-foreground">Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 size={18} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalQuestions}</p>
                <p className="text-xs text-muted-foreground">Audit questions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {avgScore !== null ? `${avgScore}%` : '--'}
                </p>
                <p className="text-xs text-muted-foreground">Avg score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Department cards */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Start an audit</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {departments.map((dept) => {
            const deptSessions = completedSessions.filter(
              (s) => s.departmentId === dept.id
            );
            const lastSession = deptSessions[deptSessions.length - 1];
            const maxPts = dept.questions.reduce(
              (acc, q) => acc + q.pointsYes,
              0
            );

            return (
              <button
                key={dept.id}
                onClick={() => navigate(`/audit/${dept.id}`)}
                className="text-left w-full"
              >
                <Card className="hover:border-primary/40 hover:shadow-sm transition-all group h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                          <DeptIcon
                            name={dept.icon}
                            size={20}
                            className="text-muted-foreground group-hover:text-primary transition-colors"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{dept.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {dept.questions.length} questions &middot; {maxPts} pts
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground/40 group-hover:text-primary mt-1 transition-colors"
                      />
                    </div>
                    {lastSession && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Last score</span>
                          <span className={`font-semibold ${getScoreColor(lastSession.percentage).text}`}>
                            {lastSession.percentage}%
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full score-bar ${getScoreColor(lastSession.percentage).bg}`}
                            style={{ width: `${lastSession.percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent audits */}
      {recentSessions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Recent audits</h2>
            <Button
              variant="link"
              size="sm"
              className="text-xs h-auto p-0"
              onClick={() => navigate('/history')}
            >
              View all
            </Button>
          </div>
          <Card className="divide-y divide-border">
            {recentSessions.map((session) => {
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
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                      <DeptIcon
                        name={dept?.icon || 'HelpCircle'}
                        size={16}
                        className="text-muted-foreground"
                      />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{dept?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.date).toLocaleDateString()} &middot;{' '}
                        {session.auditorName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${getScoreColor(session.percentage).text}`}>
                      {session.percentage}%
                    </span>
                    <ChevronRight size={14} className="text-muted-foreground/40" />
                  </div>
                </button>
              );
            })}
          </Card>
        </div>
      )}
    </div>
  );
}
