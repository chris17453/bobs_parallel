import { useEffect, useRef, useState } from 'react';
import { Box, Chip, IconButton, Stack, Typography } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ShareIcon from '@mui/icons-material/Share';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import type { FeedItem } from '../api/types';
import { useLike } from '../hooks/useLike';
import { useShare } from '../hooks/useShare';
import CommentsSheet from './CommentsSheet';

interface Props {
  item: FeedItem;
  /** True when this card is the active/in-view card. */
  active: boolean;
}

/**
 * One full-viewport card. Background image; muted autoplay <audio> of preview_url
 * that plays ONLY when active and pauses off-screen. Tap toggles mute. Like button
 * is optimistic with rollback (handled by useLike).
 */
export default function FeedCard({ item, active }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const like = useLike();
  const share = useShare();

  // The cache patch flows back via props when this card is rendered inside the
  // feed list. For standalone use, fall back to the in-flight/last mutation so the
  // optimistic state is always reflected on the card itself.
  const baseLiked = item.liked ?? false;
  const liked =
    like.data?.item.id === item.id
      ? (like.data.item.liked ?? baseLiked)
      : like.isPending && like.variables?.itemId === item.id
        ? like.variables.liked
        : baseLiked;
  const likeCount =
    like.data?.item.id === item.id
      ? like.data.item.like_count
      : like.isPending && like.variables?.itemId === item.id
        ? Math.max(0, item.like_count + (like.variables.liked ? 1 : -1))
        : item.like_count;

  // Mirror the optimistic share state for standalone use (see liked above).
  const baseShared = item.shared ?? false;
  const shared =
    share.data?.item_id === item.id
      ? share.data.shared
      : share.isPending && share.variables?.itemId === item.id
        ? true
        : baseShared;
  const shareCount =
    share.data?.item_id === item.id
      ? share.data.share_count
      : share.isPending && share.variables?.itemId === item.id && !baseShared
        ? item.share_count + 1
        : item.share_count;

  // Play only the active card; pause everything else. Start muted (mobile autoplay, N1).
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (active && item.preview_url) {
      audio.muted = muted;
      audio.play().catch(() => {
        // Autoplay rejected — stays paused until user interacts.
      });
    } else {
      audio.pause();
      audio.currentTime = 0;
      if (!active) setMuted(true);
    }
  }, [active, item.preview_url, muted]);

  const toggleMute = () => {
    if (!item.preview_url) return;
    setMuted((m) => !m);
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    like.mutate({ itemId: item.id, liked: !liked });
  };

  const openComments = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCommentsOpen(true);
  };

  const doShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Offer the OS share sheet when available, but always record the share.
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      void navigator
        .share({
          title: item.title,
          text: item.subtitle ?? item.title,
          url: item.spotify_url ?? undefined,
        })
        .catch(() => {
          // User dismissed or unsupported payload — ignore.
        });
    }
    share.mutate({ itemId: item.id });
  };

  return (
    <Box
      onClick={toggleMute}
      sx={{
        position: 'relative',
        height: '100%',
        width: '100%',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        flex: '0 0 100%',
        overflow: 'hidden',
        cursor: item.preview_url ? 'pointer' : 'default',
        bgcolor: '#000',
        backgroundImage: item.image_url ? `url(${item.image_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        userSelect: 'none',
      }}
    >
      {/* Readability gradient */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {item.preview_url && (
        <audio ref={audioRef} src={item.preview_url} loop muted={muted} preload="none" />
      )}

      {/* Top-left: kind chip + mute state */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ position: 'absolute', top: 16, left: 16, alignItems: 'center' }}
      >
        <Chip
          label={item.kind}
          size="small"
          color="primary"
          sx={{ textTransform: 'capitalize', fontWeight: 600 }}
        />
        {item.preview_url && (muted ? <VolumeOffIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />)}
      </Stack>

      {/* Bottom info + actions */}
      <Stack
        direction="row"
        alignItems="flex-end"
        justifyContent="space-between"
        sx={{ position: 'absolute', left: 16, right: 16, bottom: 96, color: '#fff' }}
      >
        <Box sx={{ minWidth: 0, pr: 2 }}>
          <Typography variant="h5" fontWeight={700} noWrap>
            {item.title}
          </Typography>
          {item.subtitle && (
            <Typography variant="body1" sx={{ opacity: 0.85 }} noWrap>
              {item.subtitle}
            </Typography>
          )}
        </Box>

        <Stack alignItems="center" spacing={1.5}>
          <Stack alignItems="center" spacing={0.5}>
            <IconButton
              onClick={toggleLike}
              aria-label={liked ? 'Unlike' : 'Like'}
              aria-pressed={liked}
              sx={{ color: liked ? 'secondary.main' : '#fff', p: 1.5 }}
            >
              {liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
            </IconButton>
            <Typography variant="caption" sx={{ color: '#fff' }}>
              {likeCount}
            </Typography>
          </Stack>

          <Stack alignItems="center" spacing={0.5}>
            <IconButton
              onClick={openComments}
              aria-label="Comments"
              sx={{ color: '#fff', p: 1.5 }}
            >
              <ChatBubbleOutlineIcon />
            </IconButton>
            <Typography variant="caption" sx={{ color: '#fff' }}>
              {item.comment_count}
            </Typography>
          </Stack>

          <Stack alignItems="center" spacing={0.5}>
            <IconButton
              onClick={doShare}
              aria-label="Share"
              aria-pressed={shared}
              sx={{ color: shared ? 'secondary.main' : '#fff', p: 1.5 }}
            >
              {shared ? <ShareIcon /> : <ShareOutlinedIcon />}
            </IconButton>
            <Typography variant="caption" sx={{ color: '#fff' }}>
              {shareCount}
            </Typography>
          </Stack>
        </Stack>
      </Stack>

      <CommentsSheet
        itemId={item.id}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
      />
    </Box>
  );
}
