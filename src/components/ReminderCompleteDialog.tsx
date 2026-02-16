import { useState } from 'react';
import { useAppStore } from '@/context';
import type { Reminder } from '@/types';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/errorTracking';
import { track } from '@/lib/analytics';

interface ReminderCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder: Reminder;
}

export function ReminderCompleteDialog({
  open,
  onOpenChange,
  reminder,
}: ReminderCompleteDialogProps) {
  const { completeReminder } = useAppStore();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    try {
      await completeReminder(reminder.id, note.trim() || undefined);
      track({ name: 'reminder_completed', properties: { reminderId: reminder.id } });
      toast.success(`"${reminder.title}" marked complete`);
      setNote('');
      onOpenChange(false);
    } catch (err) {
      captureException(err);
      toast.error('Failed to complete reminder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign off on task</DialogTitle>
          <DialogDescription>
            Mark <strong>{reminder.title}</strong> as completed. This will advance the next due date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="completion-note">Note (optional)</Label>
            <Input
              id="completion-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Cleaned all drains in section A"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={saving}>
            {saving ? 'Signing off...' : 'Sign Off'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
