import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { DeptIcon } from '@/components/DeptIcon';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { getScoreColor, getGradeLabel } from '@/lib/score-colors';

export function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { sessions, departments } = useAppStore();

  const session = sessions.find((s) => s.id === sessionId);
  const dept = session
    ? departments.find((d) => d.id === session.departmentId)
    : null;

  const answerMap = useMemo(() => {
    if (!session) return new Map<string, (typeof session.answers)[0]>();
    return new Map(session.answers.map((a) => [a.questionId, a]));
  }, [session]);

  const categoryBreakdown = useMemo(() => {
    if (!dept || !session) return [];
    const cats: {
      name: string;
      earned: number;
      max: number;
      questions: {
        text: string;
        value: string;
        earned: number;
        max: number;
      }[];
    }[] = [];

    for (const q of dept.questions) {
      let cat = cats.find((c) => c.name === q.riskCategory);
      if (!cat) {
        cat = { name: q.riskCategory, earned: 0, max: 0, questions: [] };
        cats.push(cat);
      }
      const ans = answerMap.get(q.id);
      const earned = ans?.points ?? 0;
      cat.earned += earned;
      cat.max += q.pointsYes;
      cat.questions.push({
        text: q.text,
        value: ans?.value ?? 'skipped',
        earned,
        max: q.pointsYes,
      });
    }
    return cats;
  }, [dept, session, answerMap]);

  if (!session || !dept) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Audit not found.</p>
        <Button variant="link" onClick={() => navigate('/')} className="mt-4">
          Back to dashboard
        </Button>
      </div>
    );
  }

  const scoreColor = getScoreColor(session.percentage);
  const gradeLabel = getGradeLabel(session.percentage);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-2">
          <DeptIcon name={dept.icon} size={18} className="text-muted-foreground" />
          <h1 className="font-semibold">{dept.name} — Audit Results</h1>
        </div>
      </div>

      {/* Score hero */}
      <Card className="rounded-2xl text-center mb-6">
        <CardContent className="p-6">
          <div className="flex justify-center mb-3">
            <div className={`w-16 h-16 rounded-2xl ${scoreColor.bgLight} flex items-center justify-center`}>
              {session.percentage >= 91 ? (
                <Trophy size={28} className={scoreColor.text} />
              ) : (
                <TrendingUp size={28} className={scoreColor.text} />
              )}
            </div>
          </div>
          <p className="text-5xl font-extrabold">{session.percentage}%</p>
          <p className={`text-sm font-semibold mt-1 ${scoreColor.text}`}>
            {gradeLabel}
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{session.totalPoints}</strong> /{' '}
              {session.maxPoints} pts
            </span>
            <span>{new Date(session.date).toLocaleDateString()}</span>
            <span>{session.auditorName}</span>
          </div>

          <div className="mt-4 h-3 bg-secondary rounded-full overflow-hidden max-w-xs mx-auto">
            <div
              className={`h-full rounded-full score-bar ${scoreColor.bg}`}
              style={{ width: `${session.percentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <div className="space-y-4">
        {categoryBreakdown.map((cat) => {
          const pct = cat.max > 0 ? Math.round((cat.earned / cat.max) * 100) : 0;
          const catColor = getScoreColor(pct);
          return (
            <Card key={cat.name}>
              <CardHeader className="px-4 py-3 flex-row items-center justify-between space-y-0">
                <div>
                  <h3 className="text-sm font-semibold">{cat.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {cat.earned} / {cat.max} pts
                  </p>
                </div>
                <span className={`text-sm font-bold ${catColor.text}`}>
                  {pct}%
                </span>
              </CardHeader>
              <Separator />
              <CardContent className="p-0 divide-y divide-border/50">
                {cat.questions.map((q, i) => (
                  <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                    <div className="mt-0.5">
                      {q.value === 'yes' && (
                        <CheckCircle2 size={16} className="text-emerald-500" />
                      )}
                      {q.value === 'partial' && (
                        <MinusCircle size={16} className="text-amber-500" />
                      )}
                      {q.value === 'no' && (
                        <XCircle size={16} className="text-red-500" />
                      )}
                      {q.value === 'skipped' && (
                        <div className="w-4 h-4 rounded-full border-2 border-border" />
                      )}
                    </div>
                    <p className="flex-1 min-w-0 text-sm leading-snug">
                      {q.text}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {q.earned}/{q.max}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <Button onClick={() => navigate('/')}>Back to dashboard</Button>
      </div>
    </div>
  );
}
