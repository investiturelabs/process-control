import type { User, Company, Department, AuditSession, Invitation, Role, Question, SavedAnswer, Reminder, ReminderFrequency } from './types';

export interface Store {
  currentUser: User | null;
  users: User[];
  company: Company | null;
  departments: Department[];
  sessions: AuditSession[];
  invitations: Invitation[];
  savedAnswers: SavedAnswer[];
  loading: boolean;
  setCompany: (c: Company) => Promise<void>;
  updateDepartments: (deps: Department[]) => Promise<void>;
  saveSession: (session: Omit<AuditSession, 'id' | 'auditorId' | 'auditorName'>) => Promise<string>;
  inviteUser: (email: string, role: Role) => Promise<void>;
  updateUserRole: (userId: string, role: Role) => Promise<void>;
  removeInvitation: (invId: string) => Promise<void>;
  addQuestion: (question: Omit<Question, 'id'>) => Promise<void>;
  updateQuestion: (question: Question) => Promise<void>;
  removeQuestion: (questionId: string) => Promise<void>;
  addDepartment: (name: string, icon: string) => Promise<string>;
  updateDepartment: (stableId: string, name: string, icon: string) => Promise<void>;
  removeDepartment: (stableId: string) => Promise<void>;
  updateSession: (sessionId: string, data: Partial<Omit<AuditSession, 'id' | 'auditorId' | 'auditorName'>>) => Promise<void>;
  removeSession: (sessionId: string) => Promise<void>;
  generateTestData: () => Promise<void>;
  setUserActive: (userId: string, active: boolean) => Promise<void>;
  duplicateDepartment: (stableId: string) => Promise<string>;
  saveSavedAnswer: (data: { questionId: string; departmentId: string; value: 'yes' | 'no' | 'partial'; expiresAt?: string; note?: string }) => Promise<void>;
  updateSavedAnswer: (savedAnswerId: string, data: { value?: 'yes' | 'no' | 'partial'; expiresAt?: string; note?: string }) => Promise<void>;
  removeSavedAnswer: (savedAnswerId: string) => Promise<void>;
  reminders: Reminder[];
  createReminder: (data: { title: string; description?: string; frequency: ReminderFrequency; customDays?: number; questionId?: string; departmentId?: string; startDate: string }) => Promise<string>;
  updateReminder: (reminderId: string, data: { title?: string; description?: string; frequency?: ReminderFrequency; customDays?: number; questionId?: string; departmentId?: string; active?: boolean }) => Promise<void>;
  removeReminder: (reminderId: string) => Promise<void>;
  completeReminder: (reminderId: string, note?: string) => Promise<void>;
}
