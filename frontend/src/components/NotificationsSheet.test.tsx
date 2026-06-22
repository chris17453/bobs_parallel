import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import NotificationsSheet from './NotificationsSheet';
import type { Notification } from '../api/types';
import { renderWithProviders } from '../test/utils';
import { installFetchMock } from '../test/fetchMock';

const ME = { id: 'u1', display_name: 'Me', avatar_url: null };

const follow: Notification = {
  id: 1,
  kind: 'follow',
  read: false,
  created_at: new Date().toISOString(),
  actor: { id: 'u2', display_name: 'Alice', avatar_url: null },
};

/** Seed an authenticated session: cache + /api/me confirmation. */
function authedRoutes(extra: Record<string, unknown> = {}) {
  localStorage.setItem('parallel.auth', JSON.stringify(ME));
  return installFetchMock({
    'GET /api/me': { user: ME },
    ...extra,
  });
}

describe('NotificationsSheet', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders a follow notification as "<name> started following you"', async () => {
    authedRoutes({
      'GET /api/notifications': { notifications: [follow], unread_count: 1 },
    });
    renderWithProviders(<NotificationsSheet open onClose={() => {}} />);

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText(/started following you/)).toBeInTheDocument();
  });

  it('shows the empty state when there are no notifications', async () => {
    authedRoutes({
      'GET /api/notifications': { notifications: [], unread_count: 0 },
    });
    renderWithProviders(<NotificationsSheet open onClose={() => {}} />);

    expect(await screen.findByText('No notifications yet')).toBeInTheDocument();
  });
});
