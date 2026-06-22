import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { api, ApiError } from '../api/client';

/** Consumes ?token= and sets a new password via POST /auth/reset. */
export default function ResetPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.reset(token, password);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'invalid_token' || err.code === 'token_expired')) {
        setError('This reset link is invalid or has expired. Request a new one.');
      } else {
        setError('Could not reset your password. Try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Box sx={{ width: '100%' }}>
        <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
          Reset password
        </Typography>

        {!token ? (
          <Alert severity="error">Missing reset token. Open the link from your QR code.</Alert>
        ) : done ? (
          <Stack spacing={2}>
            <Alert severity="success">Password updated. You can log in now.</Alert>
            <Button variant="contained" onClick={() => navigate('/login')}>
              Go to login
            </Button>
          </Stack>
        ) : (
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2}>
              {error && <Alert severity="error">{error}</Alert>}
              <TextField
                label="New password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                inputProps={{ 'aria-label': 'New password' }}
              />
              <TextField
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                inputProps={{ 'aria-label': 'Confirm password' }}
              />
              <Button type="submit" variant="contained" size="large" disabled={busy}>
                Set new password
              </Button>
            </Stack>
          </Box>
        )}
      </Box>
    </Container>
  );
}
