import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, CircularProgress, List, Stack, Typography } from '@mui/material';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import { api } from '../api/client';
import UserRow from '../components/UserRow';

/** /api/users directory with follow/unfollow + link to the Following feed. */
export default function FriendsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: ({ signal }) => api.users(signal),
  });

  return (
    <Box sx={{ height: '100%', overflowY: 'auto' }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ p: 2 }}
      >
        <Typography variant="h6" fontWeight={700}>
          Friends
        </Typography>
        <Button
          size="small"
          startIcon={<DynamicFeedIcon />}
          onClick={() => navigate('/feed/following')}
        >
          Following feed
        </Button>
      </Stack>

      {isError ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">Could not load the directory.</Alert>
        </Box>
      ) : isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <List disablePadding>
          {data?.users.map((u) => (
            <UserRow key={u.id} user={u} />
          ))}
        </List>
      )}
    </Box>
  );
}
