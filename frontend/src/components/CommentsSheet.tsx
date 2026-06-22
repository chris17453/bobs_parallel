import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { Comment } from '../api/types';
import { useAddComment, useComments, useDeleteComment } from '../hooks/useComments';
import { useAuth } from '../auth/AuthContext';

interface Props {
  itemId: number;
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

function CommentRow({
  comment,
  canDelete,
  onDelete,
  deleting,
}: {
  comment: Comment;
  canDelete: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <ListItem
      alignItems="flex-start"
      secondaryAction={
        canDelete ? (
          <IconButton
            edge="end"
            aria-label="Delete comment"
            onClick={onDelete}
            disabled={deleting}
            sx={{ color: 'text.secondary' }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        ) : null
      }
    >
      <ListItemAvatar>
        <Avatar src={comment.author.avatar_url ?? undefined} sx={{ width: 36, height: 36 }}>
          {comment.author.display_name?.[0]?.toUpperCase() ?? '?'}
        </Avatar>
      </ListItemAvatar>
      <Box sx={{ minWidth: 0, pr: 4 }}>
        <Stack direction="row" spacing={1} alignItems="baseline">
          <Typography variant="subtitle2" fontWeight={700} noWrap>
            {comment.author.display_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {relativeTime(comment.created_at)}
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          {comment.body}
        </Typography>
      </Box>
    </ListItem>
  );
}

/**
 * Bottom drawer listing an item's comments with a composer. Posting requires
 * auth (otherwise redirects to /login). Own comments expose a delete button.
 */
export default function CommentsSheet({ itemId, open, onClose }: Props) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading } = useComments(itemId, open);
  const addComment = useAddComment(itemId);
  const deleteComment = useDeleteComment(itemId);
  const [draft, setDraft] = useState('');

  const comments = data?.comments ?? [];
  const count = data?.comment_count ?? comments.length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const body = draft.trim();
    if (!body || addComment.isPending) return;
    addComment.mutate(body, { onSuccess: () => setDraft('') });
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
          Comments{count ? ` (${count})` : ''}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : comments.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 4 }}
          >
            No comments yet. Be the first.
          </Typography>
        ) : (
          <List disablePadding>
            {comments.map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                canDelete={!!user && user.id === c.author.id}
                onDelete={() => deleteComment.mutate(c.id)}
                deleting={deleteComment.isPending}
              />
            ))}
          </List>
        )}
      </Box>

      <Box
        component="form"
        onSubmit={submit}
        sx={{
          p: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end',
        }}
      >
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={4}
          placeholder={isAuthenticated ? 'Add a comment…' : 'Log in to comment'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={!isAuthenticated || addComment.isPending}
          inputProps={{ 'aria-label': 'Add a comment' }}
        />
        <IconButton
          type="submit"
          color="primary"
          aria-label="Post comment"
          disabled={!isAuthenticated || !draft.trim() || addComment.isPending}
          sx={{ p: 1.5 }}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Drawer>
  );
}
