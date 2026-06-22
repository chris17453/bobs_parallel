import { useState } from 'react';
import { Alert, Box, CircularProgress, ToggleButton, ToggleButtonGroup } from '@mui/material';
import FeedList from '../components/FeedList';
import { useFeed, type FeedType } from '../hooks/useFeed';
import { useAuth } from '../auth/AuthContext';

interface Props {
  initialType?: FeedType;
}

/** Main feed with a For You / Following toggle (Following hits /api/feed/following). */
export default function FeedPage({ initialType = 'main' }: Props) {
  const [type, setType] = useState<FeedType>(initialType);
  const { isAuthenticated } = useAuth();

  const feed = useFeed(type);

  return (
    <Box sx={{ position: 'absolute', inset: 0 }}>
      {/* Feed-type toggle floats over the feed */}
      <Box
        sx={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
        }}
      >
        <ToggleButtonGroup
          size="small"
          exclusive
          value={type}
          onChange={(_e, val: FeedType | null) => val && setType(val)}
          sx={{
            bgcolor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(8px)',
            borderRadius: 999,
            '& .MuiToggleButton-root': { color: '#fff', border: 'none', borderRadius: 999, px: 2 },
          }}
        >
          <ToggleButton value="main">For You</ToggleButton>
          <ToggleButton value="following" disabled={!isAuthenticated}>
            Following
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {feed.isError ? (
        <Box sx={{ p: 2 }}>
          <Alert severity="error">Could not load the feed. Pull to retry.</Alert>
        </Box>
      ) : feed.isLoading ? (
        <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress />
        </Box>
      ) : (
        <FeedList
          items={feed.items}
          hasNextPage={!!feed.hasNextPage}
          isFetchingNextPage={feed.isFetchingNextPage}
          fetchNextPage={feed.fetchNextPage}
          emptyMessage={
            type === 'following'
              ? 'Follow some people to fill your Following feed.'
              : 'No content yet.'
          }
        />
      )}
    </Box>
  );
}
