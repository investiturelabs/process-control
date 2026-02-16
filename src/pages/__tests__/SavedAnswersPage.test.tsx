import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedAnswersPage } from '../SavedAnswersPage';
import type { Store } from '@/store-types';
import type { SavedAnswer } from '@/types';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/components/DeptIcon', () => ({
  DeptIcon: ({ name }: { name: string }) => <span data-testid="dept-icon">{name}</span>,
}));
vi.mock('@/components/SaveAnswerDialog', () => ({
  SaveAnswerDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="save-answer-dialog">Save Answer Dialog</div> : null,
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
      { id: 'q1', departmentId: 'dept-1', riskCategory: 'Safety', text: 'Is oven clean?', criteria: '', answerType: 'yes_no' as const, pointsYes: 5, pointsPartial: 0, pointsNo: 0 },
      { id: 'q2', departmentId: 'dept-1', riskCategory: 'Hygiene', text: 'Are gloves worn?', criteria: '', answerType: 'yes_no' as const, pointsYes: 5, pointsPartial: 0, pointsNo: 0 },
    ],
  },
  {
    id: 'dept-2',
    name: 'Deli',
    icon: 'ShoppingCart',
    questions: [
      { id: 'q3', departmentId: 'dept-2', riskCategory: 'Safety', text: 'Is slicer clean?', criteria: '', answerType: 'yes_no' as const, pointsYes: 5, pointsPartial: 0, pointsNo: 0 },
    ],
  },
];

const testSavedAnswers: SavedAnswer[] = [
  { id: 'sa1', questionId: 'q1', departmentId: 'dept-1', value: 'yes', expiresAt: '2028-06-15T00:00:00.000Z', note: 'Valid cert', savedBy: 'u1', savedByName: 'Admin', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: 'sa2', questionId: 'q3', departmentId: 'dept-2', value: 'no', savedBy: 'u1', savedByName: 'Admin', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
];

const expiredSavedAnswer: SavedAnswer = {
  id: 'sa3', questionId: 'q2', departmentId: 'dept-1', value: 'partial',
  expiresAt: '2020-01-01T00:00:00.000Z',
  savedBy: 'u1', savedByName: 'Admin', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
};

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    currentUser: { id: 'u1', name: 'Admin', email: 'admin@test.com', role: 'admin', avatarColor: '#000' },
    departments: testDepts,
    savedAnswers: testSavedAnswers,
    saveSavedAnswer: vi.fn(),
    updateSavedAnswer: vi.fn(),
    removeSavedAnswer: vi.fn(),
    loading: false,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(mockStore)) {
    delete (mockStore as Record<string, unknown>)[key];
  }
});

describe('SavedAnswersPage', () => {
  it('shows admin-only message for non-admin users', () => {
    setStore({
      currentUser: { id: 'u2', name: 'User', email: 'user@test.com', role: 'user', avatarColor: '#111' },
    });
    render(<SavedAnswersPage />);

    expect(screen.getByText('Only admins can manage saved answers.')).toBeInTheDocument();
  });

  it('renders saved answers grouped by department', () => {
    setStore({});
    render(<SavedAnswersPage />);

    expect(screen.getByText('Bakery')).toBeInTheDocument();
    expect(screen.getByText('Deli')).toBeInTheDocument();
    expect(screen.getByText('Is oven clean?')).toBeInTheDocument();
    expect(screen.getByText('Is slicer clean?')).toBeInTheDocument();
  });

  it('shows answer value badges', () => {
    setStore({});
    render(<SavedAnswersPage />);

    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('shows expiration date for saved answers with expiration', () => {
    setStore({});
    render(<SavedAnswersPage />);

    expect(screen.getByText(/Expires/)).toBeInTheDocument();
    expect(screen.getByText('No expiration')).toBeInTheDocument();
  });

  it('shows note when present', () => {
    setStore({});
    render(<SavedAnswersPage />);

    expect(screen.getByText('Valid cert')).toBeInTheDocument();
  });

  it('shows expired badge for expired saved answers', () => {
    setStore({
      savedAnswers: [...testSavedAnswers, expiredSavedAnswer],
    });
    render(<SavedAnswersPage />);

    expect(screen.getByText(/Expired/)).toBeInTheDocument();
  });

  it('shows empty state when no saved answers', () => {
    setStore({ savedAnswers: [] });
    render(<SavedAnswersPage />);

    expect(screen.getByText(/No saved answers yet/)).toBeInTheDocument();
  });

  it('filters saved answers by search term', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SavedAnswersPage />);

    await user.type(screen.getByPlaceholderText('Search...'), 'oven');

    expect(screen.getByText('Is oven clean?')).toBeInTheDocument();
    expect(screen.queryByText('Is slicer clean?')).not.toBeInTheDocument();
  });

  it('filters by department name', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SavedAnswersPage />);

    await user.type(screen.getByPlaceholderText('Search...'), 'Deli');

    expect(screen.getByText('Is slicer clean?')).toBeInTheDocument();
    expect(screen.queryByText('Is oven clean?')).not.toBeInTheDocument();
  });

  it('filters by note text', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SavedAnswersPage />);

    await user.type(screen.getByPlaceholderText('Search...'), 'cert');

    expect(screen.getByText('Is oven clean?')).toBeInTheDocument();
    expect(screen.queryByText('Is slicer clean?')).not.toBeInTheDocument();
  });

  it('shows search empty state when no matches', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SavedAnswersPage />);

    await user.type(screen.getByPlaceholderText('Search...'), 'xyznonexistent');

    expect(screen.getByText(/No saved answers match your search/)).toBeInTheDocument();
  });

  it('opens edit dialog when edit button clicked', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SavedAnswersPage />);

    const editButtons = screen.getAllByLabelText('Edit saved answer');
    await user.click(editButtons[0]);

    expect(screen.getByTestId('save-answer-dialog')).toBeInTheDocument();
  });

  it('opens delete confirmation dialog when delete button clicked', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SavedAnswersPage />);

    const deleteButtons = screen.getAllByLabelText('Delete saved answer');
    await user.click(deleteButtons[0]);

    expect(screen.getByText('Remove saved answer?')).toBeInTheDocument();
  });

  it('calls removeSavedAnswer when confirming delete', async () => {
    const removeSavedAnswer = vi.fn().mockResolvedValue(undefined);
    setStore({ removeSavedAnswer });
    const user = userEvent.setup();
    render(<SavedAnswersPage />);

    const deleteButtons = screen.getAllByLabelText('Delete saved answer');
    await user.click(deleteButtons[0]);

    await user.click(screen.getByRole('button', { name: 'Remove' }));

    expect(removeSavedAnswer).toHaveBeenCalledWith('sa1');
  });

  it('shows saved-by name', () => {
    setStore({});
    render(<SavedAnswersPage />);

    const byAdminTexts = screen.getAllByText(/by Admin/);
    expect(byAdminTexts.length).toBeGreaterThan(0);
  });

  it('shows department count badges', () => {
    setStore({});
    render(<SavedAnswersPage />);

    // Each dept has 1 saved answer, so two count badges with "1"
    const badges = screen.getAllByText('1');
    expect(badges.length).toBeGreaterThanOrEqual(2);
  });

  it('skips saved answers for deleted questions (no crash)', () => {
    setStore({
      savedAnswers: [
        { id: 'sa-orphan', questionId: 'deleted-q', departmentId: 'dept-1', value: 'yes', savedBy: 'u1', savedByName: 'Admin', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
      ],
    });
    render(<SavedAnswersPage />);

    // Should show empty state since the orphan is filtered out
    expect(screen.getByText(/No saved answers yet/)).toBeInTheDocument();
  });
});
