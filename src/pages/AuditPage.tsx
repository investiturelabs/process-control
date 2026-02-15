import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/context';
import { DeptIcon } from '@/components/DeptIcon';
import type { Answer, AnswerValue, Question } from '@/types';
import { toast } from 'sonner';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowLeft,
  ArrowRight,
  SkipForward,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { track } from '@/lib/analytics';
import { captureException } from '@/lib/errorTracking';

export function AuditPage() {
  const { departmentId } = useParams<{ departmentId: string }>();
  const navigate = useNavigate();
  const { departments, currentUser, sessions, saveSession, updateSession, company } = useAppStore();

  const dept = departments.find((d) => d.id === departmentId);

  // Find existing in-progress session for this department + user
  const existingSession = useMemo(() => {
    if (!departmentId || !currentUser) return null;
    return sessions.find(
      (s) => s.departmentId === departmentId && s.auditorId === currentUser.id && !s.completed
    ) ?? null;
  }, [sessions, departmentId, currentUser]);

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

  // Initialize from existing session if resuming
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, Answer>>(new Map());
  const [animKey, setAnimKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showSkipDialog, setShowSkipDialog] = useState(false);
  const [reviewingSkipped, setReviewingSkipped] = useState(false);
  const [skippedIndices, setSkippedIndices] = useState<number[]>([]);
  const initialized = useRef(false);

  // Resume from existing session on mount
  useEffect(() => {
    if (initialized.current || !existingSession || allQuestions.length === 0) return;
    initialized.current = true;

    setSessionId(existingSession.id);
    const restoredAnswers = new Map<string, Answer>();
    for (const a of existingSession.answers) {
      restoredAnswers.set(a.questionId, a);
    }
    setAnswers(restoredAnswers);

    // Position at the first unanswered question
    const firstUnanswered = allQuestions.findIndex((q) => !restoredAnswers.has(q.id));
    if (firstUnanswered >= 0) {
      setCurrentIndex(firstUnanswered);
    } else {
      // All answered — go to last question
      setCurrentIndex(allQuestions.length - 1);
    }
  }, [existingSession, allQuestions]);

  // Debounced auto-save
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const autoSave = useCallback(() => {
    if (!dept || !currentUser) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const currentAnswers = Array.from(answersRef.current.values());
      if (currentAnswers.length === 0) return;

      const maxPoints = allQuestions.reduce((acc, q) => acc + q.pointsYes, 0);
      const earnedPoints = currentAnswers.reduce((acc, a) => acc + a.points, 0);
      const pct = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

      try {
        if (sessionIdRef.current) {
          await updateSession(sessionIdRef.current, {
            answers: currentAnswers,
            totalPoints: earnedPoints,
            maxPoints,
            percentage: pct,
            date: new Date().toISOString(),
          });
        } else {
          const id = await saveSession({
            companyId: company?.id ?? '',
            departmentId: dept.id,
            auditorId: currentUser.id,
            auditorName: currentUser.name,
            date: new Date().toISOString(),
            answers: currentAnswers,
            totalPoints: earnedPoints,
            maxPoints,
            percentage: pct,
            completed: false,
          });
          setSessionId(id);
          sessionIdRef.current = id;
        }
      } catch {
        // Silent — auto-save failure shouldn't interrupt the audit
      }
    }, 1500);
  }, [dept, currentUser, allQuestions, company, saveSession, updateSession]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => clearTimeout(saveTimer.current);
  }, []);

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

      // Trigger auto-save
      autoSave();

      // Remove from skipped list if in review mode
      if (reviewingSkipped) {
        setSkippedIndices((prev) => {
          const updated = prev.filter((i) => i !== currentIndex);
          if (updated.length === 0) {
            // All skipped questions answered — exit review mode
            setReviewingSkipped(false);
          }
          return updated;
        });
      }

      setTimeout(() => {
        if (reviewingSkipped) {
          // In review mode: advance to next skipped question (if any remain)
          setSkippedIndices((prev) => {
            if (prev.length === 0) return prev; // All answered, review mode already exited
            const nextIdx = prev.find((i) => i > currentIndex) ?? prev[0];
            setCurrentIndex(nextIdx);
            setAnimKey((k) => k + 1);
            return prev;
          });
        } else {
          setCurrentIndex((i) => {
            if (i < totalQuestions - 1) {
              setAnimKey((k) => k + 1);
              return i + 1;
            }
            return i;
          });
        }
      }, 250);
    },
    [currentQuestion, currentIndex, totalQuestions, getPoints, autoSave, reviewingSkipped]
  );

  const handlePrev = useCallback(() => {
    if (reviewingSkipped && skippedIndices.length > 0) {
      const pos = skippedIndices.indexOf(currentIndex);
      const prevIdx = pos > 0 ? skippedIndices[pos - 1] : skippedIndices[skippedIndices.length - 1];
      setCurrentIndex(prevIdx);
      setAnimKey((k) => k + 1);
    } else if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setAnimKey((k) => k + 1);
    }
  }, [currentIndex, reviewingSkipped, skippedIndices]);

  const handleNext = useCallback(() => {
    if (reviewingSkipped && skippedIndices.length > 0) {
      const pos = skippedIndices.indexOf(currentIndex);
      const nextIdx = pos < skippedIndices.length - 1 ? skippedIndices[pos + 1] : skippedIndices[0];
      setCurrentIndex(nextIdx);
      setAnimKey((k) => k + 1);
    } else if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((i) => i + 1);
      setAnimKey((k) => k + 1);
    }
  }, [currentIndex, totalQuestions, reviewingSkipped, skippedIndices]);

  const handleFinish = async () => {
    if (!dept || !currentUser) return;

    const unanswered = totalQuestions - answers.size;
    if (unanswered > 0) {
      const indices = allQuestions
        .map((q, i) => (!answers.has(q.id) ? i : -1))
        .filter((i) => i >= 0);
      setSkippedIndices(indices);
      setShowSkipDialog(true);
      return;
    }

    // Exit review mode if all answered
    if (reviewingSkipped) {
      setReviewingSkipped(false);
      setSkippedIndices([]);
    }

    await finishAudit();
  };

  const finishAudit = async () => {
    if (!dept || !currentUser) return;

    const maxPoints = allQuestions.reduce((acc, q) => acc + q.pointsYes, 0);
    const earnedPoints = Array.from(answers.values()).reduce(
      (acc, a) => acc + a.points,
      0
    );
    const pct = maxPoints > 0 ? Math.round((earnedPoints / maxPoints) * 100) : 0;

    setIsSaving(true);
    // Cancel any pending auto-save
    clearTimeout(saveTimer.current);

    try {
      if (sessionId) {
        // Update existing in-progress session to completed
        await updateSession(sessionId, {
          answers: Array.from(answers.values()),
          totalPoints: earnedPoints,
          maxPoints,
          percentage: pct,
          date: new Date().toISOString(),
          completed: true,
        });
        track({ name: 'audit_completed', properties: { departmentId: dept.id, percentage: pct } });
        navigate(`/results/${sessionId}`);
      } else {
        const newId = await saveSession({
          companyId: company?.id ?? '',
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
        track({ name: 'audit_completed', properties: { departmentId: dept.id, percentage: pct } });
        navigate(`/results/${newId}`);
      }
    } catch (err) {
      captureException(err);
      toast.error('Failed to save audit. Your answers are still here — please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitAnyway = async () => {
    setShowSkipDialog(false);
    setReviewingSkipped(false);
    setSkippedIndices([]);
    await finishAudit();
  };

  const handleReviewSkipped = () => {
    setShowSkipDialog(false);
    setReviewingSkipped(true);
    if (skippedIndices.length > 0) {
      setCurrentIndex(skippedIndices[0]);
      setAnimKey((k) => k + 1);
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      isSaving
    ) return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        handlePrev();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleNext();
        break;
      case 'y': case 'Y':
        if (currentQuestion) { e.preventDefault(); handleAnswer('yes'); }
        break;
      case 'n': case 'N':
        if (currentQuestion) { e.preventDefault(); handleAnswer('no'); }
        break;
      case 'p': case 'P':
        if (currentQuestion?.answerType === 'yes_no_partial') {
          e.preventDefault();
          handleAnswer('partial');
        }
        break;
    }
  }, [handlePrev, handleNext, handleAnswer, currentQuestion, isSaving]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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

  if (totalQuestions === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <DeptIcon name={dept.icon} size={40} className="text-muted-foreground mx-auto mb-3" />
        <h1 className="text-xl font-semibold">{dept.name}</h1>
        <p className="text-muted-foreground mt-2">No questions configured for this department.</p>
        <p className="text-sm text-muted-foreground mt-1">An admin can add questions in Settings.</p>
        <Button variant="outline" onClick={() => navigate('/audit')} className="mt-6">
          Back to audits
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
            onClick={() => navigate('/audit')}
            aria-label="Go back"
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

      {/* Review mode banner */}
      {reviewingSkipped && skippedIndices.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 mb-4">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle size={16} className="shrink-0" />
            <span>Reviewing skipped questions ({skippedIndices.length} remaining)</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-amber-800 hover:text-amber-900 hover:bg-amber-100 h-7 text-xs"
            onClick={() => {
              setReviewingSkipped(false);
              setSkippedIndices([]);
            }}
          >
            Exit review
          </Button>
        </div>
      )}

      {/* Category badge */}
      <div className="mb-3">
        <Badge variant="secondary">{currentCategory}</Badge>
      </div>

      {/* Flashcard */}
      {currentQuestion && (
        <Card key={animKey} className="flashcard-enter rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-6 pb-4">
            <h2 className="text-2xl font-semibold leading-snug">
              {currentQuestion.text}
            </h2>
            {currentQuestion.criteria && (
              <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                {currentQuestion.criteria}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
              <span>Full: {currentQuestion.pointsYes} pts</span>
              {currentQuestion.answerType === 'yes_no_partial' && (
                <span>Partial: {currentQuestion.pointsPartial} pts</span>
              )}
              <span>No: {currentQuestion.pointsNo} pts</span>
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
                aria-label={`Answer Yes, ${currentQuestion.pointsYes} points`}
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
                  aria-label={`Answer Partial, ${currentQuestion.pointsPartial} points`}
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
                aria-label={`Answer No, ${currentQuestion.pointsNo} points`}
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
                <span className="text-xs text-muted-foreground">{currentQuestion.pointsNo} pts</span>
              </button>
            </div>
            <p className="text-center text-xs text-muted-foreground/60 mt-2 hidden sm:block">
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">Y</kbd> Yes
              {currentQuestion.answerType === 'yes_no_partial' && (
                <>{' '}<kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">P</kbd> Partial</>
              )}
              {' '}<kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">N</kbd> No
              {' '}<kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">&larr;</kbd>
              <kbd className="px-1 py-0.5 rounded border border-border bg-muted text-[10px] font-mono">&rarr;</kbd> Navigate
            </p>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrev}
          disabled={!reviewingSkipped && currentIndex === 0}
          className="gap-1.5"
        >
          <ArrowLeft size={14} />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {reviewingSkipped ? (
            <>
              {skippedIndices.length > 1 && (
                <Button variant="ghost" size="sm" onClick={handleNext} className="gap-1.5">
                  Next skipped
                  <SkipForward size={14} />
                </Button>
              )}
              <Button onClick={handleFinish} disabled={isSaving} className="gap-1.5">
                {isSaving ? 'Saving...' : 'Finish audit'}
                <ArrowRight size={14} />
              </Button>
            </>
          ) : (
            <>
              {!isLastQuestion && (
                <Button variant="ghost" size="sm" onClick={handleNext} className="gap-1.5">
                  Skip
                  <SkipForward size={14} />
                </Button>
              )}

              {totalQuestions > 0 && (isLastQuestion || answeredCount === totalQuestions) && (
                <Button onClick={handleFinish} disabled={isSaving} className="gap-1.5">
                  {isSaving ? 'Saving...' : 'Finish audit'}
                  <ArrowRight size={14} />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Question dots navigator */}
      <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
        {allQuestions.map((q, i) => {
          const ans = answers.get(q.id);
          let dotColor = 'bg-transparent border-2 border-muted-foreground/30';
          if (ans?.value === 'yes') dotColor = 'bg-emerald-400 border-2 border-transparent';
          else if (ans?.value === 'partial') dotColor = 'bg-amber-400 border-2 border-transparent';
          else if (ans?.value === 'no') dotColor = 'bg-red-400 border-2 border-transparent';

          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(i);
                setAnimKey((k) => k + 1);
              }}
              className="p-1.5"
              aria-label={`Go to question ${i + 1}`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all ${dotColor} ${
                  i === currentIndex ? 'ring-2 ring-primary ring-offset-1' : ''
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Unanswered questions dialog */}
      <Dialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Unanswered questions</DialogTitle>
            <DialogDescription>
              You have {skippedIndices.length} unanswered question{skippedIndices.length !== 1 ? 's' : ''}. Unanswered questions score 0 points.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleReviewSkipped}>
              Review skipped
            </Button>
            <Button onClick={handleSubmitAnyway}>
              Submit anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
