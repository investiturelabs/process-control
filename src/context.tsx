import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import type { Store } from '@/store';
import type { User, Company, Department, AuditSession, Invitation, Role, Question } from './types';
import { seedDepartments } from './seed-data';
import type { Id } from '../convex/_generated/dataModel';

const CURRENT_USER_KEY = 'pcr_currentUser';

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  // --- Local state for current user (persisted to localStorage) ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(CURRENT_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // --- Convex queries ---
  const usersData = useQuery(api.users.list);
  const companyData = useQuery(api.companies.get);
  const departmentsData = useQuery(api.departments.listWithQuestions);
  const sessionsData = useQuery(api.sessions.list);
  const invitationsData = useQuery(api.invitations.list);

  // --- Convex mutations ---
  const loginMutation = useMutation(api.users.login);
  const updateRoleMutation = useMutation(api.users.updateRole);
  const setCompanyMutation = useMutation(api.companies.set);
  const resetToDefaultsMutation = useMutation(api.departments.resetToDefaults);
  const addQuestionMutation = useMutation(api.questions.add);
  const updateQuestionMutation = useMutation(api.questions.update);
  const removeQuestionMutation = useMutation(api.questions.remove);
  const saveSessionMutation = useMutation(api.sessions.save);
  const createInvitationMutation = useMutation(api.invitations.create);
  const removeInvitationMutation = useMutation(api.invitations.remove);
  const seedAllMutation = useMutation(api.seed.seedAll);

  // --- Loading state ---
  const loading =
    usersData === undefined ||
    departmentsData === undefined ||
    sessionsData === undefined ||
    invitationsData === undefined;

  // --- Map Convex documents to app types ---
  const users: User[] = (usersData ?? []).map((u) => ({
    id: u._id as string,
    name: u.name,
    email: u.email,
    role: u.role,
    avatarColor: u.avatarColor,
  }));

  const company: Company | null =
    companyData === undefined
      ? null
      : companyData
        ? { id: companyData._id as string, name: companyData.name, logoUrl: companyData.logoUrl }
        : null;

  const departments: Department[] = (departmentsData ?? []) as Department[];

  const sessions: AuditSession[] = (sessionsData ?? []).map((s) => ({
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

  const invitations: Invitation[] = (invitationsData ?? []).map((inv) => ({
    id: inv._id as string,
    email: inv.email,
    role: inv.role,
    status: inv.status,
    createdAt: inv.createdAt,
  }));

  // --- Sync currentUser with Convex data (role changes, etc.) ---
  useEffect(() => {
    if (!currentUser || !usersData) return;
    const fresh = usersData.find((u) => u._id === currentUser.id || u.email === currentUser.email);
    if (fresh) {
      const mapped: User = {
        id: fresh._id as string,
        name: fresh.name,
        email: fresh.email,
        role: fresh.role,
        avatarColor: fresh.avatarColor,
      };
      if (
        mapped.role !== currentUser.role ||
        mapped.name !== currentUser.name ||
        mapped.id !== currentUser.id
      ) {
        setCurrentUser(mapped);
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(mapped));
      }
    }
  }, [usersData, currentUser]);

  // --- Auto-seed: if departments query returns empty, seed from seed-data ---
  const seeded = useRef(false);
  useEffect(() => {
    if (departmentsData !== undefined && departmentsData.length === 0 && !seeded.current) {
      seeded.current = true;
      seedAllMutation({ departments: seedDepartments });
    }
  }, [departmentsData, seedAllMutation]);

  // --- Actions ---
  const login = useCallback(
    async (name: string, email: string) => {
      const doc = await loginMutation({ name, email });
      const user: User = {
        id: doc._id as string,
        name: doc.name,
        email: doc.email,
        role: doc.role,
        avatarColor: doc.avatarColor,
      };
      setCurrentUser(user);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    },
    [loginMutation],
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
  }, []);

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
    async (session: Omit<AuditSession, 'id'>): Promise<string> => {
      const id = await saveSessionMutation({
        companyId: session.companyId,
        departmentId: session.departmentId,
        auditorId: session.auditorId,
        auditorName: session.auditorName,
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
      await addQuestionMutation(question);
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

  const store: Store = {
    currentUser,
    users,
    company,
    departments,
    sessions,
    invitations,
    loading,
    login,
    logout,
    setCompany,
    updateDepartments,
    saveSession,
    inviteUser,
    updateUserRole,
    removeInvitation,
    addQuestion,
    updateQuestion,
    removeQuestion,
  };

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useAppStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useAppStore must be inside StoreProvider');
  return ctx;
}
