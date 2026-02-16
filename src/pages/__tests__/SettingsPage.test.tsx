import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsPage } from '../SettingsPage';
import type { Store } from '@/store-types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));
vi.mock('@/lib/errorTracking', () => ({ captureException: vi.fn() }));
vi.mock('@/lib/backup', () => ({
  createBackup: vi.fn(() => ({ version: 1 })),
  downloadBackup: vi.fn(),
}));

const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

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
    departments: [],
    users: [],
    sessions: [],
    invitations: [],
    setCompany: vi.fn(),
    generateTestData: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it('View activity log button navigates to /activity', async () => {
    setStore({});
    const user = userEvent.setup();
    render(<SettingsPage />);

    const activityButton = screen.getByRole('button', {
      name: /view activity log/i,
    });
    await user.click(activityButton);

    expect(mockNavigate).toHaveBeenCalledWith('/activity');
  });
});
