import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { renderWithProviders } from '../test/utils';
import { installFetchMock } from '../test/fetchMock';

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear();
    installFetchMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the bottom navigation with all four tabs', async () => {
    renderWithProviders(<App />, { route: '/' });

    // BottomNavigation renders four labelled tab buttons.
    expect(await screen.findByText('Feed')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Friends')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('exposes a search field and a menu button', () => {
    renderWithProviders(<App />, { route: '/' });
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Open menu')).toBeInTheDocument();
  });

  it('flips the theme mode from the drawer toggle', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/' });

    await user.click(screen.getByLabelText('Open menu'));
    const toggle = await screen.findByLabelText('Toggle dark mode');

    // default is dark
    expect(toggle).toBeChecked();
    expect(localStorage.getItem('parallel.theme')).not.toBe('light');

    await user.click(toggle);
    expect(localStorage.getItem('parallel.theme')).toBe('light');
    expect(toggle).not.toBeChecked();
  });

  it('hides the bottom nav on the auth route', async () => {
    renderWithProviders(<App />, { route: '/login' });
    expect(screen.queryByText('Friends')).not.toBeInTheDocument();
    expect(await screen.findByText('Continue with Spotify')).toBeInTheDocument();
  });

  it('shows the unread badge count from the stubbed unread-count response', async () => {
    const ME = { id: 'u1', display_name: 'Me', avatar_url: null };
    localStorage.setItem('parallel.auth', JSON.stringify(ME));
    installFetchMock({
      'GET /api/me': { user: ME },
      'GET /api/notifications/unread-count': { unread_count: 3 },
    });

    renderWithProviders(<App />, { route: '/' });

    const bell = await screen.findByLabelText('Notifications');
    expect(await within(bell).findByText('3')).toBeInTheDocument();
  });
});
