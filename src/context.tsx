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
import type { User, Company, Department, AuditSession, Invitation, Role, Question } from './types';
import { seedDepartments } from './seed-data';
import type { Id } from '../convex/_generated/dataModel';
import { track, identify } from '@/lib/analytics';
import { setErrorTrackingUser } from '@/lib/errorTracking';

export const StoreContext = createContext<Store | null>(null);

function mapConvexUser(doc: { _id: string; name: string; email: string; role: string; avatarColor: string; active?: boolean }): User {
  return { id: doc._id, name: doc.name, email: doc.email, role: doc.role as Role, avatarColor: doc.avatarColor, active: doc.active };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // --- Clerk JWT → Convex user sync ---
  const syncMutation = useMutation(api.users.getOrCreateFromClerk);
  const syncAttemptsRef = useRef(0);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // --- Convex user from server (me query) ---
  const meData = useQuery(api.users.me);

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

  // --- Convex queries ---
  const isAdmin = currentUser?.role === 'admin';
  const usersData = useQuery(api.users.list);
  const companyData = useQuery(api.companies.get);
  const departmentsData = useQuery(api.departments.listWithQuestions);
  const sessionsData = useQuery(api.sessions.list);
  const invitationsData = useQuery(api.invitations.list, isAdmin ? {} : 'skip');

  // --- Convex mutations (no actorId/actorName — server derives from JWT) ---
  const updateRoleMutation = useMutation(api.users.updateRole);
  const setCompanyMutation = useMutation(api.companies.set);
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
  const seedAllMutation = useMutation(api.seed.seedAll);
  const generateTestDataMutation = useMutation(api.testData.generate);
  const setActiveMutation = useMutation(api.users.setActive);
  const duplicateDepartmentMutation = useMutation(api.departments.duplicate);

  // --- Loading state ---
  const loading =
    usersData === undefined ||
    companyData === undefined ||
    departmentsData === undefined ||
    sessionsData === undefined ||
    (isAdmin && invitationsData === undefined) ||
    currentUser === null;

  // --- Map Convex documents to app types ---
  const users = useMemo<User[]>(() => {
    return (usersData ?? []).map(mapConvexUser);
  }, [usersData]);

  const company = useMemo<Company | null>(() => {
    if (companyData === undefined || companyData === null) return null;
    return { id: companyData._id as string, name: companyData.name, logoUrl: companyData.logoUrl };
  }, [companyData]);

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

  // --- Sync currentUser with Convex data (role changes, deactivation, etc.) ---
  useEffect(() => {
    if (!currentUser || !usersData) return;
    const fresh = usersData.find((u) => u._id === currentUser.id);
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

  // --- Auto-seed: if departments query returns empty, seed from seed-data ---
  const seeded = useRef(false);
  useEffect(() => {
    if (departmentsData !== undefined && departmentsData.length === 0 && !seeded.current) {
      seeded.current = true;
      seedAllMutation({ departments: seedDepartments }).catch(() => {
        seeded.current = false;
      });
    }
  }, [departmentsData, seedAllMutation]);

  // --- Actions (no actorId/actorName — server derives from JWT) ---
  const setCompany = useCallback(
    async (_c: Company) => {
      await setCompanyMutation({ name: _c.name, logoUrl: _c.logoUrl });
    },
    [setCompanyMutation],
  );

  const updateDepartments = useCallback(
    async (deps: Department[]) => {
      await resetToDefaultsMutation({ departments: deps });
    },
    [resetToDefaultsMutation],
  );

  const saveSession = useCallback(
    async (session: Omit<AuditSession, 'id' | 'auditorId' | 'auditorName'>): Promise<string> => {
      const id = await saveSessionMutation({
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
    [saveSessionMutation],
  );

  const inviteUser = useCallback(
    async (email: string, role: Role) => {
      await createInvitationMutation({ email, role });
    },
    [createInvitationMutation],
  );

  const updateUserRole = useCallback(
    async (userId: string, role: Role) => {
      await updateRoleMutation({ userId: userId as Id<'users'>, role });
    },
    [updateRoleMutation],
  );

  const removeInvitation = useCallback(
    async (invId: string) => {
      await removeInvitationMutation({ invitationId: invId as Id<'invitations'> });
    },
    [removeInvitationMutation],
  );

  const addQuestion = useCallback(
    async (question: Omit<Question, 'id'>) => {
      await addQuestionMutation({ ...question });
    },
    [addQuestionMutation],
  );

  const updateQuestion = useCallback(
    async (question: Question) => {
      await updateQuestionMutation({
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
    [updateQuestionMutation],
  );

  const removeQuestion = useCallback(
    async (questionId: string) => {
      await removeQuestionMutation({ questionId: questionId as Id<'questions'> });
    },
    [removeQuestionMutation],
  );

  const addDepartment = useCallback(
    async (name: string, icon: string): Promise<string> => {
      return await addDepartmentMutation({ name, icon });
    },
    [addDepartmentMutation],
  );

  const updateDepartment = useCallback(
    async (stableId: string, name: string, icon: string) => {
      await updateDepartmentMutation({ stableId, name, icon });
    },
    [updateDepartmentMutation],
  );

  const removeDepartment = useCallback(
    async (stableId: string) => {
      await removeDepartmentMutation({ stableId });
    },
    [removeDepartmentMutation],
  );

  const updateSession = useCallback(
    async (sessionId: string, data: Partial<Omit<AuditSession, 'id' | 'auditorId' | 'auditorName'>>) => {
      await updateSessionMutation({
        sessionId: sessionId as Id<'auditSessions'>,
        ...data,
      });
    },
    [updateSessionMutation],
  );

  const removeSession = useCallback(
    async (sessionId: string) => {
      await removeSessionMutation({ sessionId: sessionId as Id<'auditSessions'> });
    },
    [removeSessionMutation],
  );

  const generateTestData = useCallback(async () => {
    await generateTestDataMutation();
  }, [generateTestDataMutation]);

  const setUserActive = useCallback(
    async (userId: string, active: boolean) => {
      await setActiveMutation({ userId: userId as Id<'users'>, active });
    },
    [setActiveMutation],
  );

  const duplicateDepartment = useCallback(
    async (stableId: string): Promise<string> => {
      return await duplicateDepartmentMutation({ stableId });
    },
    [duplicateDepartmentMutation],
  );

  const store = useMemo<Store>(() => ({
    currentUser,
    users,
    company,
    departments,
    sessions,
    invitations,
    loading,
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
  }), [
    currentUser, users, company, departments, sessions, invitations, loading,
    setCompany, updateDepartments, saveSession,
    inviteUser, updateUserRole, removeInvitation,
    addQuestion, updateQuestion, removeQuestion,
    addDepartment, updateDepartment, removeDepartment,
    updateSession, removeSession, generateTestData,
    setUserActive, duplicateDepartment,
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
