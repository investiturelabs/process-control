import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryPage } from '../HistoryPage';
import type { Store } from '@/store-types';

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

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

vi.mock('@/lib/export', () => ({
  exportSessionsCsv: vi.fn(),
}));

const mockLoadMore = vi.fn();
const mockUsePaginatedQuery = vi.fn();
vi.mock('convex/react', () => ({
  usePaginatedQuery: (...args: unknown[]) => mockUsePaginatedQuery(...args),
}));

const testDepts = [
  { id: 'dept-1', name: 'Bakery', icon: 'Building2', questions: [] },
];

const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    orgId: 'org1',
    orgRole: 'admin',
    departments: testDepts,
    ...overrides,
  });
}

function setPaginatedResult(
  results: Record<string, unknown>[],
  status: 'LoadingFirstPage' | 'CanLoadMore' | 'LoadingMore' | 'Exhausted' = 'Exhausted',
) {
  mockUsePaginatedQuery.mockReturnValue({
    results,
    status,
    loadMore: mockLoadMore,
  });
}

const testRawSession = {
  _id: 's1',
  _creationTime: 1705276800000,
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

beforeEach(() => {
  vi.clearAllMocks();
  setStore({});
});

describe('HistoryPage', () => {
  it('shows loading spinner when loading first page', () => {
    setPaginatedResult([], 'LoadingFirstPage');
    render(<HistoryPage />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('shows empty state when no completed sessions', () => {
    setPaginatedResult([], 'Exhausted');
    render(<HistoryPage />);
    expect(screen.getByText('No audits completed yet.')).toBeInTheDocument();
  });

  it('renders session list for completed sessions', () => {
    setPaginatedResult([testRawSession]);
    render(<HistoryPage />);
    expect(screen.getByText('Bakery')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows "Load more" button when status is CanLoadMore', () => {
    setPaginatedResult([testRawSession], 'CanLoadMore');
    render(<HistoryPage />);
    expect(screen.getByText('Load more')).toBeInTheDocument();
  });

  it('clicking "Load more" calls loadMore(25)', async () => {
    const user = userEvent.setup();
    setPaginatedResult([testRawSession], 'CanLoadMore');
    render(<HistoryPage />);
    await user.click(screen.getByText('Load more'));
    expect(mockLoadMore).toHaveBeenCalledWith(25);
  });

  it('hides "Load more" when status is Exhausted', () => {
    setPaginatedResult([testRawSession]);
    render(<HistoryPage />);
    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
  });

  it('shows "All audits loaded" when exhausted with many items', () => {
    const manySessions = Array.from({ length: 30 }, (_, i) => ({
      ...testRawSession,
      _id: `s${i}`,
    }));
    setPaginatedResult(manySessions);
    render(<HistoryPage />);
    expect(screen.getByText('All audits loaded')).toBeInTheDocument();
  });

  it('clicking a session navigates to results page', async () => {
    const user = userEvent.setup();
    setPaginatedResult([testRawSession]);
    render(<HistoryPage />);
    await user.click(screen.getByText('Bakery'));
    expect(mockNavigate).toHaveBeenCalledWith('/results/s1');
  });

  it('shows partial count in CSV button when not exhausted', () => {
    setPaginatedResult([testRawSession], 'CanLoadMore');
    render(<HistoryPage />);
    expect(screen.getByText(/Export CSV \(1 loaded\)/)).toBeInTheDocument();
  });

  it('shows loading spinner when loading more', () => {
    setPaginatedResult([testRawSession], 'LoadingMore');
    render(<HistoryPage />);
    const spinners = screen.getAllByTestId('loading-spinner');
    expect(spinners.length).toBeGreaterThanOrEqual(1);
  });
});
