import type { User, Company, Department, AuditSession, Invitation, Role, Question } from './types';

export interface Store {
  currentUser: User | null;
  users: User[];
  company: Company | null;
  departments: Department[];
  sessions: AuditSession[];
  invitations: Invitation[];
  loading: boolean;
  login: (name: string, email: string) => Promise<void>;
  logout: () => void;
  setCompany: (c: Company) => Promise<void>;
  updateDepartments: (deps: Department[]) => Promise<void>;
  saveSession: (session: Omit<AuditSession, 'id'>) => Promise<string>;
  inviteUser: (email: string, role: Role) => Promise<void>;
  updateUserRole: (userId: string, role: Role) => Promise<void>;
  removeInvitation: (invId: string) => Promise<void>;
  addQuestion: (question: Omit<Question, 'id'>) => Promise<void>;
  updateQuestion: (question: Question) => Promise<void>;
  removeQuestion: (questionId: string) => Promise<void>;
}
