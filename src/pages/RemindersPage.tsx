import { useState, useMemo } from 'react';
import { useAppStore } from '@/context';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Reminder } from '@/types';
import { toast } from 'sonner';
import {
  Bell,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReminderFormDialog } from '@/components/ReminderFormDialog';
import { ReminderCompleteDialog } from '@/components/ReminderCompleteDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DeptIcon } from '@/components/DeptIcon';
import { track } from '@/lib/analytics';
import { captureException } from '@/lib/errorTracking';

function formatDueDate(nextDueAt: string): string {
  const due = new Date(nextDueAt);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === -1) return 'Yesterday';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDueStatus(nextDueAt: string): 'overdue' | 'today' | 'upcoming' {
  const due = new Date(nextDueAt);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (dueDay < today) return 'overdue';
  if (dueDay.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

export function RemindersPage() {
  const { reminders, departments, removeReminder, loading } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [completingReminder, setCompletingReminder] = useState<Reminder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);

  const deptMap = useMemo(() => {
    const map = new Map<string, { name: string; icon: string }>();
    for (const d of departments) map.set(d.id, { name: d.name, icon: d.icon });
    return map;
  }, [departments]);

  const questionMap = useMemo(() => {
    const map = new Map<string, { text: string; deptName: string }>();
    for (const d of departments) {
      for (const q of d.questions) {
        map.set(q.id, { text: q.text, deptName: d.name });
      }
    }
    return map;
  }, [departments]);

  const sortedReminders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let filtered = reminders;
    if (q) {
      filtered = reminders.filter((r) => {
        const deptInfo = r.departmentId ? deptMap.get(r.departmentId) : null;
        const qInfo = r.questionId ? questionMap.get(r.questionId) : null;
        return (
          r.title.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          deptInfo?.name.toLowerCase().includes(q) ||
          qInfo?.text.toLowerCase().includes(q)
        );
      });
    }
    return [...filtered].sort((a, b) => {
      const statusA = getDueStatus(a.nextDueAt);
      const statusB = getDueStatus(b.nextDueAt);
      const order = { overdue: 0, today: 1, upcoming: 2 };
      if (order[statusA] !== order[statusB]) return order[statusA] - order[statusB];
      return new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime();
    });
  }, [reminders, searchQuery, deptMap, questionMap]);

  const { overdueCount, todayCount } = useMemo(() => {
    let overdue = 0;
    let today = 0;
    for (const r of reminders) {
      const status = getDueStatus(r.nextDueAt);
      if (status === 'overdue') overdue++;
      else if (status === 'today') today++;
    }
    return { overdueCount: overdue, todayCount: today };
  }, [reminders]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeReminder(deleteTarget.id);
      track({ name: 'reminder_deleted', properties: { reminderId: deleteTarget.id } });
      toast.success('Reminder deleted');
      setDeleteTarget(null);
    } catch (err) {
      captureException(err);
      toast.error('Failed to delete reminder.');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell size={20} />
            Reminders
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track recurring tasks and maintenance schedules
          </p>
        </div>
        <Button onClick={() => { setEditingReminder(null); setFormOpen(true); }} className="gap-1.5">
          <Plus size={14} />
          New reminder
        </Button>
      </div>

      {/* Summary badges */}
      {(overdueCount > 0 || todayCount > 0) && (
        <div className="flex items-center gap-2">
          {overdueCount > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-700 gap-1">
              <AlertTriangle size={12} />
              {overdueCount} overdue
            </Badge>
          )}
          {todayCount > 0 && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-700 gap-1">
              <Clock size={12} />
              {todayCount} due today
            </Badge>
          )}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Active reminders</CardTitle>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search reminders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8 w-[200px]"
              aria-label="Search reminders"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {sortedReminders.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No reminders match your search.' : 'No active reminders yet.'}
              </p>
              {!searchQuery && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => { setEditingReminder(null); setFormOpen(true); }}
                  className="mt-2"
                >
                  Create your first reminder
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedReminders.map((reminder) => {
                const status = getDueStatus(reminder.nextDueAt);
                const deptInfo = reminder.departmentId ? deptMap.get(reminder.departmentId) : null;
                const qInfo = reminder.questionId ? questionMap.get(reminder.questionId) : null;
                const isExpanded = expandedHistory === reminder.id;

                return (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    status={status}
                    deptInfo={deptInfo}
                    qInfo={qInfo}
                    isExpanded={isExpanded}
                    onToggleHistory={() => setExpandedHistory(isExpanded ? null : reminder.id)}
                    onComplete={() => setCompletingReminder(reminder)}
                    onEdit={() => { setEditingReminder(reminder); setFormOpen(true); }}
                    onDelete={() => setDeleteTarget(reminder)}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form dialog */}
      <ReminderFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        reminder={editingReminder}
      />

      {/* Complete dialog */}
      {completingReminder && (
        <ReminderCompleteDialog
          open={!!completingReminder}
          onOpenChange={(open) => { if (!open) setCompletingReminder(null); }}
          reminder={completingReminder}
        />
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete reminder?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.title}</strong> and all its completion history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReminderRow({
  reminder,
  status,
  deptInfo,
  qInfo,
  isExpanded,
  onToggleHistory,
  onComplete,
  onEdit,
  onDelete,
}: {
  reminder: Reminder;
  status: 'overdue' | 'today' | 'upcoming';
  deptInfo: { name: string; icon: string } | null | undefined;
  qInfo: { text: string; deptName: string } | null | undefined;
  isExpanded: boolean;
  onToggleHistory: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const borderClass =
    status === 'overdue'
      ? 'border-l-4 border-l-red-400'
      : status === 'today'
        ? 'border-l-4 border-l-amber-400'
        : 'border-l-4 border-l-transparent';

  const completions = useQuery(
    api.reminders.getCompletions,
    isExpanded ? { reminderId: reminder.id } : 'skip'
  );

  return (
    <div className={`rounded-lg border p-4 ${borderClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">{reminder.title}</h3>
            <Badge
              variant="secondary"
              className={`text-xs ${
                status === 'overdue'
                  ? 'bg-red-100 text-red-700'
                  : status === 'today'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              Due Date: {formatDueDate(reminder.nextDueAt)}
            </Badge>
          </div>

          {reminder.description && (
            <p className="text-xs text-muted-foreground mt-1">{reminder.description}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            {deptInfo && (
              <span className="flex items-center gap-1">
                <DeptIcon name={deptInfo.icon} size={12} />
                {deptInfo.name}
              </span>
            )}
            {qInfo && (
              <span className="truncate max-w-[200px]" title={qInfo.text}>
                Q: {qInfo.text}
              </span>
            )}
            {reminder.lastCompletedAt && (
              <span>
                Last: {new Date(reminder.lastCompletedAt).toLocaleDateString()} by {reminder.lastCompletedByName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {status === 'upcoming' && reminder.lastCompletedAt ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 gap-1 text-xs">
              <CheckCircle2 size={12} />
              Completed
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs h-7"
              onClick={onComplete}
            >
              <CheckCircle2 size={12} />
              Sign Off
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </div>

      {/* Completion history toggle */}
      <button
        onClick={onToggleHistory}
        className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Completion history
      </button>

      {isExpanded && (
        <div className="mt-2 pl-4 border-l-2 border-border space-y-1.5">
          {completions === undefined ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : completions.length === 0 ? (
            <p className="text-xs text-muted-foreground">No completions yet.</p>
          ) : (
            completions.map((c) => (
              <div key={c._id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{c.completedByName}</span>
                {' — '}
                {new Date(c.completedAt).toLocaleString()}
                {c.note && <span className="ml-1 italic">"{c.note}"</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
