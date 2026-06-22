import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  CircularProgress,
  Drawer,
  List,
  ListItemAvatar,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material';
import type { Notification } from '../api/types';
import { useNotifications } from '../hooks/useNotifications';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Format an ISO timestamp as a short relative time ("3m", "2h", "5d"). */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 52) return `${weeks}w`;
  return `${Math.floor(days / 365)}y`;
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: () => void;
}) {
  const { actor, read } = notification;
  return (
    <ListItemButton
      alignItems="flex-start"
      onClick={onOpen}
      sx={{
        bgcolor: read ? 'transparent' : (t) => t.palette.action.selected,
      }}
    >
      <ListItemAvatar>
        <Avatar src={actor.avatar_url ?? undefined} sx={{ width: 36, height: 36 }}>
          {actor.display_name?.[0]?.toUpperCase() ?? '?'}
        </Avatar>
      </ListItemAvatar>
      <Box sx={{ minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
            <Typography component="span" variant="subtitle2" fontWeight={700}>
              {actor.display_name}
            </Typography>{' '}
            started following you
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {relativeTime(notification.created_at)}
          </Typography>
        </Stack>
      </Box>
    </ListItemButton>
  );
}

/**
 * Bottom drawer listing the current user's notifications. Tapping a row
 * navigates to the actor's profile. Mirrors CommentsSheet's style.
 */
export default function NotificationsSheet({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { data, isLoading } = useNotifications(open);

  const notifications = data?.notifications ?? [];

  const openActor = (id: string) => {
    onClose();
    navigate(`/users/${encodeURIComponent(id)}`);
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          height: '70vh',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" fontWeight={700}>
          Notifications
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : notifications.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 4 }}
          >
            No notifications yet
          </Typography>
        ) : (
          <List disablePadding>
            {notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onOpen={() => openActor(n.actor.id)}
              />
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
}
