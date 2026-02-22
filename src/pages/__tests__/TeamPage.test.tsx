import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamPage } from '../TeamPage';
import type { Store } from '@/store-types';

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    currentUser: {
      id: 'u1',
      name: 'Admin User',
      email: 'admin@test.com',
      role: 'admin',
      avatarColor: '#000',
    },
    orgId: 'org1',
    orgRole: 'admin',
    users: [
      {
        id: 'u1',
        name: 'Admin User',
        email: 'admin@test.com',
        role: 'admin',
        avatarColor: '#000',
      },
      {
        id: 'u2',
        name: 'Regular User',
        email: 'user@test.com',
        role: 'user',
        avatarColor: '#111',
      },
    ],
    invitations: [],
    inviteUser: vi.fn(),
    updateUserRole: vi.fn(),
    removeInvitation: vi.fn(),
    setUserActive: vi.fn(),
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

describe('TeamPage', () => {
  it('renders user list with names and emails', () => {
    setStore({});
    render(<TeamPage />);

    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin@test.com')).toBeInTheDocument();
    expect(screen.getByText('Regular User')).toBeInTheDocument();
    expect(screen.getByText('user@test.com')).toBeInTheDocument();
  });

  it('shows "You" badge next to current user', () => {
    setStore({});
    render(<TeamPage />);

    expect(screen.getByText('You')).toBeInTheDocument();
    // The "You" badge should be near the current user's name
    const adminName = screen.getByText('Admin User');
    const nameRow = adminName.closest('div')!;
    expect(within(nameRow).getByText('You')).toBeInTheDocument();
  });

  it('admin sees Invite button', () => {
    setStore({});
    render(<TeamPage />);

    expect(screen.getByRole('button', { name: /invite/i })).toBeInTheDocument();
  });

  it('non-admin does not see Invite button', () => {
    setStore({
      currentUser: {
        id: 'u2',
        name: 'Regular User',
        email: 'user@test.com',
        role: 'user',
        avatarColor: '#111',
      },
      orgRole: 'user',
    });
    render(<TeamPage />);

    expect(screen.queryByRole('button', { name: /invite/i })).not.toBeInTheDocument();
  });

  it('shows Deactivate button for non-self users when admin', () => {
    setStore({});
    render(<TeamPage />);

    expect(screen.getByRole('button', { name: /deactivate/i })).toBeInTheDocument();
  });

  it('does not show Deactivate button for own user', () => {
    setStore({
      users: [
        {
          id: 'u1',
          name: 'Admin User',
          email: 'admin@test.com',
          role: 'admin',
          avatarColor: '#000',
        },
      ],
    });
    render(<TeamPage />);

    // Only one user (self) so no deactivate button should exist
    expect(screen.queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument();
  });

  it('clicking Deactivate calls setUserActive(userId, false)', async () => {
    const setUserActive = vi.fn().mockResolvedValue(undefined);
    setStore({ setUserActive });
    const user = userEvent.setup();

    render(<TeamPage />);

    await user.click(screen.getByRole('button', { name: /deactivate/i }));

    // Active user: isInactive = false, so setUserActive is called with (userId, false)
    expect(setUserActive).toHaveBeenCalledWith('u2', false);
  });

  it('deactivated user shows "Inactive" badge', () => {
    setStore({
      users: [
        {
          id: 'u1',
          name: 'Admin User',
          email: 'admin@test.com',
          role: 'admin',
          avatarColor: '#000',
        },
        {
          id: 'u2',
          name: 'Regular User',
          email: 'user@test.com',
          role: 'user',
          avatarColor: '#111',
          active: false,
        },
      ],
    });
    render(<TeamPage />);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('clicking Reactivate on inactive user calls setUserActive(userId, true)', async () => {
    const setUserActive = vi.fn().mockResolvedValue(undefined);
    setStore({
      setUserActive,
      users: [
        {
          id: 'u1',
          name: 'Admin User',
          email: 'admin@test.com',
          role: 'admin',
          avatarColor: '#000',
        },
        {
          id: 'u2',
          name: 'Regular User',
          email: 'user@test.com',
          role: 'user',
          avatarColor: '#111',
          active: false,
        },
      ],
    });
    const user = userEvent.setup();

    render(<TeamPage />);

    await user.click(screen.getByRole('button', { name: /reactivate/i }));

    // Inactive user: isInactive = true, so setUserActive is called with (userId, true)
    expect(setUserActive).toHaveBeenCalledWith('u2', true);
  });

  it('shows pending invitations section when invitations exist', () => {
    setStore({
      invitations: [
        {
          id: 'inv1',
          email: 'pending@test.com',
          role: 'user',
          status: 'pending',
          createdAt: '2026-01-15T00:00:00Z',
        },
      ],
    });
    render(<TeamPage />);

    expect(screen.getByText('Pending invitations')).toBeInTheDocument();
    expect(screen.getByText('pending@test.com')).toBeInTheDocument();
  });

  it('non-admin does not see role selectors or deactivate buttons', () => {
    setStore({
      currentUser: {
        id: 'u2',
        name: 'Regular User',
        email: 'user@test.com',
        role: 'user',
        avatarColor: '#111',
      },
      orgRole: 'user',
    });
    render(<TeamPage />);

    // No deactivate buttons
    expect(screen.queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reactivate/i })).not.toBeInTheDocument();
    // Role badges should show as static text, not as selectors
    // Both users should have static role badges (Admin, User) instead of dropdowns
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
  });
});
