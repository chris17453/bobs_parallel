import { useNavigate } from 'react-router-dom';
import { Avatar, Box, Button, ListItem, ListItemAvatar, ListItemText } from '@mui/material';
import type { User } from '../api/types';
import { useFollow } from '../hooks/useFollow';
import { useAuth } from '../auth/AuthContext';

interface Props {
  user: User;
}

/** Directory/search row: avatar + name + follow/unfollow button. */
export default function UserRow({ user }: Props) {
  const navigate = useNavigate();
  const follow = useFollow();
  const { user: me } = useAuth();

  const isSelf = me?.id === user.id;
  const following = user.is_following ?? false;

  return (
    <ListItem
      secondaryAction={
        isSelf ? null : (
          <Button
            size="small"
            variant={following ? 'outlined' : 'contained'}
            onClick={() => follow.mutate({ userId: user.id, follow: !following })}
            disabled={follow.isPending}
          >
            {following ? 'Following' : 'Follow'}
          </Button>
        )
      }
      disablePadding
      sx={{ '& .MuiListItemSecondaryAction-root': { right: 8 } }}
    >
      <Box
        onClick={() => navigate(`/users/${encodeURIComponent(user.id)}`)}
        sx={{ display: 'flex', alignItems: 'center', flex: 1, py: 1, px: 2, cursor: 'pointer' }}
      >
        <ListItemAvatar>
          <Avatar src={user.avatar_url ?? undefined}>
            {user.display_name?.[0]?.toUpperCase() ?? '?'}
          </Avatar>
        </ListItemAvatar>
        <ListItemText
          primary={user.display_name}
          secondary={user.username ? `@${user.username}` : undefined}
        />
      </Box>
    </ListItem>
  );
}
