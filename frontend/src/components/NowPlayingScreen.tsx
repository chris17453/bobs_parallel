import { Box, Dialog, IconButton, Slide, Slider, Stack, Typography } from '@mui/material';
import { forwardRef } from 'react';
import type { TransitionProps } from '@mui/material/transitions';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import ShareIcon from '@mui/icons-material/Share';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import { usePlayer } from '../player/PlayerContext';
import { useLike } from '../hooks/useLike';
import { useShare } from '../hooks/useShare';
import Visualizer from './Visualizer';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** mm:ss for a non-negative seconds value. */
function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/**
 * Full-screen "Now Playing" view that expands from the MiniPlayer. Layers on the
 * shared PlayerContext (no second audio element) so state stays in sync with the
 * bar. Renders nothing when there is no current track.
 */
export default function NowPlayingScreen({ open, onClose }: Props) {
  const { current, isPlaying, muted, position, duration, toggle, seek, setMuted } = usePlayer();
  const like = useLike();
  const share = useShare();

  if (!current) return null;

  const max = duration > 0 ? duration : 30; // 30s preview default before metadata loads
  const elapsed = Math.min(position, max);
  const remaining = Math.max(0, max - elapsed);

  // Optimistic local reflection of like/share for the current track snapshot,
  // mirroring FeedCard. Tolerates missing counts without crashing.
  const baseLikeCount = current.like_count ?? 0;
  const baseLiked = current.liked ?? false;
  const liked =
    like.data?.item.id === current.id
      ? (like.data.item.liked ?? baseLiked)
      : like.isPending && like.variables?.itemId === current.id
        ? like.variables.liked
        : baseLiked;
  const likeCount =
    like.data?.item.id === current.id
      ? like.data.item.like_count
      : like.isPending && like.variables?.itemId === current.id
        ? Math.max(0, baseLikeCount + (like.variables.liked ? 1 : -1))
        : baseLikeCount;

  const baseShareCount = current.share_count ?? 0;
  const baseShared = current.shared ?? false;
  const shared =
    share.data?.item_id === current.id
      ? share.data.shared
      : share.isPending && share.variables?.itemId === current.id
        ? true
        : baseShared;
  const shareCount =
    share.data?.item_id === current.id
      ? share.data.share_count
      : share.isPending && share.variables?.itemId === current.id && !baseShared
        ? baseShareCount + 1
        : baseShareCount;

  const toggleLike = () => like.mutate({ itemId: current.id, liked: !liked });

  const doShare = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator
        .share({
          title: current.title,
          text: current.subtitle ?? current.title,
          url: current.spotify_url ?? undefined,
        })
        .catch(() => {
          // User dismissed or unsupported payload — ignore.
        });
    }
    share.mutate({ itemId: current.id });
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      aria-label="Now playing"
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
          backgroundImage: 'none',
        },
      }}
    >
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          pt: 'env(safe-area-inset-top, 0px)',
          pb: 'env(safe-area-inset-bottom, 0px)',
          pl: 'env(safe-area-inset-left, 0px)',
          pr: 'env(safe-area-inset-right, 0px)',
        }}
      >
        {/* Top bar with minimize */}
        <Stack
          direction="row"
          alignItems="center"
          sx={{ px: 1, py: 1, flex: '0 0 auto' }}
        >
          <IconButton
            onClick={onClose}
            aria-label="Minimize"
            sx={{ minWidth: 44, minHeight: 44 }}
          >
            <KeyboardArrowDownIcon />
          </IconButton>
          <Typography variant="overline" color="text.secondary" sx={{ flex: 1, textAlign: 'center' }}>
            Now Playing
          </Typography>
          {/* Spacer to keep title centered against the leading icon button. */}
          <Box sx={{ width: 44, height: 44, flex: '0 0 auto' }} />
        </Stack>

        {/* Scrollable content */}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: 3,
            py: 2,
            gap: 3,
          }}
        >
          {/* Album art */}
          <Box
            sx={{
              width: '100%',
              maxWidth: 360,
              aspectRatio: '1 / 1',
              borderRadius: 3,
              bgcolor: 'action.hover',
              backgroundImage: current.image_url ? `url(${current.image_url})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: 6,
              flex: '0 0 auto',
            }}
          />

          {/* Title + subtitle */}
          <Box sx={{ width: '100%', maxWidth: 360, textAlign: 'center', minWidth: 0 }}>
            <Typography variant="h5" fontWeight={700} noWrap>
              {current.title}
            </Typography>
            {current.subtitle && (
              <Typography variant="body1" color="text.secondary" noWrap>
                {current.subtitle}
              </Typography>
            )}
          </Box>

          {/* Large visualizer */}
          <Box sx={{ width: '100%', maxWidth: 360, flex: '0 0 auto' }}>
            <Visualizer height={88} bars={40} />
          </Box>

          {/* Scrubber with elapsed / remaining */}
          <Box sx={{ width: '100%', maxWidth: 360 }}>
            <Slider
              size="small"
              aria-label="Seek"
              min={0}
              max={max}
              value={elapsed}
              onChange={(_e, value) => seek(typeof value === 'number' ? value : value[0])}
              sx={{ py: 1 }}
            />
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {fmt(elapsed)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                -{fmt(remaining)}
              </Typography>
            </Stack>
          </Box>

          {/* Transport + actions */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={3}
            sx={{ width: '100%', maxWidth: 360 }}
          >
            <Stack alignItems="center" spacing={0.25}>
              <IconButton
                onClick={toggleLike}
                aria-label={liked ? 'Unlike' : 'Like'}
                aria-pressed={liked}
                sx={{ color: liked ? 'secondary.main' : 'text.primary', minWidth: 44, minHeight: 44 }}
              >
                {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
              </IconButton>
              <Typography variant="caption" color="text.secondary">
                {likeCount}
              </Typography>
            </Stack>

            <IconButton
              onClick={() => setMuted(!muted)}
              aria-label={muted ? 'Unmute' : 'Mute'}
              aria-pressed={muted}
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              {muted ? <VolumeOffIcon /> : <VolumeUpIcon />}
            </IconButton>

            <IconButton
              onClick={toggle}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              color="primary"
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                width: 64,
                height: 64,
                '&:hover': { bgcolor: 'primary.main' },
              }}
            >
              {isPlaying ? <PauseIcon fontSize="large" /> : <PlayArrowIcon fontSize="large" />}
            </IconButton>

            <Stack alignItems="center" spacing={0.25}>
              <IconButton
                onClick={doShare}
                aria-label="Share"
                aria-pressed={shared}
                sx={{ color: shared ? 'secondary.main' : 'text.primary', minWidth: 44, minHeight: 44 }}
              >
                {shared ? <ShareIcon /> : <ShareOutlinedIcon />}
              </IconButton>
              <Typography variant="caption" color="text.secondary">
                {shareCount}
              </Typography>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Dialog>
  );
}
