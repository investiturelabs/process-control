import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionFormDialog } from '../QuestionFormDialog';

// Mock uuid
vi.mock('uuid', () => ({ v4: () => 'mock-uuid' }));

describe('QuestionFormDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    departmentId: 'dept-1',
    existingCategories: ['Safety', 'Hygiene'],
    question: null,
    onSave: vi.fn(),
  };

  it('renders "Add question" title in add mode', () => {
    render(<QuestionFormDialog {...defaultProps} />);
    // Title and button both say "Add question" — check heading role
    expect(screen.getByRole('heading', { name: 'Add question' })).toBeInTheDocument();
  });

  it('renders "Edit question" title in edit mode', () => {
    const question = {
      id: 'q1',
      departmentId: 'dept-1',
      riskCategory: 'Safety',
      text: 'Existing question',
      criteria: 'Some criteria',
      answerType: 'yes_no' as const,
      pointsYes: 10,
      pointsPartial: 5,
      pointsNo: 0,
    };
    render(<QuestionFormDialog {...defaultProps} question={question} />);
    expect(screen.getByText('Edit question')).toBeInTheDocument();
  });

  it('populates form fields in edit mode', () => {
    const question = {
      id: 'q1',
      departmentId: 'dept-1',
      riskCategory: 'Safety',
      text: 'Existing question',
      criteria: 'Some criteria',
      answerType: 'yes_no_partial' as const,
      pointsYes: 10,
      pointsPartial: 7,
      pointsNo: 0,
    };
    render(<QuestionFormDialog {...defaultProps} question={question} />);
    expect(screen.getByLabelText('Question *')).toHaveValue('Existing question');
    expect(screen.getByLabelText('Criteria')).toHaveValue('Some criteria');
  });

  it('has empty fields in add mode', () => {
    render(<QuestionFormDialog {...defaultProps} />);
    expect(screen.getByLabelText('Question *')).toHaveValue('');
    expect(screen.getByLabelText('Criteria')).toHaveValue('');
  });

  it('calls onSave with question data on submit', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<QuestionFormDialog {...defaultProps} onSave={onSave} existingCategories={['Safety']} />);

    await user.type(screen.getByLabelText('Question *'), 'New question text');
    await user.click(screen.getByText('Add question', { selector: 'button' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'New question text',
        departmentId: 'dept-1',
        riskCategory: 'Safety',
      }),
    );
  });
});
