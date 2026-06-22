import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedCard from './FeedCard';
import type { FeedItem } from '../api/types';
import { renderWithProviders } from '../test/utils';
import { installFetchMock } from '../test/fetchMock';

const item: FeedItem = {
  id: 42,
  spotify_id: 'sp-42',
  kind: 'track',
  title: 'Neon Parallax',
  subtitle: 'The Cyans',
  image_url: 'https://example.test/img.jpg',
  preview_url: 'https://example.test/p.mp3',
  like_count: 7,
  comment_count: 3,
  share_count: 5,
  liked: false,
  shared: false,
};

describe('FeedCard', () => {
  beforeEach(() => {
    localStorage.clear();
    installFetchMock();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('renders the title, subtitle and like count', () => {
    renderWithProviders(<FeedCard item={item} active={false} />);
    expect(screen.getByText('Neon Parallax')).toBeInTheDocument();
    expect(screen.getByText('The Cyans')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders comment and share counts and reflects shared state', () => {
    renderWithProviders(<FeedCard item={item} active={false} />);
    expect(screen.getByText('3')).toBeInTheDocument(); // comment_count
    expect(screen.getByText('5')).toBeInTheDocument(); // share_count

    // Not shared -> button labelled Share, not pressed.
    const shareBtn = screen.getByRole('button', { name: 'Share' });
    expect(shareBtn).toHaveAttribute('aria-pressed', 'false');
  });

  it('marks the share button pressed when the item is already shared', () => {
    renderWithProviders(<FeedCard item={{ ...item, shared: true }} active={false} />);
    expect(screen.getByRole('button', { name: 'Share' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('shows a like button that optimistically increments on click', async () => {
    const fetchStub = installFetchMock({
      'POST /api/items/42/like': () => ({ item: { ...item, liked: true, like_count: 8 } }),
    });
    const user = userEvent.setup();

    renderWithProviders(<FeedCard item={item} active={false} />);
    const likeBtn = screen.getByRole('button', { name: 'Like' });
    expect(likeBtn).toBeInTheDocument();

    await user.click(likeBtn);
    // After optimistic update the button toggles to "Unlike".
    expect(await screen.findByRole('button', { name: 'Unlike' })).toBeInTheDocument();
    expect(fetchStub).toHaveBeenCalled();
  });
});
