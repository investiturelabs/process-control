import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '../LoginPage';
import type { Store } from '@/store-types';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockStore: Partial<Store> = {};
vi.mock('@/context', () => ({
  useAppStore: () => mockStore,
}));

function setStore(overrides: Partial<Store>) {
  Object.assign(mockStore, {
    login: vi.fn(),
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginPage', () => {
  it('renders form with name and email inputs', () => {
    setStore({});
    render(<LoginPage />);

    expect(screen.getByLabelText('Full name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('submit button shows "Sign in" text', () => {
    setStore({});
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('submit calls login with trimmed name and lowercase email', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    setStore({ login });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Full name'), '  Alice Jones  ');
    await user.type(screen.getByLabelText('Email'), '  Alice@Company.COM  ');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith('Alice Jones', 'alice@company.com');
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows "Signing in..." during submission', async () => {
    const login = vi.fn().mockReturnValue(new Promise(() => {}));
    setStore({ login });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Full name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@test.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Signing in...' })).toBeDisabled();
  });

  it('shows generic error on login failure', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Network error'));
    setStore({ login });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Full name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@test.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Failed to sign in. Please try again.');
  });

  it('shows "Account deactivated" error when login throws with deactivated message', async () => {
    const login = vi.fn().mockRejectedValue(new Error('User account has been deactivated'));
    setStore({ login });
    const user = userEvent.setup();

    render(<LoginPage />);

    await user.type(screen.getByLabelText('Full name'), 'Alice');
    await user.type(screen.getByLabelText('Email'), 'alice@test.com');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Account deactivated. Contact your administrator.',
    );
  });
});
