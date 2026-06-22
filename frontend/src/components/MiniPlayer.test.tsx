import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import MiniPlayer from './MiniPlayer';
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
  like_count: 0,
  comment_count: 0,
  share_count: 0,
};

/** Mounts a track into the player on render, so the MiniPlayer has a current. */
function SeedTrack({ item }: { item: FeedItem }) {
  const { play } = usePlayer();
  useEffect(() => {
    play(item);
  }, [play, item]);
  return null;
}

function renderMini(seed?: FeedItem) {
  return render(
    <ColorModeProvider>
      <PlayerProvider>
        {seed && <SeedTrack item={seed} />}
        <MiniPlayer />
      </PlayerProvider>
    </ColorModeProvider>,
  );
}

describe('MiniPlayer', () => {
  it('is hidden when there is no current track', () => {
    renderMini();
    expect(screen.queryByLabelText('Pause')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Play')).not.toBeInTheDocument();
  });

  it('shows the title and a play/pause control when a track is current', () => {
    act(() => {
      renderMini(track);
    });
    expect(screen.getByText('Visualized Tune')).toBeInTheDocument();
    expect(screen.getByText('The Analysers')).toBeInTheDocument();
    // Optimistically playing → Pause control is shown.
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
  });

  it('mounts the Visualizer canvas without throwing under jsdom (no AudioContext)', () => {
    expect((window as { AudioContext?: unknown }).AudioContext).toBeUndefined();
    act(() => {
      renderMini(track);
    });
    expect(screen.getByTestId('visualizer-canvas')).toBeInTheDocument();
  });
});
