import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveAnswerDialog } from '../SaveAnswerDialog';
import type { SavedAnswer } from '@/types';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const baseProps = {
  open: true,
  onOpenChange: vi.fn(),
  questionId: 'q1',
  questionText: 'Is the oven clean?',
  departmentId: 'dept-1',
  currentValue: 'yes' as const,
  onSave: vi.fn().mockResolvedValue(undefined),
};

const existingSavedAnswer: SavedAnswer = {
  id: 'sa1',
  questionId: 'q1',
  departmentId: 'dept-1',
  value: 'yes',
  expiresAt: '2028-01-01T00:00:00.000Z',
  note: 'Certificate renewed 2025',
  savedBy: 'u1',
  savedByName: 'Admin',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SaveAnswerDialog', () => {
  it('renders in create mode with question text and answer badge', () => {
    render(<SaveAnswerDialog {...baseProps} />);

    expect(screen.getByText('Save answer for future audits')).toBeInTheDocument();
    expect(screen.getByText('Is the oven clean?')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders in edit mode when existingSavedAnswer is provided', () => {
    render(
      <SaveAnswerDialog
        {...baseProps}
        existingSavedAnswer={existingSavedAnswer}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText('Edit saved answer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove saved answer' })).toBeInTheDocument();
  });

  it('pre-fills expiration and note in edit mode', () => {
    render(
      <SaveAnswerDialog
        {...baseProps}
        existingSavedAnswer={existingSavedAnswer}
        onRemove={vi.fn()}
      />
    );

    const dateInput = screen.getByLabelText('Expiration date') as HTMLInputElement;
    expect(dateInput.value).toBe('2028-01-01');

    const noteInput = screen.getByLabelText('Note (optional)') as HTMLTextAreaElement;
    expect(noteInput.value).toBe('Certificate renewed 2025');
  });

  it('calls onSave with correct data on save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SaveAnswerDialog {...baseProps} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith({
      questionId: 'q1',
      departmentId: 'dept-1',
      value: 'yes',
      expiresAt: undefined,
      note: undefined,
    });
  });

  it('calls onSave with note when provided', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<SaveAnswerDialog {...baseProps} onSave={onSave} />);

    const noteInput = screen.getByLabelText('Note (optional)');
    await user.type(noteInput, 'Food safety cert');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ note: 'Food safety cert' }),
    );
  });

  it('shows error toast on save failure and keeps dialog open', async () => {
    const { toast } = await import('sonner');
    const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<SaveAnswerDialog {...baseProps} onSave={onSave} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(toast.error).toHaveBeenCalledWith('Failed to save answer');
    // Dialog should stay open (onOpenChange not called with false)
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('expiration preset buttons update the date input', async () => {
    const user = userEvent.setup();
    render(<SaveAnswerDialog {...baseProps} />);

    await user.click(screen.getByRole('button', { name: '3 years' }));

    const dateInput = screen.getByLabelText('Expiration date') as HTMLInputElement;
    const expectedYear = new Date().getFullYear() + 3;
    expect(dateInput.value).toContain(String(expectedYear));
  });

  it('No expiration button clears the date', async () => {
    const user = userEvent.setup();
    render(<SaveAnswerDialog {...baseProps} />);

    // First set a date
    await user.click(screen.getByRole('button', { name: '1 year' }));
    const dateInput = screen.getByLabelText('Expiration date') as HTMLInputElement;
    expect(dateInput.value).not.toBe('');

    // Then clear it
    await user.click(screen.getByRole('button', { name: 'No expiration' }));
    expect(dateInput.value).toBe('');
  });

  it('calls onRemove when remove button is clicked', async () => {
    const onRemove = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <SaveAnswerDialog
        {...baseProps}
        existingSavedAnswer={existingSavedAnswer}
        onRemove={onRemove}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Remove saved answer' }));

    expect(onRemove).toHaveBeenCalledWith('sa1');
  });

  it('shows removing state on remove button', async () => {
    // Create a promise that we control
    let resolveRemove!: () => void;
    const onRemove = vi.fn().mockReturnValue(new Promise<void>((res) => { resolveRemove = res; }));
    const user = userEvent.setup();
    render(
      <SaveAnswerDialog
        {...baseProps}
        existingSavedAnswer={existingSavedAnswer}
        onRemove={onRemove}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Remove saved answer' }));

    expect(screen.getByText('Removing...')).toBeInTheDocument();
    resolveRemove();
  });

  it('shows correct badge color for No answer', () => {
    render(<SaveAnswerDialog {...baseProps} currentValue="no" />);
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('shows correct badge color for Partial answer', () => {
    render(<SaveAnswerDialog {...baseProps} currentValue="partial" />);
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });

  it('note character counter updates', async () => {
    const user = userEvent.setup();
    render(<SaveAnswerDialog {...baseProps} />);

    expect(screen.getByText('0/500')).toBeInTheDocument();

    const noteInput = screen.getByLabelText('Note (optional)');
    await user.type(noteInput, 'Hello');

    expect(screen.getByText('5/500')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(<SaveAnswerDialog {...baseProps} open={false} />);

    expect(screen.queryByText('Save answer for future audits')).not.toBeInTheDocument();
  });
});
