import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CommentsSheet from './CommentsSheet';
import type { Comment } from '../api/types';
import { renderWithProviders } from '../test/utils';
import { installFetchMock } from '../test/fetchMock';

const ME = { id: 'u1', display_name: 'Me', avatar_url: null };

const existing: Comment[] = [
  {
    id: 1,
    item_id: 42,
    body: 'First!',
    created_at: new Date().toISOString(),
    author: { id: 'u2', display_name: 'Alice', avatar_url: null },
  },
  {
    id: 2,
    item_id: 42,
    body: 'My own thought',
    created_at: new Date().toISOString(),
    author: { id: 'u1', display_name: 'Me', avatar_url: null },
  },
];

/** Seed an authenticated session: cache + /api/me confirmation. */
function authedRoutes(extra: Record<string, unknown> = {}) {
  localStorage.setItem('parallel.auth', JSON.stringify(ME));
  return installFetchMock({
    'GET /api/me': { user: ME },
    'GET /api/items/42/comments': { comments: existing, comment_count: existing.length },
    ...extra,
  });
}

describe('CommentsSheet', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders existing comments from the stubbed response', async () => {
    authedRoutes();
    renderWithProviders(<CommentsSheet itemId={42} open onClose={() => {}} />);

    expect(await screen.findByText('First!')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('My own thought')).toBeInTheDocument();
  });

  it('posts a new comment and shows it with an incremented count', async () => {
    const newComment: Comment = {
      id: 3,
      item_id: 42,
      body: 'Nice track',
      created_at: new Date().toISOString(),
      author: { id: 'u1', display_name: 'Me', avatar_url: null },
    };
    const fetchStub = authedRoutes({
      'POST /api/items/42/comments': () => ({
        comment: newComment,
        comment_count: existing.length + 1,
      }),
    });
    const user = userEvent.setup();

    renderWithProviders(<CommentsSheet itemId={42} open onClose={() => {}} />);
    await screen.findByText('First!');

    await user.type(screen.getByLabelText('Add a comment'), 'Nice track');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(await screen.findByText('Nice track')).toBeInTheDocument();
    // Header count reflects the server's comment_count (3 -> ... shows total).
    expect(screen.getByText(/Comments \(3\)/)).toBeInTheDocument();
    expect(
      fetchStub.mock.calls.some(
        ([url, init]) =>
          String(url).endsWith('/api/items/42/comments') &&
          (init?.method ?? 'GET').toUpperCase() === 'POST',
      ),
    ).toBe(true);
  });

  it('shows a delete affordance only on the current user’s own comment', async () => {
    authedRoutes();
    renderWithProviders(<CommentsSheet itemId={42} open onClose={() => {}} />);

    const ownComment = (await screen.findByText('My own thought')).closest('li')!;
    expect(
      within(ownComment).getByRole('button', { name: 'Delete comment' }),
    ).toBeInTheDocument();

    const otherComment = screen.getByText('First!').closest('li')!;
    expect(
      within(otherComment).queryByRole('button', { name: 'Delete comment' }),
    ).toBeNull();
  });
});
