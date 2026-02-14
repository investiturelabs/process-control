import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '../SettingsPage';
import type { Store } from '@/store-types';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/components/DeptIcon', () => ({
  DeptIcon: ({ name }: { name: string }) => <span data-testid="dept-icon">{name}</span>,
  DEPT_ICON_NAMES: ['Building2', 'ShoppingCart', 'Beef'],
}));
vi.mock('@/lib/export', () => ({
  exportQuestionsCsv: vi.fn(),
}));
vi.mock('@/lib/backup', () => ({
  createBackup: vi.fn(() => ({ version: 1 })),
  downloadBackup: vi.fn(),
}));
vi.mock('@/components/QuestionImportDialog', () => ({
  QuestionImportDialog: ({ open }: { open: boolean }) =>
    open ? <div data-testid="import-dialog">Import Dialog</div> : null,
}));
// Mock QuestionFormDialog to avoid complex rendering
vi.mock('@/components/QuestionFormDialog', () => ({
  QuestionFormDialog: () => null,
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
      {
        id: 'q1',
        departmentId: 'dept-1',
        riskCategory: 'Safety',
        text: 'Is oven clean?',
        criteria: '',
        answerType: 'yes_no' as const,
        pointsYes: 5,
        pointsPartial: 0,
        pointsNo: 0,
      },
    ],
  },
  {
    id: 'dept-2',
    name: 'Deli',
    icon: 'ShoppingCart',
    questions: [],
  },
];

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    currentUser: {
      id: 'u1',
      name: 'Admin',
      email: 'admin@test.com',
      role: 'admin',
      avatarColor: '#000',
    },
    company: { id: 'c1', name: 'Test Co', logoUrl: '' },
    departments: testDepts,
    users: [],
    sessions: [],
    invitations: [],
    setCompany: vi.fn(),
    updateDepartments: vi.fn(),
    addQuestion: vi.fn(),
    updateQuestion: vi.fn(),
    removeQuestion: vi.fn(),
    addDepartment: vi.fn(),
    updateDepartment: vi.fn(),
    removeDepartment: vi.fn(),
    generateTestData: vi.fn(),
    duplicateDepartment: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset mockStore to empty so each test starts fresh via setStore
  for (const key of Object.keys(mockStore)) {
    delete (mockStore as Record<string, unknown>)[key];
  }
});

describe('SettingsPage', () => {
  it('non-admin sees "Only admins can modify settings." message', () => {
    setStore({
      currentUser: {
        id: 'u2',
        name: 'Regular',
        email: 'user@test.com',
        role: 'user',
        avatarColor: '#111',
      },
    });
    render(<SettingsPage />);

    expect(
      screen.getByText('Only admins can modify settings.'),
    ).toBeInTheDocument();
  });

  it('non-admin sees company name if company exists', () => {
    setStore({
      currentUser: {
        id: 'u2',
        name: 'Regular',
        email: 'user@test.com',
        role: 'user',
        avatarColor: '#111',
      },
      company: { id: 'c1', name: 'Test Co', logoUrl: '' },
    });
    render(<SettingsPage />);

    expect(screen.getByText('Test Co')).toBeInTheDocument();
  });

  it('admin sees company form with name input', () => {
    setStore({});
    render(<SettingsPage />);

    const nameInput = screen.getByLabelText('Company name');
    expect(nameInput).toBeInTheDocument();
    expect(nameInput).toHaveValue('Test Co');
  });

  it('company name validation shows error for empty name', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SettingsPage />);

    const nameInput = screen.getByLabelText('Company name');
    await user.clear(nameInput);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Company name is required.',
    );
  });

  it('logo URL validation shows error for non-https URL', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SettingsPage />);

    const logoInput = screen.getByLabelText(/logo url/i);
    await user.type(logoInput, 'http://example.com/logo.png');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Logo URL must start with https://',
    );
  });

  it('department list renders with correct names and question counts', () => {
    setStore({});
    render(<SettingsPage />);

    expect(screen.getByText('Bakery')).toBeInTheDocument();
    expect(screen.getByText('(1 questions)')).toBeInTheDocument();
    expect(screen.getByText('Deli')).toBeInTheDocument();
    expect(screen.getByText('(0 questions)')).toBeInTheDocument();
  });

  it('clicking duplicate button calls duplicateDepartment', async () => {
    const duplicateDepartment = vi.fn().mockResolvedValue('new-dept-id');
    setStore({ duplicateDepartment });
    const user = userEvent.setup();
    render(<SettingsPage />);

    // The duplicate (Copy) buttons are icon-only buttons inside summary elements.
    // Each department summary has 3 icon buttons: Pencil, Copy, Trash.
    // We get all buttons and find the ones that are icon-only (size="icon") within
    // the department list area. The Copy buttons are the 2nd icon button per dept.
    // Approach: find the Bakery summary, then locate the copy button near it.
    const bakeryText = screen.getByText('Bakery');
    const summaryEl = bakeryText.closest('summary')!;
    const buttonsInSummary = within(summaryEl).getAllByRole('button');
    // Buttons in summary: Pencil (edit), Copy (duplicate), Trash (delete)
    const copyButton = buttonsInSummary[1]; // Copy is the second button
    await user.click(copyButton);

    expect(duplicateDepartment).toHaveBeenCalledWith('dept-1');
  });

  it('Export CSV button calls exportQuestionsCsv', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SettingsPage />);

    const { exportQuestionsCsv } = await import('@/lib/export');

    const exportButton = screen.getByRole('button', { name: /export csv/i });
    await user.click(exportButton);

    expect(exportQuestionsCsv).toHaveBeenCalledWith(testDepts);
  });

  it('Import CSV button opens import dialog', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SettingsPage />);

    // Confirm dialog is not open initially
    expect(screen.queryByTestId('import-dialog')).not.toBeInTheDocument();

    const importButton = screen.getByRole('button', { name: /import csv/i });
    await user.click(importButton);

    expect(screen.getByTestId('import-dialog')).toBeInTheDocument();
  });

  it('Export backup button calls downloadBackup', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SettingsPage />);

    const { createBackup, downloadBackup } = await import('@/lib/backup');

    const backupButton = screen.getByRole('button', { name: /export backup/i });
    await user.click(backupButton);

    expect(createBackup).toHaveBeenCalled();
    expect(downloadBackup).toHaveBeenCalled();
  });

  it('Generate test data button calls generateTestData', async () => {
    const generateTestData = vi.fn().mockResolvedValue(undefined);
    setStore({ generateTestData });
    const user = userEvent.setup();
    render(<SettingsPage />);

    const genButton = screen.getByRole('button', {
      name: /generate test data/i,
    });
    await user.click(genButton);

    expect(generateTestData).toHaveBeenCalled();
  });

  it('shows "Reset to defaults" button', () => {
    setStore({});
    render(<SettingsPage />);

    expect(
      screen.getByRole('button', { name: /reset to defaults/i }),
    ).toBeInTheDocument();
  });
});
