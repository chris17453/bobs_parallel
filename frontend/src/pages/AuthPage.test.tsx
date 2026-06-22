import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { renderWithProviders } from '../test/utils';
import { installFetchMock } from '../test/fetchMock';

describe('AuthPage', () => {
  beforeEach(() => {
    localStorage.clear();
    installFetchMock();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the three auth flows: Spotify, log in, and sign up', async () => {
    renderWithProviders(<App />, { route: '/login' });

    expect(await screen.findByText('Continue with Spotify')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sign up' })).toBeInTheDocument();
    // login form fields
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('switches to the signup form revealing a display name field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/login' });

    await user.click(await screen.findByRole('tab', { name: 'Sign up' }));
    expect(await screen.findByLabelText('Display name')).toBeInTheDocument();
  });

  it('forgot-password renders the returned reset URL as a QR code', async () => {
    installFetchMock({
      'POST /auth/reset/request': () => ({ reset_url: 'https://app.test/reset?token=abc123' }),
    });
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/login' });

    await user.click(await screen.findByRole('button', { name: 'Forgot password?' }));
    await user.type(screen.getByLabelText('Username'), 'nova');
    await user.click(screen.getByRole('button', { name: 'Get reset link' }));

    expect(await screen.findByAltText('Password reset QR code')).toBeInTheDocument();
    expect(screen.getByText('https://app.test/reset?token=abc123')).toBeInTheDocument();
  });
});
