import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import NowPlayingScreen from './NowPlayingScreen';
import { PlayerProvider, usePlayer } from '../player/PlayerContext';
import { ColorModeProvider } from '../theme/ColorModeContext';
import type { FeedItem } from '../api/types';

const track: FeedItem = {
  id: 99,
  spotify_id: 'sp-99',
  kind: 'track',
  title: 'Visualized Tune',
  subtitle: 'The Analysers',
  image_url: 'https://example.test/art.jpg',
  preview_url: 'https://example.test/p.mp3',
  like_count: 3,
  comment_count: 0,
  share_count: 1,
};

/** Mounts a track into the player on render, so the screen has a current. */
function SeedTrack({ item }: { item: FeedItem }) {
  const { play } = usePlayer();
  useEffect(() => {
    play(item);
  }, [play, item]);
  return null;
}

function renderScreen(seed?: FeedItem) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ColorModeProvider>
        <MemoryRouter>
          <PlayerProvider>
            {seed && <SeedTrack item={seed} />}
            <NowPlayingScreen open onClose={() => {}} />
          </PlayerProvider>
        </MemoryRouter>
      </ColorModeProvider>
    </QueryClientProvider>,
  );
}

describe('NowPlayingScreen', () => {
  it('renders nothing when there is no current track', () => {
    renderScreen();
    expect(screen.queryByText('Now Playing')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Pause')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Play')).not.toBeInTheDocument();
  });

  it('shows the title, transport control and time labels for the current track', () => {
    act(() => {
      renderScreen(track);
    });
    expect(screen.getByText('Visualized Tune')).toBeInTheDocument();
    expect(screen.getByText('The Analysers')).toBeInTheDocument();
    // Optimistically playing → a Pause control is shown.
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
    // Elapsed and remaining time labels (mm:ss; remaining as -mm:ss).
    expect(screen.getByText('0:00')).toBeInTheDocument();
    expect(screen.getByText('-0:30')).toBeInTheDocument();
  });

  it('mounts the Visualizer canvas without throwing under jsdom (no AudioContext)', () => {
    expect((window as { AudioContext?: unknown }).AudioContext).toBeUndefined();
    act(() => {
      renderScreen(track);
    });
    expect(screen.getByTestId('visualizer-canvas')).toBeInTheDocument();
  });
});
