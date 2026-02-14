import { useState, useEffect, useRef } from 'react';
import type { Question, AnswerType } from '@/types';
import { v4 as uuid } from 'uuid';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuestionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departmentId: string;
  existingCategories: string[];
  question?: Question | null; // null = add mode, Question = edit mode
  onSave: (question: Question) => void;
}

export function QuestionFormDialog({
  open,
  onOpenChange,
  departmentId,
  existingCategories,
  question,
  onSave,
}: QuestionFormDialogProps) {
  const isEdit = !!question;

  const [text, setText] = useState('');
  const [criteria, setCriteria] = useState('');
  const [riskCategory, setRiskCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [answerType, setAnswerType] = useState<AnswerType>('yes_no');
  const [pointsYes, setPointsYes] = useState(5);
  const [pointsPartial, setPointsPartial] = useState(3);

  // Fix #15: Use ref to track initialization instead of existingCategories in deps
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (question) {
      setText(question.text);
      setCriteria(question.criteria);
      setRiskCategory(question.riskCategory);
      setCustomCategory('');
      setAnswerType(question.answerType);
      setPointsYes(question.pointsYes);
      setPointsPartial(question.pointsPartial);
    } else {
      setText('');
      setCriteria('');
      setRiskCategory(existingCategories[0] || '');
      setCustomCategory('');
      setAnswerType('yes_no');
      setPointsYes(5);
      setPointsPartial(3);
    }
  }, [open, question, existingCategories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const finalCategory =
      riskCategory === '__custom__'
        ? customCategory.trim()
        : riskCategory;

    if (!finalCategory) return;

    const saved: Question = {
      id: question?.id || uuid(),
      departmentId,
      riskCategory: finalCategory,
      text: text.trim(),
      criteria: criteria.trim(),
      answerType,
      pointsYes,
      pointsPartial: answerType === 'yes_no_partial' ? pointsPartial : 0,
      pointsNo: 0,
    };

    onSave(saved);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit question' : 'Add question'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the question details below.'
              : 'Fill in the details for your new audit question.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-text">Question *</Label>
            <textarea
              id="q-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Are safety protocols being followed?"
              required
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-criteria">Criteria</Label>
            <textarea
              id="q-criteria"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="Describe what to look for when evaluating..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="risk-category">Risk category *</Label>
              <Select value={riskCategory} onValueChange={setRiskCategory}>
                <SelectTrigger id="risk-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="__custom__">+ New category</SelectItem>
                </SelectContent>
              </Select>
              {riskCategory === '__custom__' && (
                <Input
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Category name"
                  className="mt-1.5"
                  required
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="answer-type">Answer type</Label>
              <Select
                value={answerType}
                onValueChange={(v) => {
                  // Fix #50: Validate answerType before setting
                  if (v === 'yes_no' || v === 'yes_no_partial') setAnswerType(v);
                }}
              >
                <SelectTrigger id="answer-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes_no">Yes / No</SelectItem>
                  <SelectItem value="yes_no_partial">
                    Yes / No / Partial
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="q-pts-yes">Points (Yes)</Label>
              <Input
                id="q-pts-yes"
                type="number"
                min={0}
                value={pointsYes}
                onChange={(e) => {
                  // Fix #14: Validate points input
                  const parsed = parseInt(e.target.value, 10);
                  setPointsYes(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
                }}
              />
            </div>
            {answerType === 'yes_no_partial' && (
              <div className="space-y-1.5">
                <Label htmlFor="q-pts-partial">Points (Partial)</Label>
                <Input
                  id="q-pts-partial"
                  type="number"
                  min={0}
                  value={pointsPartial}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setPointsPartial(Number.isFinite(parsed) && parsed >= 0 ? parsed : 0);
                  }}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {isEdit ? 'Save changes' : 'Add question'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
