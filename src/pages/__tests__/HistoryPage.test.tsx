import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPage } from '../HistoryPage';
import type { Store } from '@/store-types';
import type { AuditSession } from '@/types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

vi.mock('@/components/DeptIcon', () => ({
  DeptIcon: ({ name }: { name: string }) => <span data-testid="dept-icon">{name}</span>,
}));

vi.mock('@/components/DateRangePills', () => ({
  DateRangePills: () => <div data-testid="date-range-pills" />,
}));

vi.mock('@/components/DepartmentFilter', () => ({
  DepartmentFilter: () => <div data-testid="dept-filter" />,
}));

vi.mock('@/lib/export', () => ({
  exportSessionsCsv: vi.fn(),
}));

const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

const testDepts = [
  { id: 'dept-1', name: 'Bakery', icon: 'Building2', questions: [] },
];

const testSession: AuditSession = {
  id: 's1',
  companyId: 'c1',
  departmentId: 'dept-1',
  auditorId: 'u1',
  auditorName: 'Test User',
  date: '2025-01-15T00:00:00Z',
  answers: [],
  totalPoints: 85,
  maxPoints: 100,
  percentage: 85,
  completed: true,
};

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    sessions: [],
    departments: testDepts,
    ...overrides,
  });
}

describe('HistoryPage', () => {
  it('shows empty state when no completed sessions', () => {
    setStore({ sessions: [] });
    render(<HistoryPage />);
    expect(screen.getByText('No audits completed yet.')).toBeInTheDocument();
  });

  it('renders session list for completed sessions', () => {
    setStore({ sessions: [testSession] });
    render(<HistoryPage />);
    expect(screen.getByText('Bakery')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('clicking a session navigates to results page', async () => {
    const user = userEvent.setup();
    setStore({ sessions: [testSession] });
    render(<HistoryPage />);
    await user.click(screen.getByText('Bakery'));
    expect(mockNavigate).toHaveBeenCalledWith('/results/s1');
  });

  it('renders Export CSV button', () => {
    setStore({ sessions: [testSession] });
    render(<HistoryPage />);
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });
});
