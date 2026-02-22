import { useState, useMemo } from 'react';
import { useAppStore } from '@/context';
import { RotateCcw, Plus, Pencil, Trash2, Copy, Upload, Download, Search, X, Pin, Bell, ClipboardList } from 'lucide-react';
import { seedDepartments } from '@/seed-data';
import type { Question, Department, SavedAnswer } from '@/types';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { QuestionFormDialog } from '@/components/QuestionFormDialog';
import { QuestionImportDialog } from '@/components/QuestionImportDialog';
import { SaveAnswerDialog } from '@/components/SaveAnswerDialog';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DeptIcon, DEPT_ICON_NAMES } from '@/components/DeptIcon';
import { exportQuestionsCsv } from '@/lib/export';
import { track } from '@/lib/analytics';
import { captureException } from '@/lib/errorTracking';
import { ReminderFormDialog } from '@/components/ReminderFormDialog';

export function QuestionsPage() {
  const { departments, updateDepartments, addQuestion, updateQuestion, removeQuestion, addDepartment, updateDepartment, removeDepartment, duplicateDepartment, savedAnswers, saveSavedAnswer, removeSavedAnswer, loading, orgRole } =
    useAppStore();
  const isAdmin = orgRole === 'admin';

  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSeedDialog, setShowSeedDialog] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Question form dialog state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string>('');
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    deptId: string;
    questionId: string;
    text: string;
  } | null>(null);

  // Department form dialog state
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [deptName, setDeptName] = useState('');
  const [deptIcon, setDeptIcon] = useState('Building2');
  const [deptSaving, setDeptSaving] = useState(false);

  // Department delete confirmation state
  const [deleteDeptTarget, setDeleteDeptTarget] = useState<{ id: string; name: string; questionCount: number } | null>(null);

  // Duplicate state
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Question search state
  const [searchQuery, setSearchQuery] = useState('');

  // Saved answers state
  const [savedAnswerSearch, setSavedAnswerSearch] = useState('');
  const [editingSA, setEditingSA] = useState<(SavedAnswer & { questionText: string }) | null>(null);
  const [deletingSA, setDeletingSA] = useState<(SavedAnswer & { questionText: string }) | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reminder dialog state
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderQuestionId, setReminderQuestionId] = useState<string>('');
  const [reminderDeptId, setReminderDeptId] = useState<string>('');

  const openAddDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptIcon('Building2');
    setDeptDialogOpen(true);
  };

  const openEditDept = (dept: { id: string; name: string; icon: string }) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptIcon(dept.icon);
    setDeptDialogOpen(true);
  };

  const handleSaveDept = async () => {
    const trimmed = deptName.trim();
    if (!trimmed) return;
    setDeptSaving(true);
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, trimmed, deptIcon);
      } else {
        await addDepartment(trimmed, deptIcon);
        track({ name: 'department_added', properties: { name: trimmed } });
      }
      setDeptDialogOpen(false);
    } catch (err) {
      captureException(err);
      toast.error('Failed to save department.');
    } finally {
      setDeptSaving(false);
    }
  };

  const handleDeleteDept = async () => {
    if (!deleteDeptTarget) return;
    try {
      await removeDepartment(deleteDeptTarget.id);
      track({ name: 'department_deleted', properties: { name: deleteDeptTarget.name } });
      setDeleteDeptTarget(null);
    } catch (err) {
      captureException(err);
      toast.error('Failed to delete department.');
    }
  };

  const handleResetData = async () => {
    try {
      await updateDepartments(seedDepartments);
      setShowResetDialog(false);
    } catch (err) {
      captureException(err);
      toast.error('Failed to reset departments.');
    }
  };

  const handleLoadSampleData = async () => {
    setSeeding(true);
    try {
      await updateDepartments(seedDepartments);
      setShowSeedDialog(false);
      toast.success('Sample data loaded.');
    } catch (err) {
      captureException(err);
      toast.error('Failed to load sample data.');
    } finally {
      setSeeding(false);
    }
  };

  // Get existing risk categories for a department
  const getCategoriesForDept = (deptId: string): string[] => {
    const dept = departments.find((d) => d.id === deptId);
    if (!dept) return [];
    const cats = new Set(dept.questions.map((q) => q.riskCategory));
    return Array.from(cats);
  };

  // Open Add Question dialog
  const openAddQuestion = (deptId: string) => {
    setEditingDeptId(deptId);
    setEditingQuestion(null);
    setQuestionDialogOpen(true);
  };

  // Open Edit Question dialog
  const openEditQuestion = (deptId: string, question: Question) => {
    setEditingDeptId(deptId);
    setEditingQuestion(question);
    setQuestionDialogOpen(true);
  };

  // Fix #64: Wrap mutations in try/catch
  const handleSaveQuestion = async (question: Question) => {
    const dept = departments.find((d) => d.id === editingDeptId);
    if (!dept) return;

    try {
      const existingIdx = dept.questions.findIndex((q) => q.id === question.id);
      if (existingIdx >= 0) {
        await updateQuestion(question);
      } else {
        const { id: _, ...rest } = question;
        await addQuestion(rest);
        track({ name: 'question_added', properties: { departmentId: editingDeptId } });
      }
    } catch (err) {
      captureException(err);
      toast.error('Failed to save question.');
    }
  };

  // Delete question with error handling
  const handleDeleteQuestion = async () => {
    if (!deleteTarget) return;
    try {
      await removeQuestion(deleteTarget.questionId);
      track({ name: 'question_deleted', properties: { departmentId: deleteTarget.deptId } });
      setDeleteTarget(null);
    } catch (err) {
      captureException(err);
      toast.error('Failed to remove question.');
    }
  };

  // Memoize categories for the active department
  const existingCategories = useMemo(
    () => getCategoriesForDept(editingDeptId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingDeptId, departments]
  );

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return departments;

    return departments
      .map((dept) => {
        const deptNameMatches = dept.name.toLowerCase().includes(q);
        if (deptNameMatches) return dept;

        const matchingQuestions = dept.questions.filter(
          (question) =>
            question.text.toLowerCase().includes(q) ||
            question.riskCategory.toLowerCase().includes(q) ||
            question.criteria.toLowerCase().includes(q)
        );

        if (matchingQuestions.length === 0) return null;
        return { ...dept, questions: matchingQuestions };
      })
      .filter((d): d is Department => d !== null);
  }, [departments, searchQuery]);

  const totalMatchCount = useMemo(() => {
    if (!searchQuery.trim()) return null;
    return filteredDepartments.reduce((acc, d) => acc + d.questions.length, 0);
  }, [filteredDepartments, searchQuery]);

  // Saved answers memos
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

  const filteredSavedDepts = useMemo(() => {
    const term = savedAnswerSearch.toLowerCase().trim();
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
  }, [deptSavedAnswers, deptMap, savedAnswerSearch]);

  const handleDeleteSA = async () => {
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

  const valueBadgeClass = (value: string) => {
    if (value === 'yes') return 'bg-emerald-100 text-emerald-700';
    if (value === 'partial') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) <= new Date();
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Audit Questions</h1>
        <p className="text-sm text-muted-foreground">
          Only admins can manage audit questions.
        </p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Audit Questions</h1>

      {/* Questions management */}
      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 gap-2 flex-wrap">
          <CardTitle className="text-sm shrink-0">Audit questions</CardTitle>
          <div className="flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={() => { exportQuestionsCsv(departments); track({ name: 'csv_exported', properties: { type: 'questions' } }); }}>
              <Download size={12} />
              Export CSV
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={() => setImportDialogOpen(true)}>
              <Upload size={12} />
              Import CSV
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground" onClick={openAddDept}>
              <Plus size={12} />
              Add department
            </Button>
          {departments.length > 0 && (
          <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground">
                <RotateCcw size={12} />
                Reset to defaults
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset departments?</DialogTitle>
                <DialogDescription>
                  This will reset all departments, questions, and point values to their defaults. Your audit history will not be deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleResetData}>
                  Reset
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
          </div>
        </CardHeader>
        <div className="px-6 pb-0 pt-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8"
              aria-label="Search questions"
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
          {totalMatchCount !== null && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {totalMatchCount} question{totalMatchCount !== 1 ? 's' : ''} in{' '}
              {filteredDepartments.length} department{filteredDepartments.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <CardContent>
          {departments.length === 0 && !searchQuery.trim() ? (
            <div className="text-center py-12">
              <ClipboardList size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <h3 className="text-sm font-semibold mb-1">No departments yet</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-xs mx-auto">
                Create your first department to start building your audit checklist, or load sample data to explore the app.
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Button size="sm" onClick={openAddDept}>
                  <Plus size={14} className="mr-1.5" />
                  Add department
                </Button>
                <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)}>
                  <Upload size={14} className="mr-1.5" />
                  Import CSV
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSeedDialog(true)}>
                  <Download size={14} className="mr-1.5" />
                  Load sample data
                </Button>
              </div>
            </div>
          ) : (
          <div className="space-y-4">
            {filteredDepartments.map((dept) => (
              <details key={dept.id} className="group" open={!!searchQuery.trim() || undefined}>
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground py-1 flex items-center gap-2">
                  <DeptIcon name={dept.icon} size={14} className="shrink-0" />
                  <span className="flex-1">{dept.name}{' '}
                    <span className="text-xs text-muted-foreground">
                      ({dept.questions.length} questions)
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => { e.preventDefault(); openEditDept(dept); }}
                  >
                    <Pencil size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={duplicatingId === dept.id}
                    onClick={async (e) => {
                      e.preventDefault();
                      setDuplicatingId(dept.id);
                      try {
                        await duplicateDepartment(dept.id);
                        track({ name: 'department_duplicated', properties: { sourceId: dept.id } });
                        toast.success(`Duplicated "${dept.name}"`);
                      } catch (err) {
                        captureException(err);
                        toast.error('Failed to duplicate department.');
                      } finally {
                        setDuplicatingId(null);
                      }
                    }}
                  >
                    <Copy size={12} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity hover:!text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      setDeleteDeptTarget({ id: dept.id, name: dept.name, questionCount: dept.questions.length });
                    }}
                  >
                    <Trash2 size={12} />
                  </Button>
                </summary>
                <div className="mt-2 space-y-0.5 pl-2">
                  {dept.questions.map((q) => (
                    <div
                      key={q.id}
                      className="group/row flex items-center gap-2 py-2 text-xs border-b border-border/50 hover:bg-accent/50 rounded px-1.5 -mx-1.5"
                    >
                      <button
                        onClick={() => openEditQuestion(dept.id, q)}
                        className="flex-1 min-w-0 text-left flex items-center gap-2"
                      >
                        <span className="text-foreground truncate flex-1">
                          {q.text}
                        </span>
                        <Pencil
                          size={12}
                          className="text-muted-foreground/0 group-hover/row:text-muted-foreground shrink-0 transition-colors"
                        />
                      </button>
                      <Badge variant="secondary" className="text-[10px] shrink-0 font-normal">
                        {q.pointsYes} pts
                        {q.answerType === 'yes_no_partial' &&
                          ` / ${q.pointsPartial}`}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground/0 group-hover/row:text-muted-foreground hover:!text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReminderQuestionId(q.id);
                          setReminderDeptId(dept.id);
                          setReminderDialogOpen(true);
                        }}
                        title="Create reminder"
                      >
                        <Bell size={12} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground/0 group-hover/row:text-muted-foreground hover:!text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({
                            deptId: dept.id,
                            questionId: q.id,
                            text: q.text,
                          });
                        }}
                      >
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))}

                  {/* Add question button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 gap-1.5 text-xs text-muted-foreground w-full justify-start"
                    onClick={() => openAddQuestion(dept.id)}
                  >
                    <Plus size={12} />
                    Add question
                  </Button>
                </div>
              </details>
            ))}
            {filteredDepartments.length === 0 && searchQuery.trim() && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No questions match "{searchQuery.trim()}"</p>
                <Button variant="link" size="sm" onClick={() => setSearchQuery('')} className="mt-1">
                  Clear search
                </Button>
              </div>
            )}
          </div>
          )}
        </CardContent>
      </Card>

      {/* Load sample data confirmation dialog */}
      <Dialog open={showSeedDialog} onOpenChange={setShowSeedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load sample data?</DialogTitle>
            <DialogDescription>
              This will create 9 departments with 171 audit questions based on grocery/retail PCR audit templates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSeedDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLoadSampleData} disabled={seeding}>
              {seeding ? 'Loading...' : 'Load sample data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saved answers section */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <Pin size={14} className="text-muted-foreground" />
            Saved answers
          </CardTitle>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search saved answers..."
              value={savedAnswerSearch}
              onChange={(e) => setSavedAnswerSearch(e.target.value)}
              className="pl-8 w-[200px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredSavedDepts.length === 0 ? (
            <div className="text-center py-8">
              <Pin size={24} className="mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-muted-foreground text-sm">
                {savedAnswerSearch
                  ? 'No saved answers match your search.'
                  : 'No saved answers yet. Pin answers during audits to auto-fill them in the future.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSavedDepts.map(({ deptId, items }) => {
                const deptInfo = deptMap.get(deptId);
                return (
                  <div key={deptId} className="space-y-2">
                    <div className="flex items-center gap-2">
                      {deptInfo && <DeptIcon name={deptInfo.icon} size={14} className="text-muted-foreground" />}
                      <h3 className="text-sm font-semibold">{deptInfo?.name ?? deptId}</h3>
                      <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                    </div>
                    <div className="divide-y divide-border rounded-lg border">
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved answer edit dialog */}
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

      {/* Saved answer delete confirmation dialog */}
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
            <Button variant="destructive" onClick={handleDeleteSA} disabled={isDeleting}>
              {isDeleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question import dialog */}
      <QuestionImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />

      {/* Question form dialog (add/edit) */}
      <QuestionFormDialog
        open={questionDialogOpen}
        onOpenChange={setQuestionDialogOpen}
        departmentId={editingDeptId}
        existingCategories={existingCategories}
        question={editingQuestion}
        onSave={handleSaveQuestion}
      />

      {/* Delete question confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete question?</DialogTitle>
            <DialogDescription>
              This will permanently remove the question. Any past audit scores referencing it will be unaffected.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="text-sm text-muted-foreground border-l-2 border-border pl-3 my-2">
              {deleteTarget.text}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuestion}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Department form dialog (add/edit) */}
      <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? 'Edit department' : 'Add department'}</DialogTitle>
            <DialogDescription>
              {editingDept ? 'Update the department name and icon.' : 'Create a new department for audits.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="deptName">Department name</Label>
              <Input
                id="deptName"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="e.g. Bakery"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label>Icon</Label>
              <div className="grid grid-cols-5 gap-2">
                {DEPT_ICON_NAMES.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setDeptIcon(iconName)}
                    className={`flex items-center justify-center h-10 rounded-lg border-2 transition-all ${
                      deptIcon === iconName
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <DeptIcon name={iconName} size={20} className={deptIcon === iconName ? 'text-primary' : 'text-muted-foreground'} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDept} disabled={!deptName.trim() || deptSaving}>
              {deptSaving ? 'Saving...' : editingDept ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete department confirmation dialog */}
      <Dialog
        open={!!deleteDeptTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteDeptTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete department?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteDeptTarget?.name}</strong> and all {deleteDeptTarget?.questionCount ?? 0} of its questions. Past audit history will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDeptTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDept}>
              Delete department
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reminder form dialog (from question row) */}
      <ReminderFormDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        defaultQuestionId={reminderQuestionId}
        defaultDepartmentId={reminderDeptId}
      />
    </div>
  );
}
