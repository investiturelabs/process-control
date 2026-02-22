export type Role = 'admin' | 'user';

export type AnswerType = 'yes_no' | 'yes_no_partial';

export type AnswerValue = 'yes' | 'no' | 'partial' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  active?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface Question {
  id: string;
  departmentId: string;
  riskCategory: string;
  text: string;
  criteria: string;
  answerType: AnswerType;
  pointsYes: number;
  pointsPartial: number;
  pointsNo: number;
}

export interface Department {
  id: string;
  name: string;
  icon: string;
  questions: Question[];
}

export interface Answer {
  questionId: string;
  value: AnswerValue;
  points: number;
  // PCT-20: question snapshot (optional, backward compat)
  questionText?: string;
  questionCriteria?: string;
  questionRiskCategory?: string;
  questionAnswerType?: AnswerType;
  questionPointsYes?: number;
  questionPointsPartial?: number;
  questionPointsNo?: number;
}

export interface AuditSession {
  id: string;
  companyId: string;
  departmentId: string;
  auditorId: string;
  auditorName: string;
  date: string;
  answers: Answer[];
  totalPoints: number;
  maxPoints: number;
  percentage: number;
  completed: boolean;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  status: 'pending' | 'accepted';
  createdAt: string;
  expiresAt?: string;
}

export interface ChangeLogEntry {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  details?: string;
}

export interface SavedAnswer {
  id: string;
  questionId: string;
  departmentId: string;
  value: 'yes' | 'no' | 'partial';
  expiresAt?: string;
  note?: string;
  savedBy: string;
  savedByName: string;
  createdAt: string;
  updatedAt: string;
}

export type ReminderFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'annually'
  | 'custom';

export interface Reminder {
  id: string;
  questionId?: string;
  departmentId?: string;
  title: string;
  description?: string;
  frequency: ReminderFrequency;
  customDays?: number;
  lastCompletedAt?: string;
  lastCompletedBy?: string;
  lastCompletedByName?: string;
  nextDueAt: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  active: boolean;
}

export interface ReminderCompletion {
  id: string;
  reminderId: string;
  completedAt: string;
  completedBy: string;
  completedByName: string;
  note?: string;
}
