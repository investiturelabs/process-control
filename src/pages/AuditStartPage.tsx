import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { DeptIcon } from '@/components/DeptIcon';
import { ChevronRight, TrendingUp, ClipboardList, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getScoreColor } from '@/lib/score-colors';

export function AuditStartPage() {
  const { departments, sessions, currentUser } = useAppStore();
  const navigate = useNavigate();

  const completedSessions = sessions.filter((s) => s.completed);

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
    </div>
  );
}
