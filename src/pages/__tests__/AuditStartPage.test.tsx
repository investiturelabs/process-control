import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditStartPage } from '../AuditStartPage';
import type { Store } from '@/store-types';
import type { AuditSession } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/DeptIcon', () => ({
  DeptIcon: ({ name }: { name: string }) => <span data-testid="dept-icon">{name}</span>,
}));

const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

const testDepts = [
  {
    id: 'dept-1',
    name: 'Bakery',
    icon: 'Building2',
    questions: [
      { id: 'q1', departmentId: 'dept-1', riskCategory: 'Safety', text: 'Q1', criteria: '', answerType: 'yes_no' as const, pointsYes: 10, pointsPartial: 0, pointsNo: 0 },
      { id: 'q2', departmentId: 'dept-1', riskCategory: 'Safety', text: 'Q2', criteria: '', answerType: 'yes_no' as const, pointsYes: 10, pointsPartial: 0, pointsNo: 0 },
    ],
  },
  {
    id: 'dept-2',
    name: 'Deli',
    icon: 'ShoppingCart',
    questions: [],
  },
];

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    currentUser: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'user', avatarColor: '#000' },
    departments: testDepts,
    sessions: [],
    ...overrides,
  });
}

describe('AuditStartPage', () => {
  it('renders department cards', () => {
    setStore({});
    render(<AuditStartPage />);
    expect(screen.getByText('Bakery')).toBeInTheDocument();
    expect(screen.getByText('Deli')).toBeInTheDocument();
  });

  it('shows stats cards with correct counts', () => {
    setStore({});
    render(<AuditStartPage />);
    expect(screen.getByText('Departments')).toBeInTheDocument();
    expect(screen.getByText('Audit questions')).toBeInTheDocument();
    expect(screen.getByText('Avg score')).toBeInTheDocument();
  });

  it('shows last score for a department', () => {
    const session: AuditSession = {
      id: 's1',
      companyId: 'c1',
      departmentId: 'dept-1',
      auditorId: 'u1',
      auditorName: 'Test User',
      date: '2025-01-15T00:00:00Z',
      answers: [],
      totalPoints: 90,
      maxPoints: 100,
      percentage: 90,
      completed: true,
    };
    setStore({ sessions: [session] });
    render(<AuditStartPage />);
    expect(screen.getByText('Last score')).toBeInTheDocument();
    // 90% appears both in avg score and dept card - use getAllByText
    expect(screen.getAllByText('90%').length).toBeGreaterThanOrEqual(1);
  });

  it('shows in-progress badge for current user session', () => {
    const inProgressSession: AuditSession = {
      id: 's1',
      companyId: 'c1',
      departmentId: 'dept-1',
      auditorId: 'u1',
      auditorName: 'Test User',
      date: '2025-01-15T00:00:00Z',
      answers: [{ questionId: 'q1', value: 'yes', points: 10 }],
      totalPoints: 10,
      maxPoints: 20,
      percentage: 50,
      completed: false,
    };
    setStore({ sessions: [inProgressSession] });
    render(<AuditStartPage />);
    expect(screen.getByText(/In progress/)).toBeInTheDocument();
    expect(screen.getByText(/1\/2/)).toBeInTheDocument();
  });

  it('clicking department card navigates to audit', async () => {
    const user = userEvent.setup();
    setStore({});
    render(<AuditStartPage />);
    await user.click(screen.getByLabelText('Start audit for Bakery'));
    expect(mockNavigate).toHaveBeenCalledWith('/audit/dept-1');
  });

  it('shows "No questions" badge for empty department', () => {
    setStore({});
    render(<AuditStartPage />);
    expect(screen.getByText('No questions')).toBeInTheDocument();
  });
});
