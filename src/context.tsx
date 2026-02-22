import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Store } from '@/store-types';
import type { User, Company, Department, AuditSession, Invitation, Role, Question, SavedAnswer, Reminder, ReminderFrequency } from './types';
import type { Id } from '../convex/_generated/dataModel';
import { track, identify } from '@/lib/analytics';
import { setErrorTrackingUser } from '@/lib/errorTracking';

export const StoreContext = createContext<Store | null>(null);

function mapConvexUser(doc: { _id: string; name: string; email: string; role?: string; avatarColor: string; active?: boolean }): User {
  return { id: doc._id, name: doc.name, email: doc.email, role: (doc.role ?? 'user') as Role, avatarColor: doc.avatarColor, active: doc.active };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // --- Clerk JWT → Convex user sync ---
  const syncMutation = useMutation(api.users.getOrCreateFromClerk);
  const syncAttemptsRef = useRef(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgRole, setOrgRole] = useState<Role | null>(null);

  // --- Convex user from server (me query) ---
  const meData = useQuery(api.users.me);

  // Org memberships — always query once we have a user
  const orgsData = useQuery(api.organizations.listForUser, currentUser ? {} : 'skip');

  // Sync Clerk user with Convex on mount (when meData first resolves)
  const hasSynced = useRef(false);
  useEffect(() => {
    if (hasSynced.current) return;
    if (meData === undefined) return; // still loading

    if (meData !== null) {
      // User already exists in Convex
      hasSynced.current = true;
      const user = mapConvexUser(meData);
      setCurrentUser(user);
      identify(user.id, { name: user.name, role: user.role });
      setErrorTrackingUser({ id: user.id, email: user.email, name: user.name });
      return;
    }

    // meData is null — user not yet in Convex, create via mutation
    if (syncAttemptsRef.current >= 3) {
      setSyncError('Failed to sync your account. Please refresh and try again.');
      return;
    }

    syncAttemptsRef.current++;
    syncMutation()
      .then((doc) => {
        hasSynced.current = true;
        const user = mapConvexUser(doc);
        setCurrentUser(user);
        // Set orgId from signup result
        if (doc.orgId) {
          setOrgId(doc.orgId as string);
        }
        track({ name: 'user_login', properties: { isNewUser: true } });
        identify(user.id, { name: user.name, role: user.role });
        setErrorTrackingUser({ id: user.id, email: user.email, name: user.name });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('deactivated')) {
          setSyncError('Account deactivated. Contact your administrator.');
        } else if (syncAttemptsRef.current >= 3) {
          setSyncError('Failed to sync your account. Please refresh and try again.');
        }
      });
  }, [meData, syncMutation]);

  // --- Resolve orgId from memberships ---
  useEffect(() => {
    if (orgId || !orgsData || orgsData.length === 0) return;

    // Check localStorage for last-used org
    const lastOrgId = localStorage.getItem('lastOrgId');
    const matchingOrg = lastOrgId ? orgsData.find((o) => o?._id === lastOrgId) : null;

    if (matchingOrg) {
      setOrgId(matchingOrg._id as string);
      setOrgRole(matchingOrg.role as Role);
    } else if (orgsData[0]) {
      // Default to first org
      setOrgId(orgsData[0]._id as string);
      setOrgRole(orgsData[0].role as Role);
    }
  }, [orgsData, orgId]);

  // Keep orgRole synced when orgsData changes
  useEffect(() => {
    if (!orgId || !orgsData) return;
    const currentOrg = orgsData.find((o) => o?._id === orgId);
    if (currentOrg && currentOrg.role !== orgRole) {
      setOrgRole(currentOrg.role as Role);
    }
  }, [orgsData, orgId, orgRole]);

  // Persist orgId to localStorage
  useEffect(() => {
    if (orgId) {
      localStorage.setItem('lastOrgId', orgId);
    }
  }, [orgId]);

  // --- Typed orgId for queries ---
  const typedOrgId = orgId as Id<"organizations"> | null;

  // --- Convex queries (org-scoped) ---
  const usersData = useQuery(api.users.list, typedOrgId ? { orgId: typedOrgId } : 'skip');
  const orgData = useQuery(api.organizations.get, typedOrgId ? { orgId: typedOrgId } : 'skip');
  const departmentsData = useQuery(api.departments.listWithQuestions, typedOrgId ? { orgId: typedOrgId } : 'skip');
  const sessionsData = useQuery(api.sessions.list, typedOrgId ? { orgId: typedOrgId } : 'skip');
  const invitationsData = useQuery(api.invitations.list, (typedOrgId && orgRole === 'admin') ? { orgId: typedOrgId } : 'skip');
  const savedAnswersData = useQuery(api.savedAnswers.list, typedOrgId ? { orgId: typedOrgId } : 'skip');
  const remindersData = useQuery(api.reminders.list, typedOrgId ? { orgId: typedOrgId } : 'skip');

  // --- Convex mutations ---
  const updateRoleMutation = useMutation(api.users.updateRole);
  const updateOrgMutation = useMutation(api.organizations.update);
  const resetToDefaultsMutation = useMutation(api.departments.resetToDefaults);
  const addQuestionMutation = useMutation(api.questions.add);
  const updateQuestionMutation = useMutation(api.questions.update);
  const removeQuestionMutation = useMutation(api.questions.remove);
  const saveSessionMutation = useMutation(api.sessions.save);
  const updateSessionMutation = useMutation(api.sessions.update);
  const removeSessionMutation = useMutation(api.sessions.remove);
  const addDepartmentMutation = useMutation(api.departments.add);
  const updateDepartmentMutation = useMutation(api.departments.update);
  const removeDepartmentMutation = useMutation(api.departments.remove);
  const createInvitationMutation = useMutation(api.invitations.create);
  const removeInvitationMutation = useMutation(api.invitations.remove);
  const generateTestDataMutation = useMutation(api.testData.generate);
  const setActiveMutation = useMutation(api.users.setActive);
  const duplicateDepartmentMutation = useMutation(api.departments.duplicate);
  const saveSavedAnswerMutation = useMutation(api.savedAnswers.save);
  const updateSavedAnswerMutation = useMutation(api.savedAnswers.update);
  const removeSavedAnswerMutation = useMutation(api.savedAnswers.remove);
  const createReminderMutation = useMutation(api.reminders.create);
  const updateReminderMutation = useMutation(api.reminders.update);
  const removeReminderMutation = useMutation(api.reminders.remove);
  const completeReminderMutation = useMutation(api.reminders.complete);

  // --- Loading state ---
  const loading =
    usersData === undefined ||
    orgData === undefined ||
    departmentsData === undefined ||
    sessionsData === undefined ||
    (orgRole === 'admin' && invitationsData === undefined) ||
    savedAnswersData === undefined ||
    remindersData === undefined ||
    currentUser === null ||
    orgId === null;

  // --- Map Convex documents to app types ---
  const users = useMemo<User[]>(() => {
    return (usersData ?? []).map((u) => u ? mapConvexUser(u as any) : null).filter(Boolean) as User[];
  }, [usersData]);

  const company = useMemo<Company | null>(() => {
    if (!orgData) return null;
    return { id: orgData._id as string, name: orgData.name, logoUrl: orgData.logoUrl };
  }, [orgData]);

  const departments = useMemo<Department[]>(() => {
    return (departmentsData ?? []) as Department[];
  }, [departmentsData]);

  const sessions = useMemo<AuditSession[]>(() => {
    return (sessionsData ?? []).map((s) => ({
      id: s._id as string,
      companyId: s.companyId,
      departmentId: s.departmentId,
      auditorId: s.auditorId,
      auditorName: s.auditorName,
      date: s.date,
      answers: s.answers,
      totalPoints: s.totalPoints,
      maxPoints: s.maxPoints,
      percentage: s.percentage,
      completed: s.completed,
    }));
  }, [sessionsData]);

  const invitations = useMemo<Invitation[]>(() => {
    return (invitationsData ?? []).map((inv) => ({
      id: inv._id as string,
      email: inv.email,
      role: inv.role as Role,
      status: inv.status as 'pending' | 'accepted',
      createdAt: inv.createdAt,
      expiresAt: inv.expiresAt,
    }));
  }, [invitationsData]);

  const savedAnswers = useMemo<SavedAnswer[]>(() => {
    return (savedAnswersData ?? []).map((sa) => ({
      id: sa._id as string,
      questionId: sa.questionId,
      departmentId: sa.departmentId,
      value: sa.value,
      expiresAt: sa.expiresAt,
      note: sa.note,
      savedBy: sa.savedBy,
      savedByName: sa.savedByName,
      createdAt: sa.createdAt,
      updatedAt: sa.updatedAt,
    }));
  }, [savedAnswersData]);

  const reminders = useMemo<Reminder[]>(() => {
    return (remindersData ?? []).map((r) => ({
      id: r._id as string,
      questionId: r.questionId,
      departmentId: r.departmentId,
      title: r.title,
      description: r.description,
      frequency: r.frequency as ReminderFrequency,
      customDays: r.customDays,
      lastCompletedAt: r.lastCompletedAt,
      lastCompletedBy: r.lastCompletedBy,
      lastCompletedByName: r.lastCompletedByName,
      nextDueAt: r.nextDueAt,
      createdBy: r.createdBy,
      createdByName: r.createdByName,
      createdAt: r.createdAt,
      active: r.active,
    }));
  }, [remindersData]);

  // --- Sync currentUser with Convex data (role changes, deactivation, etc.) ---
  useEffect(() => {
    if (!currentUser || !usersData) return;
    const fresh = (usersData as any[]).find((u) => u?._id === currentUser.id);
    if (!fresh) return;
    if (fresh.active === false) {
      setSyncError('Account deactivated. Contact your administrator.');
      return;
    }
    const mapped = mapConvexUser(fresh);
    if (
      mapped.role !== currentUser.role ||
      mapped.name !== currentUser.name ||
      mapped.email !== currentUser.email ||
      mapped.avatarColor !== currentUser.avatarColor
    ) {
      setCurrentUser(mapped);
    }
  }, [usersData, currentUser]);

  // --- Actions (all pass orgId under the hood) ---
  const setCompany = useCallback(
    async (_c: Company) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await updateOrgMutation({ orgId: typedOrgId, name: _c.name, logoUrl: _c.logoUrl });
    },
    [updateOrgMutation, typedOrgId],
  );

  const updateDepartments = useCallback(
    async (deps: Department[]) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await resetToDefaultsMutation({ orgId: typedOrgId, departments: deps });
    },
    [resetToDefaultsMutation, typedOrgId],
  );

  const saveSession = useCallback(
    async (session: Omit<AuditSession, 'id' | 'auditorId' | 'auditorName'>): Promise<string> => {
      if (!typedOrgId) throw new Error("No organization selected");
      const id = await saveSessionMutation({
        orgId: typedOrgId,
        companyId: session.companyId,
        departmentId: session.departmentId,
        date: session.date,
        answers: session.answers,
        totalPoints: session.totalPoints,
        maxPoints: session.maxPoints,
        percentage: session.percentage,
        completed: session.completed,
      });
      return id as string;
    },
    [saveSessionMutation, typedOrgId],
  );

  const inviteUser = useCallback(
    async (email: string, role: Role) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await createInvitationMutation({ orgId: typedOrgId, email, role });
    },
    [createInvitationMutation, typedOrgId],
  );

  const updateUserRole = useCallback(
    async (userId: string, role: Role) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await updateRoleMutation({ orgId: typedOrgId, userId: userId as Id<'users'>, role });
    },
    [updateRoleMutation, typedOrgId],
  );

  const removeInvitation = useCallback(
    async (invId: string) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await removeInvitationMutation({ orgId: typedOrgId, invitationId: invId as Id<'invitations'> });
    },
    [removeInvitationMutation, typedOrgId],
  );

  const addQuestion = useCallback(
    async (question: Omit<Question, 'id'>) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await addQuestionMutation({ orgId: typedOrgId, ...question });
    },
    [addQuestionMutation, typedOrgId],
  );

  const updateQuestion = useCallback(
    async (question: Question) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await updateQuestionMutation({
        orgId: typedOrgId,
        questionId: question.id as Id<'questions'>,
        riskCategory: question.riskCategory,
        text: question.text,
        criteria: question.criteria,
        answerType: question.answerType,
        pointsYes: question.pointsYes,
        pointsPartial: question.pointsPartial,
        pointsNo: question.pointsNo,
      });
    },
    [updateQuestionMutation, typedOrgId],
  );

  const removeQuestion = useCallback(
    async (questionId: string) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await removeQuestionMutation({ orgId: typedOrgId, questionId: questionId as Id<'questions'> });
    },
    [removeQuestionMutation, typedOrgId],
  );

  const addDepartment = useCallback(
    async (name: string, icon: string): Promise<string> => {
      if (!typedOrgId) throw new Error("No organization selected");
      return await addDepartmentMutation({ orgId: typedOrgId, name, icon });
    },
    [addDepartmentMutation, typedOrgId],
  );

  const updateDepartment = useCallback(
    async (stableId: string, name: string, icon: string) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await updateDepartmentMutation({ orgId: typedOrgId, stableId, name, icon });
    },
    [updateDepartmentMutation, typedOrgId],
  );

  const removeDepartment = useCallback(
    async (stableId: string) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await removeDepartmentMutation({ orgId: typedOrgId, stableId });
    },
    [removeDepartmentMutation, typedOrgId],
  );

  const updateSession = useCallback(
    async (sessionId: string, data: Partial<Omit<AuditSession, 'id' | 'auditorId' | 'auditorName'>>) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await updateSessionMutation({
        orgId: typedOrgId,
        sessionId: sessionId as Id<'auditSessions'>,
        ...data,
      });
    },
    [updateSessionMutation, typedOrgId],
  );

  const removeSession = useCallback(
    async (sessionId: string) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await removeSessionMutation({ orgId: typedOrgId, sessionId: sessionId as Id<'auditSessions'> });
    },
    [removeSessionMutation, typedOrgId],
  );

  const generateTestData = useCallback(async () => {
    if (!typedOrgId) throw new Error("No organization selected");
    await generateTestDataMutation({ orgId: typedOrgId });
  }, [generateTestDataMutation, typedOrgId]);

  const setUserActive = useCallback(
    async (userId: string, active: boolean) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await setActiveMutation({ orgId: typedOrgId, userId: userId as Id<'users'>, active });
    },
    [setActiveMutation, typedOrgId],
  );

  const duplicateDepartment = useCallback(
    async (stableId: string): Promise<string> => {
      if (!typedOrgId) throw new Error("No organization selected");
      return await duplicateDepartmentMutation({ orgId: typedOrgId, stableId });
    },
    [duplicateDepartmentMutation, typedOrgId],
  );

  const saveSavedAnswer = useCallback(
    async (data: { questionId: string; departmentId: string; value: 'yes' | 'no' | 'partial'; expiresAt?: string; note?: string }) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await saveSavedAnswerMutation({ orgId: typedOrgId, ...data });
    },
    [saveSavedAnswerMutation, typedOrgId],
  );

  const updateSavedAnswer = useCallback(
    async (savedAnswerId: string, data: { value?: 'yes' | 'no' | 'partial'; expiresAt?: string; note?: string }) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await updateSavedAnswerMutation({ orgId: typedOrgId, savedAnswerId: savedAnswerId as Id<'savedAnswers'>, ...data });
    },
    [updateSavedAnswerMutation, typedOrgId],
  );

  const removeSavedAnswer = useCallback(
    async (savedAnswerId: string) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await removeSavedAnswerMutation({ orgId: typedOrgId, savedAnswerId: savedAnswerId as Id<'savedAnswers'> });
    },
    [removeSavedAnswerMutation, typedOrgId],
  );

  const createReminder = useCallback(
    async (data: { title: string; description?: string; frequency: ReminderFrequency; customDays?: number; questionId?: string; departmentId?: string; startDate: string }): Promise<string> => {
      if (!typedOrgId) throw new Error("No organization selected");
      const id = await createReminderMutation({ orgId: typedOrgId, ...data });
      return id as string;
    },
    [createReminderMutation, typedOrgId],
  );

  const updateReminder = useCallback(
    async (reminderId: string, data: { title?: string; description?: string; frequency?: ReminderFrequency; customDays?: number; questionId?: string; departmentId?: string; active?: boolean }) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await updateReminderMutation({ orgId: typedOrgId, reminderId: reminderId as Id<'reminders'>, ...data });
    },
    [updateReminderMutation, typedOrgId],
  );

  const removeReminder = useCallback(
    async (reminderId: string) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await removeReminderMutation({ orgId: typedOrgId, reminderId: reminderId as Id<'reminders'> });
    },
    [removeReminderMutation, typedOrgId],
  );

  const completeReminder = useCallback(
    async (reminderId: string, note?: string) => {
      if (!typedOrgId) throw new Error("No organization selected");
      await completeReminderMutation({ orgId: typedOrgId, reminderId: reminderId as Id<'reminders'>, note });
    },
    [completeReminderMutation, typedOrgId],
  );

  const store = useMemo<Store>(() => ({
    currentUser,
    users,
    company,
    departments,
    sessions,
    invitations,
    savedAnswers,
    loading,
    orgId,
    orgRole,
    setCompany,
    updateDepartments,
    saveSession,
    inviteUser,
    updateUserRole,
    removeInvitation,
    addQuestion,
    updateQuestion,
    removeQuestion,
    addDepartment,
    updateDepartment,
    removeDepartment,
    updateSession,
    removeSession,
    generateTestData,
    setUserActive,
    duplicateDepartment,
    saveSavedAnswer,
    updateSavedAnswer,
    removeSavedAnswer,
    reminders,
    createReminder,
    updateReminder,
    removeReminder,
    completeReminder,
  }), [
    currentUser, users, company, departments, sessions, invitations, savedAnswers, loading,
    orgId, orgRole,
    setCompany, updateDepartments, saveSession,
    inviteUser, updateUserRole, removeInvitation,
    addQuestion, updateQuestion, removeQuestion,
    addDepartment, updateDepartment, removeDepartment,
    updateSession, removeSession, generateTestData,
    setUserActive, duplicateDepartment,
    saveSavedAnswer, updateSavedAnswer, removeSavedAnswer,
    reminders, createReminder, updateReminder, removeReminder, completeReminder,
  ]);

  // Show sync error UI
  if (syncError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-red-600 mb-2">Account Error</h1>
          <p className="text-muted-foreground text-sm mb-4">{syncError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-primary text-primary-foreground text-sm"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useAppStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useAppStore must be inside StoreProvider');
  return ctx;
}
