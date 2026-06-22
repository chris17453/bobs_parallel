import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  ImageList,
  ImageListItem,
  ImageListItemBar,
  Stack,
  Typography,
} from '@mui/material';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useFollow } from '../hooks/useFollow';
import type { Profile } from '../api/types';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Stack alignItems="center" sx={{ minWidth: 64 }}>
      <Typography variant="h6" fontWeight={700}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Stack>
  );
}

/** Profile: likes grid + counts. Own profile shows logout; others show follow. */
export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user: me, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const follow = useFollow();

  const targetId = id ?? me?.id;
  const isOwn = !!targetId && targetId === me?.id;

  const { data, isLoading, isError } = useQuery<Profile>({
    queryKey: ['user', targetId],
    queryFn: ({ signal }) => api.user(targetId as string, signal),
    enabled: !!targetId,
  });

  if (!targetId) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary" gutterBottom>
          Sign in to see your profile.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/login')}>
          Sign in
        </Button>
      </Box>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: 2 }}>
      {isError ? (
        <Alert severity="error">Could not load this profile.</Alert>
      ) : isLoading || !data ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Stack alignItems="center" spacing={1.5}>
            <Avatar src={data.avatar_url ?? undefined} sx={{ width: 88, height: 88 }}>
              {data.display_name[0]?.toUpperCase()}
            </Avatar>
            <Typography variant="h5" fontWeight={700}>
              {data.display_name}
            </Typography>
            {data.username && (
              <Typography variant="body2" color="text.secondary">
                @{data.username}
              </Typography>
            )}

            <Stack direction="row" spacing={3} sx={{ py: 1 }}>
              <Stat label="Likes" value={data.like_count} />
              <Stat label="Followers" value={data.follower_count} />
              <Stat label="Following" value={data.following_count} />
            </Stack>

            {isOwn ? (
              <Button variant="outlined" onClick={handleLogout}>
                Log out
              </Button>
            ) : (
              isAuthenticated && (
                <Button
                  variant={data.is_following ? 'outlined' : 'contained'}
                  onClick={() =>
                    follow.mutate({ userId: data.id, follow: !data.is_following })
                  }
                  disabled={follow.isPending}
                >
                  {data.is_following ? 'Following' : 'Follow'}
                </Button>
              )
            )}
          </Stack>

          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
            Likes
          </Typography>

          {data.likes.length === 0 ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              No likes yet.
            </Typography>
          ) : (
            <ImageList cols={3} gap={6} sx={{ mt: 1 }}>
              {data.likes.map((it) => (
                <ImageListItem key={it.id}>
                  <Box
                    component="img"
                    src={it.image_url ?? undefined}
                    alt={it.title}
                    loading="lazy"
                    sx={{ aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 1, bgcolor: 'action.hover' }}
                  />
                  <ImageListItemBar title={it.title} subtitle={it.subtitle ?? undefined} />
                </ImageListItem>
              ))}
            </ImageList>
          )}
        </>
      )}
    </Box>
  );
}
