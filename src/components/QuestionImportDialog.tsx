import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '@/context';
import { parseQuestionsCsv, type ParsedQuestion } from '@/lib/import-questions';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { track } from '@/lib/analytics';

interface QuestionImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_QUESTIONS = 500;

type ImportState =
  | { step: 'idle' }
  | { step: 'parsed'; questions: ParsedQuestion[]; errors: string[]; warnings: string[] }
  | { step: 'importing'; imported: number; total: number }
  | { step: 'done' };

export function QuestionImportDialog({ open, onOpenChange }: QuestionImportDialogProps) {
  const { departments, addDepartment, addQuestion } = useAppStore();
  const [state, setState] = useState<ImportState>({ step: 'idle' });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const result = parseQuestionsCsv(text);
      if (result.questions.length > MAX_QUESTIONS) {
        result.warnings.push(`CSV contains ${result.questions.length} questions. Only the first ${MAX_QUESTIONS} will be imported.`);
        result.questions = result.questions.slice(0, MAX_QUESTIONS);
      }
      setState({ step: 'parsed', ...result });
    };
    reader.onerror = () => {
      toast.error('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const grouped = useMemo(() => {
    if (state.step !== 'parsed') return new Map<string, ParsedQuestion[]>();
    const map = new Map<string, ParsedQuestion[]>();
    for (const q of state.questions) {
      const key = q.departmentName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(q);
    }
    return map;
  }, [state]);

  const deptLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departments) {
      map.set(d.name.toLowerCase().trim(), d.id);
    }
    return map;
  }, [departments]);

  const handleImport = useCallback(async () => {
    if (state.step !== 'parsed') return;
    const { questions } = state;
    setState({ step: 'importing', imported: 0, total: questions.length });

    let imported = 0;
    let failures = 0;
    const createdDepts = new Map<string, string>();

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const deptKey = q.departmentName.toLowerCase().trim();

      try {
        let deptId = deptLookup.get(deptKey) || createdDepts.get(deptKey);
        if (!deptId) {
          deptId = await addDepartment(q.departmentName, 'Building2');
          createdDepts.set(deptKey, deptId);
        }

        await addQuestion({
          departmentId: deptId,
          riskCategory: q.riskCategory,
          text: q.text,
          criteria: q.criteria,
          answerType: q.answerType,
          pointsYes: q.pointsYes,
          pointsPartial: q.pointsPartial,
          pointsNo: q.pointsNo,
        });
        imported++;
      } catch {
        failures++;
      }
      setState({ step: 'importing', imported: i + 1, total: questions.length });
    }

    track({ name: 'questions_imported', properties: { count: imported } });

    if (failures > 0) {
      toast.error(`Imported ${imported} of ${questions.length} questions. ${failures} failed.`);
    } else {
      toast.success(`Imported ${imported} questions.`);
    }
    setState({ step: 'done' });
    setTimeout(() => onOpenChange(false), 1000);
  }, [state, deptLookup, addDepartment, addQuestion, onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setState({ step: 'idle' });
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import questions from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: Department, Risk Category, Question, Criteria, Answer Type, Points Yes, Points Partial, Points No.
          </DialogDescription>
        </DialogHeader>

        {state.step === 'idle' && (
          <div className="py-4">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="text-sm"
            />
          </div>
        )}

        {state.step === 'parsed' && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            <p className="text-sm font-medium">
              {state.questions.length} questions in {grouped.size} department{grouped.size !== 1 ? 's' : ''}
            </p>
            {state.errors.length > 0 && (
              <div className="text-sm text-red-600 space-y-0.5">
                {state.errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            {state.warnings.length > 0 && (
              <div className="text-sm text-amber-600 space-y-0.5">
                {state.warnings.map((w, i) => <p key={i}>{w}</p>)}
              </div>
            )}
            {Array.from(grouped.entries()).map(([dept, qs]) => (
              <div key={dept}>
                <p className="text-xs font-semibold text-muted-foreground">{dept} ({qs.length})</p>
                <ul className="text-xs text-muted-foreground ml-3 list-disc">
                  {qs.slice(0, 3).map((q, i) => <li key={i}>{q.text}</li>)}
                  {qs.length > 3 && <li>...and {qs.length - 3} more</li>}
                </ul>
              </div>
            ))}
          </div>
        )}

        {state.step === 'importing' && (
          <div className="py-4 space-y-2">
            <Progress value={(state.imported / state.total) * 100} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              Importing question {state.imported} of {state.total}...
            </p>
          </div>
        )}

        {state.step === 'done' && (
          <p className="py-4 text-sm text-center text-muted-foreground">Import complete.</p>
        )}

        {state.step === 'parsed' && (
          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={state.questions.length === 0 || state.errors.length > 0}
            >
              Import {state.questions.length} questions
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
