import { useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { ApiError } from '../api/client';
import { useUpdateProfile } from '../hooks/useUpdateProfile';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

const NAME_MIN = 1;
const NAME_MAX = 50;

/** Build a few deterministic preset avatars seeded off the user id. */
function presetAvatars(userId: string): string[] {
  const seeds = [userId, 'wave', 'neon', 'pulse', 'vinyl', 'echo'];
  return seeds.map((s) => `https://picsum.photos/seed/${encodeURIComponent(s)}/200/200`);
}

/** Human-readable message for a server error code from PATCH /api/me. */
function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'invalid_avatar_url':
        return 'That avatar URL is not valid. Use an http(s) image link.';
      case 'invalid_display_name':
        return 'Please enter a name between 1 and 50 characters.';
      default:
        return 'Could not save your profile. Please try again.';
    }
  }
  return 'Could not save your profile. Please try again.';
}

/**
 * Dialog for editing the current user's own profile: display name + avatar
 * (preset picker or custom URL). Saves via PATCH /api/me and closes on success.
 */
export default function EditProfileDialog({
  open,
  onClose,
  userId,
  displayName,
  avatarUrl,
}: Props) {
  const update = useUpdateProfile();
  const [name, setName] = useState(displayName);
  const [avatar, setAvatar] = useState<string>(avatarUrl ?? '');
  const [touched, setTouched] = useState(false);

  const trimmed = name.trim();
  const nameError =
    trimmed.length < NAME_MIN
      ? 'Name is required.'
      : trimmed.length > NAME_MAX
        ? `Name must be ${NAME_MAX} characters or fewer.`
        : null;

  const presets = presetAvatars(userId);

  const handleClose = () => {
    if (update.isPending) return;
    onClose();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (nameError || update.isPending) return;

    update.mutate(
      { display_name: trimmed, avatar_url: avatar.trim() },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <Box component="form" onSubmit={submit}>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {update.isError && <Alert severity="error">{errorMessage(update.error)}</Alert>}

            <Stack alignItems="center" spacing={1}>
              <Avatar src={avatar || undefined} sx={{ width: 72, height: 72 }}>
                {trimmed[0]?.toUpperCase()}
              </Avatar>
            </Stack>

            <TextField
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setTouched(true)}
              error={touched && !!nameError}
              helperText={touched ? nameError ?? ' ' : ' '}
              inputProps={{ 'aria-label': 'Display name', maxLength: NAME_MAX }}
              fullWidth
              autoFocus
              disabled={update.isPending}
            />

            <Box>
              <Typography variant="overline" color="text.secondary">
                Choose an avatar
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 1 }}>
                {presets.map((url) => {
                  const selected = avatar === url;
                  return (
                    <Box
                      key={url}
                      component="button"
                      type="button"
                      aria-label={`Select avatar ${url}`}
                      aria-pressed={selected}
                      onClick={() => setAvatar(url)}
                      disabled={update.isPending}
                      sx={{
                        p: 0,
                        border: 2,
                        borderColor: selected ? 'primary.main' : 'transparent',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        bgcolor: 'transparent',
                        lineHeight: 0,
                      }}
                    >
                      <Avatar src={url} sx={{ width: 44, height: 44 }} />
                    </Box>
                  );
                })}
              </Stack>
            </Box>

            <TextField
              label="Custom avatar URL"
              placeholder="https://…"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              inputProps={{ 'aria-label': 'Custom avatar URL' }}
              helperText="Leave empty to remove your avatar."
              fullWidth
              disabled={update.isPending}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={update.isPending || (touched && !!nameError)}
            startIcon={update.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Save
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
