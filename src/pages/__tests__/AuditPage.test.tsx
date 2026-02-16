import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditPage } from '../AuditPage';
import type { Store } from '@/store-types';
import type { Department } from '@/types';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useParams: () => ({ departmentId: 'dept-test' }),
  useNavigate: () => mockNavigate,
}));

// Mock sonner
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

// Mock DeptIcon to avoid lucide import issues in tests
vi.mock('@/components/DeptIcon', () => ({
  DeptIcon: ({ name }: { name: string }) => <span data-testid="dept-icon">{name}</span>,
}));

// Mock context
const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    departments: [],
    sessions: [],
    currentUser: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'user' as const, avatarColor: '#000' },
    company: { id: 'c1', name: 'Test Co' },
    saveSession: vi.fn(),
    updateSession: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(mockStore)) {
    delete (mockStore as Record<string, unknown>)[key];
  }
});

const makeDept = (questionCount: number): Department => ({
  id: 'dept-test',
  name: 'Test Department',
  icon: 'Building2',
  questions: Array.from({ length: questionCount }, (_, i) => ({
    id: `q${i}`,
    departmentId: 'dept-test',
    riskCategory: 'Safety',
    text: `Question ${i + 1}`,
    criteria: 'Criteria text',
    answerType: 'yes_no' as const,
    pointsYes: 10,
    pointsPartial: 5,
    pointsNo: 0,
  })),
});

const makeDeptWithPartial = (): Department => ({
  id: 'dept-test',
  name: 'Test Department',
  icon: 'Building2',
  questions: [
    {
      id: 'qp1',
      departmentId: 'dept-test',
      riskCategory: 'Safety',
      text: 'Partial Question 1',
      criteria: '',
      answerType: 'yes_no_partial' as const,
      pointsYes: 10,
      pointsPartial: 5,
      pointsNo: 0,
    },
  ],
});

describe('AuditPage', () => {
  it('shows empty-state guard when department has 0 questions', () => {
    setStore({ departments: [makeDept(0)], sessions: [] });
    render(<AuditPage />);

    expect(screen.getByText('No questions configured for this department.')).toBeInTheDocument();
    expect(screen.getByText('An admin can add questions in Settings.')).toBeInTheDocument();
    expect(screen.queryByText('Finish audit')).not.toBeInTheDocument();
  });

  it('renders question card for department with questions', () => {
    setStore({ departments: [makeDept(3)], sessions: [] });
    render(<AuditPage />);

    expect(screen.getByText('Question 1')).toBeInTheDocument();
    expect(screen.queryByText('No questions configured for this department.')).not.toBeInTheDocument();
  });

  it('shows dept not found for unknown department', () => {
    setStore({ departments: [], sessions: [] });
    render(<AuditPage />);

    expect(screen.getByText('Department not found.')).toBeInTheDocument();
  });

  it('ArrowRight advances to next question', async () => {
    setStore({ departments: [makeDept(3)], sessions: [] });
    const user = userEvent.setup();
    render(<AuditPage />);

    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('ArrowLeft goes to previous question', async () => {
    setStore({ departments: [makeDept(3)], sessions: [] });
    const user = userEvent.setup();
    render(<AuditPage />);

    // Navigate forward first
    await user.keyboard('{ArrowRight}');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('ArrowLeft at first question is no-op', async () => {
    setStore({ departments: [makeDept(3)], sessions: [] });
    const user = userEvent.setup();
    render(<AuditPage />);

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('Y key answers Yes', async () => {
    setStore({ departments: [makeDept(3)], sessions: [] });
    const user = userEvent.setup();
    render(<AuditPage />);

    // Verify Yes button exists
    expect(screen.getByLabelText(/Answer Yes/)).toBeInTheDocument();

    await user.keyboard('y');

    // After answering, auto-advances (with 250ms delay)
    // The answer should be recorded — check that a green dot appears
    await vi.waitFor(() => {
      const dots = screen.getAllByLabelText(/Go to question/);
      const firstDot = dots[0].querySelector('div');
      expect(firstDot?.className).toContain('bg-emerald');
    });
  });

  it('N key answers No', async () => {
    setStore({ departments: [makeDept(3)], sessions: [] });
    const user = userEvent.setup();
    render(<AuditPage />);

    await user.keyboard('n');

    await vi.waitFor(() => {
      const dots = screen.getAllByLabelText(/Go to question/);
      const firstDot = dots[0].querySelector('div');
      expect(firstDot?.className).toContain('bg-red');
    });
  });

  it('P key answers Partial on yes_no_partial question', async () => {
    setStore({ departments: [makeDeptWithPartial()], sessions: [] });
    const user = userEvent.setup();
    render(<AuditPage />);

    await user.keyboard('p');

    await vi.waitFor(() => {
      const dots = screen.getAllByLabelText(/Go to question/);
      const firstDot = dots[0].querySelector('div');
      expect(firstDot?.className).toContain('bg-amber');
    });
  });

  it('P key is ignored on yes_no question', async () => {
    setStore({ departments: [makeDept(3)], sessions: [] });
    const user = userEvent.setup();
    render(<AuditPage />);

    await user.keyboard('p');

    // Should still be on question 1 with no answer
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    const dots = screen.getAllByLabelText(/Go to question/);
    const firstDot = dots[0].querySelector('div');
    expect(firstDot?.className).toContain('bg-transparent');
  });

  it('keyboard hint is visible', () => {
    setStore({ departments: [makeDept(3)], sessions: [] });
    render(<AuditPage />);

    // The hint <p> contains kbd elements and text. Use a function matcher.
    const hint = screen.getByText((_, element) =>
      element?.tagName === 'P' &&
      !!element.textContent?.includes('Yes') &&
      !!element.textContent?.includes('Navigate')
    );
    expect(hint).toBeInTheDocument();
  });

  it('keyboard hint shows P only for yes_no_partial', () => {
    setStore({ departments: [makeDeptWithPartial()], sessions: [] });
    render(<AuditPage />);

    const hint = screen.getByText((_, element) =>
      element?.tagName === 'P' &&
      !!element.textContent?.includes('Yes') &&
      !!element.textContent?.includes('Navigate')
    );
    expect(hint.textContent).toContain('Partial');
  });

  it('keyboard hint does not show P for yes_no', () => {
    setStore({ departments: [makeDept(1)], sessions: [] });
    render(<AuditPage />);

    const hint = screen.getByText((_, element) =>
      element?.tagName === 'P' &&
      !!element.textContent?.includes('Yes') &&
      !!element.textContent?.includes('Navigate')
    );
    expect(hint.textContent).not.toContain('Partial');
  });
});
