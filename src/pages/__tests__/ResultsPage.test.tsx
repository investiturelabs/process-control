import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResultsPage } from '../ResultsPage';
import type { Store } from '@/store-types';
import type { AuditSession, Department } from '@/types';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ sessionId: 'session-1' }),
  useNavigate: () => mockNavigate,
}));

// Mock DeptIcon
vi.mock('@/components/DeptIcon', () => ({
  DeptIcon: ({ name }: { name: string }) => <span data-testid="dept-icon">{name}</span>,
}));

// Mock export
vi.mock('@/lib/export', () => ({
  exportSingleAuditCsv: vi.fn(),
}));

// Mock context
const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    orgId: 'org1',
    orgRole: 'admin',
    departments: [],
    sessions: [],
    ...overrides,
  });
}

const testSession: AuditSession = {
  id: 'session-1',
  companyId: 'c1',
  departmentId: 'dept-test',
  auditorId: 'u1',
  auditorName: 'Test User',
  date: '2025-01-15T00:00:00.000Z',
  answers: [
    { questionId: 'q1', value: 'yes', points: 10 },
    { questionId: 'q2', value: 'no', points: 0 },
  ],
  totalPoints: 10,
  maxPoints: 20,
  percentage: 50,
  completed: true,
};

const testDept: Department = {
  id: 'dept-test',
  name: 'Test Department',
  icon: 'Building2',
  questions: [
    {
      id: 'q1',
      departmentId: 'dept-test',
      riskCategory: 'Safety',
      text: 'Question 1',
      criteria: '',
      answerType: 'yes_no',
      pointsYes: 10,
      pointsPartial: 5,
      pointsNo: 0,
    },
    {
      id: 'q2',
      departmentId: 'dept-test',
      riskCategory: 'Safety',
      text: 'Question 2',
      criteria: '',
      answerType: 'yes_no',
      pointsYes: 10,
      pointsPartial: 5,
      pointsNo: 0,
    },
  ],
};

describe('ResultsPage', () => {
  it('shows "Audit not found" when session does not exist', () => {
    setStore({ sessions: [], departments: [] });
    render(<ResultsPage />);

    expect(screen.getByText('Audit not found.')).toBeInTheDocument();
  });

  it('shows degraded view when department is deleted', () => {
    setStore({ sessions: [testSession], departments: [] });
    render(<ResultsPage />);

    expect(screen.getByText('Deleted department — Audit Results')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.queryByText('Export')).not.toBeInTheDocument();
  });

  it('renders normal view with dept name and Export when both exist', () => {
    setStore({ sessions: [testSession], departments: [testDept] });
    render(<ResultsPage />);

    expect(screen.getByText('Test Department — Audit Results')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});
