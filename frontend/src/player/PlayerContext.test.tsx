import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PlayerProvider, usePlayer } from './PlayerContext';
import type { FeedItem } from '../api/types';

const track: FeedItem = {
  id: 1,
  spotify_id: 'sp-1',
  kind: 'track',
  title: 'Test Track',
  subtitle: 'Tester',
  image_url: null,
  preview_url: 'https://example.test/p.mp3',
  like_count: 0,
  comment_count: 0,
  share_count: 0,
};

const album: FeedItem = {
  ...track,
  id: 2,
  spotify_id: 'sp-2',
  kind: 'album',
  title: 'No Preview Album',
  preview_url: null,
};

function wrapper({ children }: { children: ReactNode }) {
  return <PlayerProvider>{children}</PlayerProvider>;
}

describe('PlayerContext', () => {
  it('play(item) sets current and marks playing', () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    expect(result.current.current).toBeNull();

    act(() => result.current.play(track));

    expect(result.current.current?.id).toBe(track.id);
    // jsdom's stubbed play() resolves and we dispatch no 'play' event, so we
    // assert intent via current + that no error was thrown. Trigger the element
    // 'play' event path by toggling.
    expect(result.current.isPlaying).toBe(true);
  });

  it('play on a non-preview item is a no-op', () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => result.current.play(album));
    expect(result.current.current).toBeNull();
    expect(result.current.isPlaying).toBe(false);
  });

  it('toggle pauses and resumes the current track', () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => result.current.play(track));
    expect(result.current.isPlaying).toBe(true);

    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(false);

    act(() => result.current.toggle());
    expect(result.current.isPlaying).toBe(true);
  });

  it('setMuted flips the muted flag', () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    expect(result.current.muted).toBe(true);

    act(() => result.current.setMuted(false));
    expect(result.current.muted).toBe(false);

    act(() => result.current.setMuted(true));
    expect(result.current.muted).toBe(true);
  });

  it('stop clears the current track', () => {
    const { result } = renderHook(() => usePlayer(), { wrapper });
    act(() => result.current.play(track));
    expect(result.current.current).not.toBeNull();

    act(() => result.current.stop());
    expect(result.current.current).toBeNull();
    expect(result.current.isPlaying).toBe(false);
  });
});
