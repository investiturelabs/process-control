import { useState, useEffect, useRef } from 'react';
import type { SavedAnswer } from '@/types';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface SaveAnswerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionId: string;
  questionText: string;
  departmentId: string;
  currentValue: 'yes' | 'no' | 'partial';
  existingSavedAnswer?: SavedAnswer | null;
  onSave: (data: { questionId: string; departmentId: string; value: 'yes' | 'no' | 'partial'; expiresAt?: string; note?: string }) => Promise<void>;
  onRemove?: (savedAnswerId: string) => Promise<void>;
}

function formatDateForInput(iso?: string): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

function getPresetDate(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

export function SaveAnswerDialog({
  open,
  onOpenChange,
  questionId,
  questionText,
  departmentId,
  currentValue,
  existingSavedAnswer,
  onSave,
  onRemove,
}: SaveAnswerDialogProps) {
  const isEdit = !!existingSavedAnswer;

  const [expiresAt, setExpiresAt] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (existingSavedAnswer) {
      setExpiresAt(formatDateForInput(existingSavedAnswer.expiresAt));
      setNote(existingSavedAnswer.note ?? '');
    } else {
      setExpiresAt('');
      setNote('');
    }
  }, [open, existingSavedAnswer]);

  const handleSave = async () => {
    // Validate expiration date is not in the past
    if (expiresAt) {
      const expDate = new Date(expiresAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expDate < today) {
        toast.error('Expiration date cannot be in the past');
        return;
      }
    }

    setIsSaving(true);
    try {
      await onSave({
        questionId,
        departmentId,
        value: currentValue,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        note: note.trim() || undefined,
      });
      toast.success(isEdit ? 'Saved answer updated' : 'Answer saved for future audits');
      onOpenChange(false);
    } catch {
      toast.error('Failed to save answer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!existingSavedAnswer || !onRemove) return;
    setIsRemoving(true);
    try {
      await onRemove(existingSavedAnswer.id);
      toast.success('Saved answer removed');
      onOpenChange(false);
    } catch {
      toast.error('Failed to remove saved answer');
    } finally {
      setIsRemoving(false);
    }
  };

  const valueBadge = {
    yes: { label: 'Yes', className: 'bg-emerald-100 text-emerald-700' },
    no: { label: 'No', className: 'bg-red-100 text-red-700' },
    partial: { label: 'Partial', className: 'bg-amber-100 text-amber-700' },
  }[currentValue];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit saved answer' : 'Save answer for future audits'}
          </DialogTitle>
          <DialogDescription>
            This answer will auto-fill in future audits for this department.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Question</Label>
            <p className="text-sm">{questionText}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Answer</Label>
            <div>
              <Badge variant="secondary" className={valueBadge.className}>
                {valueBadge.label}
              </Badge>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-expires">Expiration date</Label>
            <div className="flex items-center gap-2">
              <Input
                id="sa-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2 mt-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setExpiresAt(getPresetDate(1))}
              >
                1 year
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setExpiresAt(getPresetDate(3))}
              >
                3 years
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-7"
                onClick={() => setExpiresAt('')}
              >
                No expiration
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-note">Note (optional)</Label>
            <textarea
              id="sa-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              placeholder="e.g., Certificate valid until 2028, renewed annually..."
              rows={3}
              maxLength={500}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
            />
            <p className="text-xs text-muted-foreground text-right">{note.length}/500</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isEdit && onRemove && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={isRemoving || isSaving}
              className="sm:mr-auto"
            >
              {isRemoving ? 'Removing...' : 'Remove saved answer'}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isRemoving}
          >
            {isSaving ? 'Saving...' : isEdit ? 'Update' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
