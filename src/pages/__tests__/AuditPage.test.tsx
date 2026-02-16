import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuditPage } from '../AuditPage';
import type { Store } from '@/store-types';
import type { Department, SavedAnswer } from '@/types';

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

// Mock SaveAnswerDialog to avoid complex rendering
vi.mock('@/components/SaveAnswerDialog', () => ({
  SaveAnswerDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="save-answer-dialog">Save Answer Dialog</div> : null,
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
    savedAnswers: [],
    currentUser: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'user' as const, avatarColor: '#000' },
    company: { id: 'c1', name: 'Test Co' },
    saveSession: vi.fn(),
    updateSession: vi.fn(),
    saveSavedAnswer: vi.fn(),
    removeSavedAnswer: vi.fn(),
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

  // --- Saved Answers Tests ---

  it('auto-fills answers from non-expired saved answers on fresh audit', () => {
    const dept = makeDept(3);
    const savedAnswers: SavedAnswer[] = [
      { id: 'sa1', questionId: 'q0', departmentId: 'dept-test', value: 'yes', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
      { id: 'sa2', questionId: 'q1', departmentId: 'dept-test', value: 'no', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    setStore({ departments: [dept], sessions: [], savedAnswers });
    render(<AuditPage />);

    // q0 should be auto-filled yes (green), q1 should be auto-filled no (red)
    const dots = screen.getAllByLabelText(/Go to question/);
    const firstDot = dots[0].querySelector('div');
    expect(firstDot?.className).toContain('bg-emerald');
    const secondDot = dots[1].querySelector('div');
    expect(secondDot?.className).toContain('bg-red');
    // q2 should be unanswered
    const thirdDot = dots[2].querySelector('div');
    expect(thirdDot?.className).toContain('bg-transparent');
  });

  it('does NOT auto-fill expired saved answers', () => {
    const dept = makeDept(2);
    const savedAnswers: SavedAnswer[] = [
      { id: 'sa1', questionId: 'q0', departmentId: 'dept-test', value: 'yes', expiresAt: '2020-01-01T00:00:00.000Z', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    setStore({ departments: [dept], sessions: [], savedAnswers });
    render(<AuditPage />);

    // q0 should NOT be auto-filled (expired)
    const dots = screen.getAllByLabelText(/Go to question/);
    const firstDot = dots[0].querySelector('div');
    expect(firstDot?.className).toContain('bg-transparent');
  });

  it('shows Auto-filled badge when question was auto-populated', () => {
    const dept = makeDept(2);
    const savedAnswers: SavedAnswer[] = [
      { id: 'sa1', questionId: 'q0', departmentId: 'dept-test', value: 'yes', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    setStore({ departments: [dept], sessions: [], savedAnswers });
    render(<AuditPage />);

    expect(screen.getByText('Auto-filled')).toBeInTheDocument();
  });

  it('shows expired saved answer warning banner', () => {
    const dept = makeDept(1);
    const savedAnswers: SavedAnswer[] = [
      { id: 'sa1', questionId: 'q0', departmentId: 'dept-test', value: 'yes', expiresAt: '2020-06-15T00:00:00.000Z', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    setStore({ departments: [dept], sessions: [], savedAnswers });
    render(<AuditPage />);

    expect(screen.getByText(/Saved answer expired on/)).toBeInTheDocument();
  });

  it('shows saved answer note on flashcard', () => {
    const dept = makeDept(1);
    const savedAnswers: SavedAnswer[] = [
      { id: 'sa1', questionId: 'q0', departmentId: 'dept-test', value: 'yes', note: 'Valid until 2028', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    setStore({ departments: [dept], sessions: [], savedAnswers });
    render(<AuditPage />);

    expect(screen.getByText('Valid until 2028')).toBeInTheDocument();
  });

  it('shows pin button after answering a question', async () => {
    setStore({ departments: [makeDept(2)], sessions: [] });
    const user = userEvent.setup();
    render(<AuditPage />);

    // No pin button before answering
    expect(screen.queryByText('Save this answer')).not.toBeInTheDocument();

    // Answer the question
    await user.keyboard('y');

    // Pin button should appear (on next question since we auto-advance,
    // but the first question should have been answered)
    // Navigate back to see the answered question
    await user.keyboard('{ArrowLeft}');

    await vi.waitFor(() => {
      expect(screen.getByText('Save this answer')).toBeInTheDocument();
    });
  });

  it('shows "Saved — tap to edit" when saved answer exists for current question', async () => {
    const dept = makeDept(1);
    const savedAnswers: SavedAnswer[] = [
      { id: 'sa1', questionId: 'q0', departmentId: 'dept-test', value: 'yes', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    setStore({ departments: [dept], sessions: [], savedAnswers });
    render(<AuditPage />);

    // Auto-filled, so there's an answer — pin should show "Saved — tap to edit"
    expect(screen.getByText('Saved — tap to edit')).toBeInTheDocument();
  });

  it('dot-pinned class applied to dots with saved answers', () => {
    const dept = makeDept(3);
    const savedAnswers: SavedAnswer[] = [
      { id: 'sa1', questionId: 'q0', departmentId: 'dept-test', value: 'yes', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    setStore({ departments: [dept], sessions: [], savedAnswers });
    render(<AuditPage />);

    const dots = screen.getAllByLabelText(/Go to question/);
    // First dot (q0) has saved answer — should have dot-pinned class
    const firstDot = dots[0].querySelector('div');
    expect(firstDot?.className).toContain('dot-pinned');
    // Second dot (q1) has no saved answer
    const secondDot = dots[1].querySelector('div');
    expect(secondDot?.className).not.toContain('dot-pinned');
  });

  it('does not auto-fill saved answers from different department', () => {
    const dept = makeDept(2);
    const savedAnswers: SavedAnswer[] = [
      { id: 'sa1', questionId: 'q0', departmentId: 'other-dept', value: 'yes', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    setStore({ departments: [dept], sessions: [], savedAnswers });
    render(<AuditPage />);

    const dots = screen.getAllByLabelText(/Go to question/);
    const firstDot = dots[0].querySelector('div');
    expect(firstDot?.className).toContain('bg-transparent');
  });

  it('resume session takes priority over auto-fill', () => {
    const dept = makeDept(3);
    const savedAnswers: SavedAnswer[] = [
      { id: 'sa1', questionId: 'q0', departmentId: 'dept-test', value: 'yes', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    const existingSession = {
      id: 'sess1',
      companyId: 'c1',
      departmentId: 'dept-test',
      auditorId: 'u1',
      auditorName: 'Test User',
      date: '2025-01-01',
      answers: [{ questionId: 'q0', value: 'no' as const, points: 0 }],
      totalPoints: 0,
      maxPoints: 30,
      percentage: 0,
      completed: false,
    };
    setStore({ departments: [dept], sessions: [existingSession], savedAnswers });
    render(<AuditPage />);

    // Should show the session's answer (no/red) not the saved answer (yes/green)
    const dots = screen.getAllByLabelText(/Go to question/);
    const firstDot = dots[0].querySelector('div');
    expect(firstDot?.className).toContain('bg-red');
    // Auto-filled badge should NOT appear since we resumed
    expect(screen.queryByText('Auto-filled')).not.toBeInTheDocument();
  });

  it('removing auto-filled answer clears auto-filled badge', async () => {
    const dept = makeDept(2);
    const savedAnswers: SavedAnswer[] = [
      { id: 'sa1', questionId: 'q0', departmentId: 'dept-test', value: 'yes', savedBy: 'u1', savedByName: 'Tester', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
    ];
    setStore({ departments: [dept], sessions: [], savedAnswers });
    const user = userEvent.setup();
    render(<AuditPage />);

    // Should show Auto-filled initially
    expect(screen.getByText('Auto-filled')).toBeInTheDocument();

    // Change the answer — should remove auto-filled status
    await user.keyboard('n');

    // Navigate back to q0
    await user.keyboard('{ArrowLeft}');

    await vi.waitFor(() => {
      expect(screen.queryByText('Auto-filled')).not.toBeInTheDocument();
    });
  });
});
