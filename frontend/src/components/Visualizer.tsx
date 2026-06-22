import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material';
import { usePlayer } from '../player/PlayerContext';

/**
 * Canvas frequency-bar visualizer in the cyan accent.
 *
 * It is a playback-synced animation, NOT a Web Audio AnalyserNode. Preview hosts
 * (soundhelix, Spotify CDN) don't send CORS headers, so the audio element can't be
 * `crossOrigin`; routing such a cross-origin element through `createMediaElementSource`
 * would TAINT and silence it. So we never touch Web Audio here — we animate bars from
 * `isPlaying` + `position` + time. Deterministic (no per-frame Math.random) so it's smooth
 * and never flaky. If a future same-origin audio proxy lands, real FFT can be added back.
 */
export default function Visualizer({
  height = 36,
  bars = 28,
}: {
  height?: number;
  bars?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const theme = useTheme();
  const { isPlaying, position } = usePlayer();
  const accent = theme.palette.primary.main;

  // Keep the latest playback values in refs so the RAF loop reads fresh data
  // without restarting on every position tick.
  const isPlayingRef = useRef(isPlaying);
  const positionRef = useRef(position);
  isPlayingRef.current = isPlaying;
  positionRef.current = position;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    let mounted = true;

    const draw = (now: number) => {
      if (!mounted) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      const playing = isPlayingRef.current;
      const gap = 2;
      const barW = Math.max(1, (w - gap * (bars - 1)) / bars);

      ctx2d.fillStyle = accent;
      for (let i = 0; i < bars; i++) {
        let level: number; // 0..1
        if (playing) {
          // Deterministic, time-driven wave — smooth, non-flaky, looks alive.
          const t = now / 1000 + positionRef.current;
          const phase = (i / bars) * Math.PI * 2;
          const wave =
            Math.sin(t * 3 + phase) * 0.5 +
            Math.sin(t * 1.7 + phase * 2) * 0.3 +
            Math.sin(t * 5.1 + phase * 0.5) * 0.2;
          level = 0.15 + ((wave + 1) / 2) * 0.7;
        } else {
          level = 0.06; // idle resting bars
        }

        const barH = Math.max(2, level * h);
        const x = i * (barW + gap);
        const y = h - barH;
        ctx2d.fillRect(x, y, barW, barH);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    // Only run the RAF loop where it exists (jsdom lacks requestAnimationFrame).
    if (typeof requestAnimationFrame === 'function') {
      rafRef.current = requestAnimationFrame(draw);
    }

    return () => {
      mounted = false;
      if (rafRef.current !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = null;
    };
  }, [accent, bars]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={height}
      aria-hidden
      data-testid="visualizer-canvas"
      style={{ width: '100%', height, display: 'block' }}
    />
  );
}
