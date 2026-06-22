import { Box, CircularProgress, Drawer, List, Typography } from '@mui/material';
import UserRow from './UserRow';
import { useFollowList, type FollowListKind } from '../hooks/useFollowList';

interface Props {
  userId: string;
  kind: FollowListKind;
  open: boolean;
  onClose: () => void;
}

/**
 * Bottom drawer listing a user's followers or following. Reuses UserRow
 * (avatar + name + follow/unfollow). Mirrors CommentsSheet's style.
 */
export default function FollowListSheet({ userId, kind, open, onClose }: Props) {
  const { data, isLoading } = useFollowList(userId, kind, open);

  const users = data?.users ?? [];
  const title = kind === 'followers' ? 'Followers' : 'Following';
  const emptyText = kind === 'followers' ? 'No followers yet' : 'Not following anyone yet';

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
          {title}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : users.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 4 }}
          >
            {emptyText}
          </Typography>
        ) : (
          <List disablePadding>
            {users.map((u) => (
              <UserRow key={u.id} user={u} onNavigate={onClose} />
            ))}
          </List>
        )}
      </Box>
    </Drawer>
  );
}
