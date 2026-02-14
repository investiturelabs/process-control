import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardPage } from '../DashboardPage';
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

vi.mock('@/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('@/lib/export', () => ({
  exportSessionsCsv: vi.fn(),
}));

// Mock recharts to avoid jsdom SVG issues
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: () => <div data-testid="line-chart" />,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  BarChart: () => <div data-testid="bar-chart" />,
  Bar: () => null,
  Cell: () => null,
  RadarChart: () => <div data-testid="radar-chart" />,
  PolarGrid: () => null,
  PolarAngleAxis: () => null,
  PolarRadiusAxis: () => null,
  Radar: () => null,
  AreaChart: () => <div data-testid="area-chart" />,
  Area: () => null,
}));

const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    currentUser: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'admin', avatarColor: '#000' },
    departments: [
      { id: 'dept-1', name: 'Bakery', icon: 'Building2', questions: [{ id: 'q1', departmentId: 'dept-1', riskCategory: 'Safety', text: 'Q1', criteria: '', answerType: 'yes_no' as const, pointsYes: 10, pointsPartial: 0, pointsNo: 0 }] },
    ],
    sessions: [],
    ...overrides,
  });
}

const makeSession = (id: string, pct: number, date: string): AuditSession => ({
  id,
  companyId: 'c1',
  departmentId: 'dept-1',
  auditorId: 'u1',
  auditorName: 'Test User',
  date,
  answers: [],
  totalPoints: pct,
  maxPoints: 100,
  percentage: pct,
  completed: true,
});

describe('DashboardPage', () => {
  it('shows empty state when no completed sessions', () => {
    setStore({ sessions: [] });
    render(<DashboardPage />);
    expect(screen.getByText('No audits completed yet.')).toBeInTheDocument();
    expect(screen.getByText('Start your first audit')).toBeInTheDocument();
  });

  it('shows welcome message with first name', () => {
    setStore({ sessions: [] });
    render(<DashboardPage />);
    expect(screen.getByText(/Welcome back, Test/)).toBeInTheDocument();
  });

  it('shows summary stats with data', () => {
    setStore({
      sessions: [
        makeSession('s1', 85, '2025-01-15T00:00:00Z'),
        makeSession('s2', 90, '2025-02-15T00:00:00Z'),
      ],
    });
    render(<DashboardPage />);
    expect(screen.getByText('Overall Avg')).toBeInTheDocument();
    expect(screen.getByText('Total Audits')).toBeInTheDocument();
    expect(screen.getByText('Trend')).toBeInTheDocument();
    expect(screen.getByText('Recent Avg')).toBeInTheDocument();
  });

  it('renders Export CSV button when data exists', () => {
    setStore({
      sessions: [makeSession('s1', 85, '2025-01-15T00:00:00Z')],
    });
    render(<DashboardPage />);
    expect(screen.getByText('Export CSV')).toBeInTheDocument();
  });

  it('clicking Export CSV calls exportSessionsCsv', async () => {
    const { exportSessionsCsv } = await import('@/lib/export');
    const user = userEvent.setup();
    setStore({
      sessions: [makeSession('s1', 85, '2025-01-15T00:00:00Z')],
    });
    render(<DashboardPage />);
    await user.click(screen.getByText('Export CSV'));
    expect(exportSessionsCsv).toHaveBeenCalled();
  });
});
