import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Must be before component import
const mockNavigate = vi.fn();
const mockLocation = { pathname: '/' };
vi.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet" />,
  NavLink: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
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
    logout: vi.fn(),
    loading: false,
    ...overrides,
  });
}

describe('Layout', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
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

  it('logout button calls logout and navigates to /login', async () => {
    const user = userEvent.setup();
    const logoutFn = vi.fn();
    setStore({ logout: logoutFn });
    render(<Layout />);
    await user.click(screen.getByLabelText('Sign out'));
    expect(logoutFn).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
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
