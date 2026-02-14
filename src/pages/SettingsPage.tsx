import { useState, useMemo } from 'react';
import { useAppStore } from '@/context';
import { Building2, Save, RotateCcw, Plus, Pencil, Trash2, Database, Copy, Upload, Download, HardDrive, Search, X } from 'lucide-react';
import { seedDepartments } from '@/seed-data';
import type { Question, Department } from '@/types';
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
import { DeptIcon, DEPT_ICON_NAMES } from '@/components/DeptIcon';
import { exportQuestionsCsv } from '@/lib/export';
import { createBackup, downloadBackup } from '@/lib/backup';
import { track } from '@/lib/analytics';

export function SettingsPage() {
  const { company, setCompany, currentUser, departments, updateDepartments, addQuestion, updateQuestion, removeQuestion, addDepartment, updateDepartment, removeDepartment, generateTestData, duplicateDepartment, users, sessions, invitations } =
    useAppStore();
  const isAdmin = currentUser?.role === 'admin';

  const [companyName, setCompanyName] = useState(company?.name || '');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [generatingData, setGeneratingData] = useState(false);
  const [dataGenerated, setDataGenerated] = useState(false);

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
    } catch {
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
    } catch {
      toast.error('Failed to delete department.');
    }
  };

  // Fix #41: Company name validation + Fix #34: URL validation
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = companyName.trim();
    if (!trimmedName) {
      setCompanyError('Company name is required.');
      return;
    }
    const trimmedUrl = logoUrl.trim();
    if (trimmedUrl && !trimmedUrl.startsWith('https://')) {
      setCompanyError('Logo URL must start with https://');
      return;
    }
    setCompanyError(null);
    setIsSaving(true);
    try {
      await setCompany({ id: '', name: trimmedName, logoUrl: trimmedUrl || undefined });
    } catch {
      toast.error('Failed to save company settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetData = async () => {
    try {
      await updateDepartments(seedDepartments);
      setShowResetDialog(false);
    } catch {
      toast.error('Failed to reset departments.');
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
    } catch {
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
    } catch {
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

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Only admins can modify settings.
        </p>
        {company && (
          <Card className="mt-6">
            <CardContent className="p-4">
              <p className="text-sm">
                <strong>Company:</strong> {company.name}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>

      {/* Company info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Building2 size={16} className="text-muted-foreground" />
            Company
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveCompany}>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="companyName">Company name</Label>
                <Input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Sprouts Farmers Market"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logoUrl">Logo URL (optional)</Label>
                <Input
                  id="logoUrl"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
            {companyError && (
              <p className="text-sm text-red-600 mt-2" role="alert">{companyError}</p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <Button type="submit" size="sm" className="gap-1.5" disabled={isSaving}>
                <Save size={14} />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Questions management */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">Audit questions</CardTitle>
          <div className="flex items-center gap-1">
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
                      } catch {
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
        </CardContent>
      </Card>

      {/* Test data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Database size={16} className="text-muted-foreground" />
            Test Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Generate 6 months of sample audit data across all departments to preview charts and analytics.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={generatingData || dataGenerated}
            onClick={async () => {
              setGeneratingData(true);
              try {
                await generateTestData();
                setDataGenerated(true);
              } catch {
                toast.error('Failed to generate test data.');
              } finally {
                setGeneratingData(false);
              }
            }}
          >
            <Database size={14} />
            {generatingData ? 'Generating...' : dataGenerated ? 'Data generated' : 'Generate test data'}
          </Button>
        </CardContent>
      </Card>

      {/* Data backup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <HardDrive size={16} className="text-muted-foreground" />
            Data Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Export all company data as JSON. Contains departments, questions, audit history, users, and invitations.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              try {
                downloadBackup(createBackup({ company, users, departments, sessions, invitations }));
                track({ name: 'backup_exported', properties: {} });
                toast.success('Backup exported.');
              } catch {
                toast.error('Failed to export backup.');
              }
            }}
          >
            <Download size={14} />
            Export backup
          </Button>
        </CardContent>
      </Card>

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
    </div>
  );
}
