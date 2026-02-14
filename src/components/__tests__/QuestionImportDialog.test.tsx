import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionImportDialog } from '../QuestionImportDialog';
import type { Store } from '@/store-types';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    departments: [],
    addDepartment: vi.fn().mockResolvedValue('dept-new'),
    addQuestion: vi.fn(),
    ...overrides,
  });
}

describe('QuestionImportDialog', () => {
  it('renders nothing when closed', () => {
    setStore({});
    const { container } = render(
      <QuestionImportDialog open={false} onOpenChange={vi.fn()} />,
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renders dialog title and file picker when open', () => {
    setStore({});
    render(<QuestionImportDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText('Import questions from CSV')).toBeInTheDocument();
  });

  it('shows description text about expected columns', () => {
    setStore({});
    render(<QuestionImportDialog open={true} onOpenChange={vi.fn()} />);
    expect(screen.getByText(/Department, Risk Category, Question/)).toBeInTheDocument();
  });
});
