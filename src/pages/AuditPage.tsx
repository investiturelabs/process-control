import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { DeptIcon } from '@/components/DeptIcon';
import type { Answer, AnswerValue, Question } from '@/types';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowLeft,
  ArrowRight,
  SkipForward,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

export function AuditPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const { departments, currentUser, saveSession, company } = useAppStore();

  const dept = departments.find((d) => d.id === departmentId);

  const categories = useMemo(() => {
    if (!dept) return [];
    const cats: { name: string; questions: Question[] }[] = [];
    for (const q of dept.questions) {
      const existing = cats.find((c) => c.name === q.riskCategory);
      if (existing) {
        existing.questions.push(q);
      } else {
        cats.push({ name: q.riskCategory, questions: [q] });
      }
    }
    return cats;
  }, [dept]);

  const allQuestions = useMemo(
    () => categories.flatMap((c) => c.questions),
    [categories]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [animKey, setAnimKey] = useState(0);

  const currentQuestion = allQuestions[currentIndex];
  const totalQuestions = allQuestions.length;
  const answeredCount = answers.size;
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const currentCategory = useMemo(() => {
    if (!currentQuestion) return '';
    return currentQuestion.riskCategory;
  }, [currentQuestion]);

  const getPoints = useCallback(
    (question: Question, value: AnswerValue): number => {
      if (value === 'yes') return question.pointsYes;
      if (value === 'partial') return question.pointsPartial;
      return question.pointsNo;
    },
    []
  );

  const handleAnswer = useCallback(
    (value: AnswerValue) => {
      if (!currentQuestion) return;
      const pts = getPoints(currentQuestion, value);
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(currentQuestion.id, {
          questionId: currentQuestion.id,
          value,
          points: pts,
        });
        return next;
      });

      setTimeout(() => {
        if (currentIndex < totalQuestions - 1) {
          setCurrentIndex((i) => i + 1);
          setAnimKey((k) => k + 1);
        }
      }, 250);
    },
    [currentQuestion, currentIndex, totalQuestions, getPoints]
  );

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setAnimKey((k) => k + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
      setAnimKey((k) => k + 1);
    }
  };

  const handleFinish = async () => {
    if (!dept || !currentUser) return;

    const maxPoints = allQuestions.reduce((acc, q) => acc + q.pointsYes, 0);
    const earnedPoints = Array.from(answers.values()).reduce(
      (acc, a) => acc + a.points,
      0
    );
    const pct = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

    const sessionId = await saveSession({
      companyId: company?.id || '',
      departmentId: dept.id,
      auditorId: currentUser.id,
      auditorName: currentUser.name,
      date: new Date().toISOString(),
      answers: Array.from(answers.values()),
      totalPoints: earnedPoints,
      maxPoints,
      percentage: pct,
      completed: true,
    });

    navigate(`/results/${sessionId}`);
  };

  if (!dept) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Department not found.</p>
        <Button variant="link" onClick={() => navigate('/')} className="mt-4">
          Back to dashboard
        </Button>
      </div>
    );
  }

  const currentAnswer = currentQuestion
    ? answers.get(currentQuestion.id)?.value ?? null
    : null;

  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
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
            <h1 className="font-semibold">{dept.name}</h1>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Progress bar */}
      <Progress value={progress} className="h-1.5 mb-6" />

      {/* Category badge */}
      <div className="mb-3">
        <Badge variant="secondary">{currentCategory}</Badge>
      </div>

      {/* Flashcard */}
      {currentQuestion && (
        <Card key={animKey} className="flashcard-enter rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-6 pb-4">
            <h2 className="text-lg font-semibold leading-snug">
              {currentQuestion.text}
            </h2>
            {currentQuestion.criteria && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {currentQuestion.criteria}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span>Full: {currentQuestion.pointsYes} pts</span>
              {currentQuestion.answerType === 'yes_no_partial' && (
                <span>Partial: {currentQuestion.pointsPartial} pts</span>
              )}
              <span>No: 0 pts</span>
            </div>
          </CardContent>

          <Separator />

          {/* Answer buttons */}
          <div className="p-4">
            <div
              className={`grid gap-3 ${
                currentQuestion.answerType === 'yes_no_partial'
                  ? 'grid-cols-3'
                  : 'grid-cols-2'
              }`}
            >
              <button
                onClick={() => handleAnswer('yes')}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all ${
                  currentAnswer === 'yes'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-border hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                <CheckCircle2
                  size={24}
                  className={currentAnswer === 'yes' ? 'text-emerald-500' : 'text-muted-foreground/30'}
                />
                <span
                  className={`text-sm font-semibold ${
                    currentAnswer === 'yes' ? 'text-emerald-700' : 'text-muted-foreground'
                  }`}
                >
                  Yes
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentQuestion.pointsYes} pts
                </span>
              </button>

              {currentQuestion.answerType === 'yes_no_partial' && (
                <button
                  onClick={() => handleAnswer('partial')}
                  className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all ${
                    currentAnswer === 'partial'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-border hover:border-amber-300 hover:bg-amber-50/50'
                  }`}
                >
                  <MinusCircle
                    size={24}
                    className={currentAnswer === 'partial' ? 'text-amber-500' : 'text-muted-foreground/30'}
                  />
                  <span
                    className={`text-sm font-semibold ${
                      currentAnswer === 'partial' ? 'text-amber-700' : 'text-muted-foreground'
                    }`}
                  >
                    Partial
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currentQuestion.pointsPartial} pts
                  </span>
                </button>
              )}

              <button
                onClick={() => handleAnswer('no')}
                className={`flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all ${
                  currentAnswer === 'no'
                    ? 'border-red-500 bg-red-50'
                    : 'border-border hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                <XCircle
                  size={24}
                  className={currentAnswer === 'no' ? 'text-red-500' : 'text-muted-foreground/30'}
                />
                <span
                  className={`text-sm font-semibold ${
                    currentAnswer === 'no' ? 'text-red-700' : 'text-muted-foreground'
                  }`}
                >
                  No
                </span>
                <span className="text-xs text-muted-foreground">0 pts</span>
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="gap-1.5"
        >
          <ArrowLeft size={14} />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {!isLastQuestion && (
            <Button variant="ghost" size="sm" onClick={handleNext} className="gap-1.5">
              Skip
              <SkipForward size={14} />
            </Button>
          )}

          {(isLastQuestion || answeredCount === totalQuestions) && (
            <Button onClick={handleFinish} className="gap-1.5">
              Finish audit
              <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Question dots navigator */}
      <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
        {allQuestions.map((q, i) => {
          const ans = answers.get(q.id);
          let dotColor = 'bg-muted';
          if (ans?.value === 'yes') dotColor = 'bg-emerald-400';
          else if (ans?.value === 'partial') dotColor = 'bg-amber-400';
          else if (ans?.value === 'no') dotColor = 'bg-red-400';

          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(i);
                setAnimKey((k) => k + 1);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${dotColor} ${
                i === currentIndex ? 'ring-2 ring-primary ring-offset-1' : ''
              }`}
              title={`Question ${i + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}
