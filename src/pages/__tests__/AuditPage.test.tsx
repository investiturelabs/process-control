import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
