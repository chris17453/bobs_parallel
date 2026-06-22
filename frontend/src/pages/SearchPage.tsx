import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Avatar,
  Box,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { api } from '../api/client';
import UserRow from '../components/UserRow';

/** Debounced search of /api/search; shows items + users with follow buttons. */
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const initial = params.get('q') ?? '';
  const [input, setInput] = useState(initial);
  const [debounced, setDebounced] = useState(initial);

  // Debounce input → query.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(input.trim());
      setParams(input.trim() ? { q: input.trim() } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(t);
  }, [input, setParams]);

  const { data, isFetching } = useQuery({
    queryKey: ['search', debounced],
    queryFn: ({ signal }) => api.search(debounced, signal),
    enabled: debounced.length > 0,
  });

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: 2 }}>
      <TextField
        autoFocus
        fullWidth
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search tracks, albums, artists, people"
        inputProps={{ 'aria-label': 'Search query' }}
        sx={{ mb: 2 }}
      />

      {isFetching && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {debounced.length === 0 ? (
        <Typography color="text.secondary">Start typing to search.</Typography>
      ) : (
        <>
          {data && data.users.length > 0 && (
            <>
              <Typography variant="overline" color="text.secondary">
                People
              </Typography>
              <List disablePadding>
                {data.users.map((u) => (
                  <UserRow key={u.id} user={u} />
                ))}
              </List>
              <Divider sx={{ my: 2 }} />
            </>
          )}

          {data && data.items.length > 0 && (
            <>
              <Typography variant="overline" color="text.secondary">
                Tracks & more
              </Typography>
              <List disablePadding>
                {data.items.map((it) => (
                  <ListItem key={it.id} disablePadding sx={{ py: 0.5 }}>
                    <ListItemAvatar>
                      <Avatar variant="rounded" src={it.image_url ?? undefined}>
                        {it.title[0]?.toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={it.title}
                      secondary={`${it.kind}${it.subtitle ? ` · ${it.subtitle}` : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {data && data.users.length === 0 && data.items.length === 0 && !isFetching && (
            <Typography color="text.secondary">No results for “{debounced}”.</Typography>
          )}
        </>
      )}
    </Box>
  );
}
