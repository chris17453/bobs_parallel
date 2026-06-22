import { useEffect, useRef } from 'react';
import { useTheme } from '@mui/material';
import { usePlayer } from '../player/PlayerContext';

/**
 * Canvas frequency-bar visualizer in the cyan accent.
 *
 * Audio is streamed through our same-origin /api/audio proxy, so it's CORS-clean and the
 * Web Audio AnalyserNode can read REAL frequency data. When the analyser is unavailable
 * (jsdom) or momentarily silent, we fall back to a deterministic playback-synced animation
 * so the bars always look alive. Web Audio failures degrade gracefully — never throw.
 */
interface Graph {
  ctx: AudioContext;
  analyser: AnalyserNode;
  source: MediaElementAudioSourceNode;
}

// A MediaElementAudioSourceNode may be created only ONCE per element, and browsers cap
// the number of AudioContexts — so cache the graph in module scope keyed by the element.
let sharedGraph: Graph | null = null;
let sharedFor: HTMLAudioElement | null = null;

type AudioContextCtor = typeof AudioContext;

function getCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  return (window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ||
    null) as AudioContextCtor | null;
}

function ensureGraph(audio: HTMLAudioElement): Graph | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  if (sharedGraph && sharedFor === audio) {
    if (sharedGraph.ctx.state === 'suspended') void sharedGraph.ctx.resume();
    return sharedGraph;
  }
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
    return null; // already-created / Web Audio unhappy → use the fallback
  }
}

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

  const isPlayingRef = useRef(isPlaying);
  const positionRef = useRef(position);
  isPlayingRef.current = isPlaying;
  positionRef.current = position;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

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

      // Real FFT when the analyser has signal.
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
          // Deterministic, time-driven wave (smooth, non-flaky).
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
