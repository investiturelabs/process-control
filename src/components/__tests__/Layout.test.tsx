import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Must be before component import
const mockLocation = { pathname: '/' };
vi.mock('react-router-dom', () => ({
  Outlet: () => <div data-testid="outlet" />,
  NavLink: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useLocation: () => mockLocation,
}));

vi.mock('@clerk/clerk-react', () => ({
  UserButton: () => <div data-testid="clerk-user-button" />,
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
    orgId: 'org1',
    orgRole: 'admin',
    company: { id: 'c1', name: 'Test Company' },
    loading: false,
    ...overrides,
  });
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('renders Clerk UserButton', () => {
    setStore({});
    render(<Layout />);
    expect(screen.getByTestId('clerk-user-button')).toBeInTheDocument();
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

  it('hides admin nav links for non-admin users', () => {
    setStore({
      currentUser: { id: 'u2', name: 'Regular', email: 'user@test.com', role: 'user', avatarColor: '#000' },
      orgRole: 'user',
    });
    render(<Layout />);
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Audit')).toBeInTheDocument();
    expect(screen.queryByText('Team')).not.toBeInTheDocument();
    expect(screen.queryByText('Questions')).not.toBeInTheDocument();
  });
});
