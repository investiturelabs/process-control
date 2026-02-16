import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/context';
import type { Reminder, ReminderFrequency } from '@/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { captureException } from '@/lib/errorTracking';
import { track } from '@/lib/analytics';

const FREQUENCY_OPTIONS: { value: ReminderFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annually', label: 'Annually' },
  { value: 'custom', label: 'Custom (days)' },
];

interface ReminderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder?: Reminder | null;
  defaultQuestionId?: string;
  defaultDepartmentId?: string;
}

export function ReminderFormDialog({
  open,
  onOpenChange,
  reminder,
  defaultQuestionId,
  defaultDepartmentId,
}: ReminderFormDialogProps) {
  const { departments, createReminder, updateReminder } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<ReminderFrequency>('weekly');
  const [customDays, setCustomDays] = useState('');
  const [questionId, setQuestionId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [saving, setSaving] = useState(false);

  // Build flat question list filtered by selected department
  const filteredQuestions = useMemo(() => {
    if (!departmentId) return [];
    const dept = departments.find((d) => d.id === departmentId);
    if (!dept) return [];
    return dept.questions.map((q) => ({
      id: q.id,
      text: q.text,
    }));
  }, [departments, departmentId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return;
    if (reminder) {
      setTitle(reminder.title);
      setDescription(reminder.description ?? '');
      setFrequency(reminder.frequency);
      setCustomDays(reminder.customDays?.toString() ?? '');
      setQuestionId(reminder.questionId ?? '');
      setDepartmentId(reminder.departmentId ?? '');
      setStartDate('');
    } else {
      setTitle('');
      setDescription('');
      setFrequency('weekly');
      setCustomDays('');
      setQuestionId(defaultQuestionId ?? '');
      setDepartmentId(defaultDepartmentId ?? '');
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [open, reminder, defaultQuestionId, defaultDepartmentId]);

  // Clear questionId when department changes (question may no longer be valid)
  useEffect(() => {
    if (!departmentId) {
      setQuestionId('');
      return;
    }
    // If current questionId doesn't belong to new department, clear it
    const dept = departments.find((d) => d.id === departmentId);
    if (dept && !dept.questions.some((q) => q.id === questionId)) {
      setQuestionId('');
    }
  }, [departmentId, departments]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    if (!departmentId) {
      toast.error('Please select a department.');
      return;
    }
    if (!questionId) {
      toast.error('Please select a question.');
      return;
    }
    if (frequency === 'custom' && (!customDays || Number(customDays) < 1)) {
      toast.error('Please enter a valid number of days for custom frequency.');
      return;
    }

    setSaving(true);
    try {
      if (reminder) {
        await updateReminder(reminder.id, {
          title: trimmedTitle,
          description: description.trim() || undefined,
          frequency,
          customDays: frequency === 'custom' ? Number(customDays) : undefined,
          questionId,
          departmentId,
        });
        toast.success('Reminder updated');
      } else {
        await createReminder({
          title: trimmedTitle,
          description: description.trim() || undefined,
          frequency,
          customDays: frequency === 'custom' ? Number(customDays) : undefined,
          questionId,
          departmentId,
          startDate: startDate || new Date().toISOString(),
        });
        track({ name: 'reminder_created', properties: { frequency } });
        toast.success('Reminder created');
      }
      onOpenChange(false);
    } catch (err) {
      captureException(err);
      toast.error('Failed to save reminder.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{reminder ? 'Edit reminder' : 'Create reminder'}</DialogTitle>
          <DialogDescription>
            {reminder
              ? 'Update the reminder details.'
              : 'Set up a recurring task reminder linked to a department and question.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="reminder-title">Title</Label>
            <Input
              id="reminder-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clean floor drains"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="reminder-desc">Description (optional)</Label>
            <Input
              id="reminder-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Additional details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ReminderFrequency)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {frequency === 'custom' && (
              <div className="space-y-1">
                <Label htmlFor="reminder-custom-days">Every N days</Label>
                <Input
                  id="reminder-custom-days"
                  type="number"
                  min={1}
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  placeholder="e.g. 10"
                />
              </div>
            )}

            {!reminder && (
              <div className="space-y-1">
                <Label htmlFor="reminder-start">Start date</Label>
                <Input
                  id="reminder-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label>Department</Label>
            <Select value={departmentId || '__none__'} onValueChange={(v) => setDepartmentId(v === '__none__' ? '' : v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {departmentId && (
            <div className="space-y-1">
              <Label>Question</Label>
              <Select value={questionId || '__none__'} onValueChange={(v) => setQuestionId(v === '__none__' ? '' : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select question" />
                </SelectTrigger>
                <SelectContent>
                  {filteredQuestions.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      <span className="truncate">{q.text}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !departmentId || !questionId || saving}>
            {saving ? 'Saving...' : reminder ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
