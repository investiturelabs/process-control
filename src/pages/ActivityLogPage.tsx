import { useMemo, useState } from 'react';
import { usePaginatedQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAppStore } from '@/context';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { History } from 'lucide-react';

const ENTITY_TYPES = [
  { value: 'all', label: 'All' },
  { value: 'question', label: 'Questions' },
  { value: 'department', label: 'Departments' },
  { value: 'user', label: 'Users' },
  { value: 'session', label: 'Sessions' },
  { value: 'company', label: 'Company' },
  { value: 'invitation', label: 'Invitations' },
  { value: 'savedAnswer', label: 'Saved Answers' },
] as const;

const ACTION_LABELS: Record<string, string> = {
  'question.add': 'added question',
  'question.update': 'updated question',
  'question.remove': 'removed question',
  'department.add': 'added department',
  'department.update': 'updated department',
  'department.remove': 'removed department',
  'department.duplicate': 'duplicated department',
  'department.resetToDefaults': 'reset departments to defaults',
  'user.created': 'account created',
  'user.roleChange': 'changed role for',
  'user.activate': 'activated',
  'user.deactivate': 'deactivated',
  'session.complete': 'completed audit for',
  'session.remove': 'removed audit session',
  'company.update': 'updated company',
  'invitation.create': 'invited',
  'invitation.remove': 'revoked invitation for',
  'invitation.expiredCleanup': 'expired invitations cleaned up',
  'savedAnswer.create': 'saved answer for',
  'savedAnswer.update': 'updated saved answer for',
  'savedAnswer.remove': 'removed saved answer for',
};

function formatAction(action: string, actorName?: string, entityLabel?: string): string {
  const label = ACTION_LABELS[action] ?? action;
  const actor = actorName ?? 'System';
  if (entityLabel) {
    return `${actor} ${label} "${entityLabel}"`;
  }
  return `${actor} ${label}`;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ActivityLogPage() {
  const { currentUser } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';
  const [entityType, setEntityType] = useState<string>('all');

  const paginatedArgs = useMemo(
    () => (entityType !== 'all' ? { entityType } : {}),
    [entityType],
  );

  const { results, status, loadMore } = usePaginatedQuery(
    api.changeLog.list,
    isAdmin ? paginatedArgs : 'skip',
    { initialNumItems: 25 },
  );

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Activity Log</h1>
        <p className="text-sm text-muted-foreground">
          Only admins can view the activity log.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <History size={20} className="text-muted-foreground" />
            Activity Log
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Administrative changes and audit completions
          </p>
        </div>
        <Select value={entityType} onValueChange={setEntityType}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {status === 'LoadingFirstPage' ? (
        <LoadingSpinner />
      ) : results.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">No activity logged yet.</p>
        </div>
      ) : (
        <>
          <Card className="divide-y divide-border">
            {results.map((entry) => (
              <div key={entry._id} className="px-4 py-3">
                <p className="text-sm">
                  {formatAction(entry.action, entry.actorName, entry.entityLabel)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTimestamp(entry.timestamp)}
                </p>
              </div>
            ))}
          </Card>

          {status === 'CanLoadMore' && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm" onClick={() => loadMore(25)}>
                Load more
              </Button>
            </div>
          )}
          {status === 'LoadingMore' && (
            <div className="flex justify-center pt-4">
              <LoadingSpinner />
            </div>
          )}
          {status === 'Exhausted' && results.length > 25 && (
            <p className="text-center text-xs text-muted-foreground pt-4">
              All entries loaded
            </p>
          )}
        </>
      )}
    </div>
  );
}
