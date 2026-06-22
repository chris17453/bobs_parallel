import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material';
import { usePlayer } from '../player/PlayerContext';

/**
 * Web Audio graph shared across the whole app. Browsers cap the number of
 * AudioContexts and a MediaElementAudioSourceNode may be created only ONCE per
 * media element, so we cache both keyed by the audio element.
 */
interface Graph {
  ctx: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
}

let sharedGraph: Graph | null = null;
let sharedFor: HTMLAudioElement | null = null;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  return (window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ||
    null) as AudioContextCtor | null;
}

/**
 * Lazily build (or reuse) the shared graph for this audio element. Must be
 * called from a user-gesture-adjacent path so the context can resume.
 * Returns null when Web Audio is unavailable (e.g. jsdom) or wiring fails.
 */
function ensureGraph(audio: HTMLAudioElement): Graph | null {
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;

  if (sharedGraph && sharedFor === audio) {
    if (sharedGraph.ctx.state === 'suspended') void sharedGraph.ctx.resume();
    return sharedGraph;
  }

  // The element changed (shouldn't happen — element is stable) or first run.
  try {
    const ctx = new Ctor();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    if (ctx.state === 'suspended') void ctx.resume();
    sharedGraph = { ctx, analyser, source };
    sharedFor = audio;
    return sharedGraph;
  } catch {
    // createMediaElementSource throws if already created for this element, or
    // Web Audio is otherwise unhappy. Degrade gracefully to the fallback.
    return null;
  }
}

/**
 * Canvas frequency-bar visualizer in the cyan accent. Uses AnalyserNode FFT data
 * when the stream is CORS-readable; otherwise (or under jsdom) falls back to a
 * deterministic, playback-synced bar animation so it always looks alive.
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
  const { audioEl, isPlaying, position } = usePlayer();
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

    // Try to wire up Web Audio; null means use the fallback animation only.
    const graph = audioEl ? ensureGraph(audioEl) : null;
    const freq = graph ? new Uint8Array(graph.analyser.frequencyBinCount) : null;

    let mounted = true;

    const draw = (now: number) => {
      if (!mounted) return;
      const w = canvas.width;
      const h = canvas.height;
      ctx2d.clearRect(0, 0, w, h);

      const playing = isPlayingRef.current;
      const gap = 2;
      const barW = Math.max(1, (w - gap * (bars - 1)) / bars);

      // Read real FFT data when available.
      let analyserAlive = false;
      if (graph && freq) {
        graph.analyser.getByteFrequencyData(freq);
        for (let i = 0; i < freq.length; i++) {
          if (freq[i] !== 0) {
            analyserAlive = true;
            break;
          }
        }
      }

      ctx2d.fillStyle = accent;
      for (let i = 0; i < bars; i++) {
        let level: number; // 0..1
        if (analyserAlive && freq) {
          const idx = Math.floor((i / bars) * freq.length);
          level = freq[idx] / 255;
        } else if (playing) {
          // CORS-tainted (all-zero) or no analyser: deterministic, time-driven
          // wave so it animates smoothly and is non-flaky (no Math.random/frame).
          const t = now / 1000 + positionRef.current;
          const phase = (i / bars) * Math.PI * 2;
          const wave =
            Math.sin(t * 3 + phase) * 0.5 +
            Math.sin(t * 1.7 + phase * 2) * 0.3 +
            Math.sin(t * 5.1 + phase * 0.5) * 0.2;
          level = 0.15 + (wave + 1) / 2 * 0.7;
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
    // accent/bars are stable enough; audioEl is stable for app lifetime.
  }, [audioEl, accent, bars]);

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
