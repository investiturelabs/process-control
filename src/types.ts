export type Role = 'admin' | 'user';

export type AnswerType = 'yes_no' | 'yes_no_partial' | 'yes_no_na';

export type AnswerValue = 'yes' | 'no' | 'partial' | 'na' | null;

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
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
}
