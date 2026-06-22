import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { FeedItem } from '../api/types';

interface PlayerState {
  current: FeedItem | null;
  isPlaying: boolean;
  muted: boolean;
  position: number;
  duration: number;
}

interface PlayerApi extends PlayerState {
  /** Play an item: loads its preview and plays. Same item resumes. No-op without a preview. */
  play: (item: FeedItem) => void;
  /** Load an item as the current track WITHOUT autoplaying (shows the player, paused). */
  load: (item: FeedItem) => void;
  /** Toggle play/pause for the current track. */
  toggle: () => void;
  /** Seek to a position (seconds) within the preview. */
  seek: (seconds: number) => void;
  setMuted: (muted: boolean) => void;
  /** Stop playback and clear the current track. */
  stop: () => void;
  /** The single shared <audio> element (null until mounted). */
  audioEl: HTMLAudioElement | null;
}

const PlayerContext = createContext<PlayerApi | null>(null);

/**
 * Owns the single <audio> element for the whole app (SPEC-frontend "single source").
 * The in-view feed card drives it via play(); the MiniPlayer gives explicit controls.
 * crossOrigin="anonymous" lets the Visualizer's AnalyserNode read CORS-enabled streams.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<FeedItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMutedState] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Create the audio element once, imperatively, so it lives outside the React
  // tree and survives route changes / re-renders.
  //
  // NOTE: deliberately NO crossOrigin. Preview hosts (soundhelix, Spotify CDN)
  // don't send CORS headers, so crossOrigin="anonymous" makes the browser BLOCK
  // the media fetch entirely (ERR_FAILED) — i.e. no audio at all. Without it the
  // audio plays fine; the Visualizer uses a playback-synced animation rather than
  // routing the (cross-origin) element through Web Audio, which would mute it.
  if (audioRef.current === null && typeof document !== 'undefined') {
    const el = document.createElement('audio');
    el.preload = 'none';
    el.loop = true;
    audioRef.current = el;
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setPosition(audio.currentTime || 0);
    const onDuration = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setPosition(0);
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('playing', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('playing', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  // Keep the element's muted flag in sync with state.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  const play = useCallback(
    (item: FeedItem) => {
      const audio = audioRef.current;
      if (!audio || !item.preview_url) return; // tracks have previews; albums/artists usually don't

      // Same track already loaded → resume (don't restart).
      const sameItem = current?.id === item.id && audio.src === item.preview_url;
      if (!sameItem) {
        setCurrent(item);
        setPosition(0);
        setDuration(0);
        audio.src = item.preview_url;
        audio.load();
      }
      audio.muted = muted;
      // Optimistic: the 'play'/'playing' events confirm, but reflect intent now
      // (jsdom's stubbed play() never fires those events).
      setIsPlaying(true);
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay rejected (policy) — stays paused until a user gesture.
          setIsPlaying(false);
        });
      }
    },
    [current, muted],
  );

  const load = useCallback(
    (item: FeedItem) => {
      const audio = audioRef.current;
      if (!audio || !item.preview_url) return;
      if (current?.id === item.id) return; // already loaded
      setCurrent(item);
      setPosition(0);
      setDuration(0);
      setIsPlaying(false);
      audio.src = item.preview_url;
      audio.load();
    },
    [current],
  );

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (isPlaying) {
      setIsPlaying(false);
      audio.pause();
    } else {
      setIsPlaying(true);
      const p = audio.play();
      if (p && typeof p.catch === 'function') p.catch(() => setIsPlaying(false));
    }
  }, [current, isPlaying]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    audio.currentTime = clamped;
    setPosition(clamped);
  }, []);

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    setCurrent(null);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, []);

  const value = useMemo<PlayerApi>(
    () => ({
      current,
      isPlaying,
      muted,
      position,
      duration,
      play,
      load,
      toggle,
      seek,
      setMuted,
      stop,
      audioEl: audioRef.current,
    }),
    [current, isPlaying, muted, position, duration, play, load, toggle, seek, setMuted, stop],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within a PlayerProvider');
  return ctx;
}
