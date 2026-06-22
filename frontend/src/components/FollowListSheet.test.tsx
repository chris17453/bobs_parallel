import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import FollowListSheet from './FollowListSheet';
import type { User } from '../api/types';
import { renderWithProviders } from '../test/utils';
import { installFetchMock } from '../test/fetchMock';

const ME = { id: 'u1', display_name: 'Me', avatar_url: null };

const followers: User[] = [
  { id: 'u2', display_name: 'Alice', avatar_url: null, is_following: false },
  { id: 'u3', display_name: 'Bob', avatar_url: null, is_following: true },
];

/** Seed an authenticated session: cache + /api/me confirmation. */
function authedRoutes(extra: Record<string, unknown> = {}) {
  localStorage.setItem('parallel.auth', JSON.stringify(ME));
  return installFetchMock({
    'GET /api/me': { user: ME },
    ...extra,
  });
}

describe('FollowListSheet', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the stubbed followers list via UserRow', async () => {
    authedRoutes({
      'GET /api/users/u9/followers': { users: followers },
    });
    renderWithProviders(
      <FollowListSheet userId="u9" kind="followers" open onClose={() => {}} />,
    );

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Followers')).toBeInTheDocument();
  });

  it('shows the empty state when there are no followers', async () => {
    authedRoutes({
      'GET /api/users/u9/followers': { users: [] },
    });
    renderWithProviders(
      <FollowListSheet userId="u9" kind="followers" open onClose={() => {}} />,
    );

    expect(await screen.findByText('No followers yet')).toBeInTheDocument();
  });

  it('shows the following empty state', async () => {
    authedRoutes({
      'GET /api/users/u9/following': { users: [] },
    });
    renderWithProviders(
      <FollowListSheet userId="u9" kind="following" open onClose={() => {}} />,
    );

    expect(await screen.findByText('Not following anyone yet')).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
  });
});
