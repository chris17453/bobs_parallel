import { Box, IconButton, Paper, Slider, Stack, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import { usePlayer } from '../player/PlayerContext';
import Visualizer from './Visualizer';

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Persistent now-playing bar fixed above the bottom nav. Single audio source for
 * the app (SPEC-frontend). Hidden entirely when nothing is playing.
 */
export default function MiniPlayer() {
  const { current, isPlaying, muted, position, duration, toggle, seek, setMuted } = usePlayer();

  if (!current) return null;

  const max = duration > 0 ? duration : 30; // 30s preview default before metadata loads

  return (
    <Paper
      elevation={6}
      square
      sx={{
        flex: '0 0 auto',
        position: 'relative',
        // Sits above the bottom nav (which follows it in the flex column).
        pb: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 1.5, pt: 1 }}>
        {/* Album art */}
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1.5,
            flex: '0 0 auto',
            bgcolor: 'action.hover',
            backgroundImage: current.image_url ? `url(${current.image_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Title + subtitle */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="subtitle2" noWrap fontWeight={700}>
            {current.title}
          </Typography>
          {current.subtitle && (
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {current.subtitle}
            </Typography>
          )}
        </Box>

        {/* Visualizer */}
        <Box sx={{ width: 96, flex: '0 0 auto', display: { xs: 'none', sm: 'block' } }}>
          <Visualizer />
        </Box>

        {/* Mute */}
        <IconButton
          onClick={() => setMuted(!muted)}
          aria-label={muted ? 'Unmute' : 'Mute'}
          aria-pressed={muted}
          sx={{ minWidth: 44, minHeight: 44, flex: '0 0 auto' }}
        >
          {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
        </IconButton>

        {/* Play / pause */}
        <IconButton
          onClick={toggle}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          color="primary"
          sx={{ minWidth: 44, minHeight: 44, flex: '0 0 auto' }}
        >
          {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Stack>

      {/* Scrubber */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, pb: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ width: 32, textAlign: 'right' }}>
          {fmt(position)}
        </Typography>
        <Slider
          size="small"
          aria-label="Seek"
          min={0}
          max={max}
          value={Math.min(position, max)}
          onChange={(_e, value) => seek(typeof value === 'number' ? value : value[0])}
          sx={{ flex: 1, py: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ width: 32 }}>
          {fmt(max)}
        </Typography>
      </Stack>
    </Paper>
  );
}
