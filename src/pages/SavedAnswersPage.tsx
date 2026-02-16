import { useState, useMemo } from 'react';
import { useAppStore } from '@/context';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { SaveAnswerDialog } from '@/components/SaveAnswerDialog';
import type { SavedAnswer, Question } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pin, Trash2, Pencil, Search } from 'lucide-react';
import { DeptIcon } from '@/components/DeptIcon';
import { toast } from 'sonner';

export function SavedAnswersPage() {
  const { currentUser, departments, savedAnswers, saveSavedAnswer, updateSavedAnswer, removeSavedAnswer, loading } = useAppStore();
  const isAdmin = currentUser?.role === 'admin';

  const [search, setSearch] = useState('');
  const [editingSA, setEditingSA] = useState<(SavedAnswer & { questionText: string }) | null>(null);
  const [deletingSA, setDeletingSA] = useState<(SavedAnswer & { questionText: string }) | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deptSavedAnswers = useMemo(() => {
    const questionMap = new Map<string, Question>();
    for (const dept of departments) {
      for (const q of dept.questions) questionMap.set(q.id, q);
    }
    const grouped = new Map<string, Array<SavedAnswer & { questionText: string }>>();
    for (const sa of savedAnswers) {
      const q = questionMap.get(sa.questionId);
      if (!q) continue;
      const list = grouped.get(sa.departmentId) || [];
      list.push({ ...sa, questionText: q.text });
      grouped.set(sa.departmentId, list);
    }
    return grouped;
  }, [departments, savedAnswers]);

  const deptMap = useMemo(() => {
    const map = new Map<string, { name: string; icon: string }>();
    for (const d of departments) map.set(d.id, { name: d.name, icon: d.icon });
    return map;
  }, [departments]);

  const filteredDepts = useMemo(() => {
    const term = search.toLowerCase().trim();
    const result: Array<{ deptId: string; items: Array<SavedAnswer & { questionText: string }> }> = [];
    for (const [deptId, items] of deptSavedAnswers) {
      const deptInfo = deptMap.get(deptId);
      const filtered = term
        ? items.filter(
            (sa) =>
              sa.questionText.toLowerCase().includes(term) ||
              sa.note?.toLowerCase().includes(term) ||
              deptInfo?.name.toLowerCase().includes(term)
          )
        : items;
      if (filtered.length > 0) {
        result.push({ deptId, items: filtered });
      }
    }
    return result;
  }, [deptSavedAnswers, deptMap, search]);

  const handleDelete = async () => {
    if (!deletingSA) return;
    setIsDeleting(true);
    try {
      await removeSavedAnswer(deletingSA.id);
      toast.success('Saved answer removed');
      setDeletingSA(null);
    } catch {
      toast.error('Failed to remove saved answer');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Saved Answers</h1>
        <p className="text-sm text-muted-foreground">
          Only admins can manage saved answers.
        </p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  const valueBadgeClass = (value: string) => {
    if (value === 'yes') return 'bg-emerald-100 text-emerald-700';
    if (value === 'partial') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Pin size={20} className="text-muted-foreground" />
            Saved Answers
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Answers that auto-fill in future audits
          </p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-[200px]"
          />
        </div>
      </div>

      {filteredDepts.length === 0 ? (
        <div className="text-center py-16">
          <Pin size={32} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground text-sm">
            {search
              ? 'No saved answers match your search.'
              : 'No saved answers yet. Pin answers during audits to auto-fill them in the future.'}
          </p>
        </div>
      ) : (
        filteredDepts.map(({ deptId, items }) => {
          const deptInfo = deptMap.get(deptId);
          return (
            <div key={deptId} className="space-y-2">
              <div className="flex items-center gap-2">
                {deptInfo && <DeptIcon name={deptInfo.icon} size={16} className="text-muted-foreground" />}
                <h2 className="text-sm font-semibold">{deptInfo?.name ?? deptId}</h2>
                <Badge variant="secondary" className="text-xs">{items.length}</Badge>
              </div>
              <Card className="divide-y divide-border">
                {items.map((sa) => (
                  <div key={sa.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{sa.questionText}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className={`text-xs ${valueBadgeClass(sa.value)}`}>
                          {sa.value.charAt(0).toUpperCase() + sa.value.slice(1)}
                        </Badge>
                        {sa.expiresAt ? (
                          isExpired(sa.expiresAt) ? (
                            <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">
                              Expired {new Date(sa.expiresAt).toLocaleDateString()}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Expires {new Date(sa.expiresAt).toLocaleDateString()}
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">No expiration</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          by {sa.savedByName}
                        </span>
                      </div>
                      {sa.note && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{sa.note}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingSA(sa)}
                        aria-label="Edit saved answer"
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingSA(sa)}
                        aria-label="Delete saved answer"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          );
        })
      )}

      {/* Edit dialog */}
      {editingSA && (
        <SaveAnswerDialog
          open={!!editingSA}
          onOpenChange={(open) => { if (!open) setEditingSA(null); }}
          questionId={editingSA.questionId}
          questionText={editingSA.questionText}
          departmentId={editingSA.departmentId}
          currentValue={editingSA.value}
          existingSavedAnswer={editingSA}
          onSave={saveSavedAnswer}
          onRemove={removeSavedAnswer}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={!!deletingSA} onOpenChange={(open) => { if (!open) setDeletingSA(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove saved answer?</DialogTitle>
            <DialogDescription>
              This will stop auto-filling this answer in future audits. Existing audit sessions are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingSA(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
