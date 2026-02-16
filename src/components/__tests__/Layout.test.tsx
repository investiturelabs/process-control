import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Must be before component import
const mockLocation = { pathname: '/' };
vi.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet" />,
  NavLink: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => mockLocation,
}));

const mockSignOut = vi.fn();
vi.mock('@clerk/clerk-react', () => ({
  useClerk: () => ({ signOut: mockSignOut }),
}));

vi.mock('@/lib/analytics', () => ({ track: vi.fn() }));

vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
}));

import { Layout } from '../Layout';
import type { Store } from '@/store-types';

const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    currentUser: { id: 'u1', name: 'Test User', email: 'test@test.com', role: 'admin', avatarColor: '#3b82f6' },
    company: { id: 'c1', name: 'Test Company' },
    loading: false,
    ...overrides,
  });
}

describe('Layout', () => {
  beforeEach(() => {
    mockSignOut.mockReset();
  });

  it('renders nav links for all pages', () => {
    setStore({});
    render(<Layout />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Audit')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows company name in header', () => {
    setStore({});
    render(<Layout />);
    expect(screen.getByText('Test Company')).toBeInTheDocument();
  });

  it('shows user name and avatar', () => {
    setStore({});
    render(<Layout />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('T')).toBeInTheDocument(); // Avatar fallback
  });

  it('logout button calls signOut', async () => {
    const user = userEvent.setup();
    setStore({});
    render(<Layout />);
    await user.click(screen.getByLabelText('Sign out'));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it('shows loading spinner when loading', () => {
    setStore({ loading: true });
    render(<Layout />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.queryByTestId('outlet')).not.toBeInTheDocument();
  });

  it('shows outlet when not loading', () => {
    setStore({ loading: false });
    render(<Layout />);
    expect(screen.getByTestId('outlet')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });
});
